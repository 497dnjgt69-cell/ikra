export const PUSH_STORAGE_KEY='ikra-push-v1';
export const notificationDefaults=Object.freeze({prayer:false,focusReminder:true,sessionComplete:true,announcements:false,reminderTime:'11:00',frequency:3,quietStart:'22:00',quietEnd:'09:00'});
export function pushPreferences(state,preferences,language='tr',timezone=Intl.DateTimeFormat().resolvedOptions().timeZone){
  const prayer=!!preferences.prayer&&['address','coords'].includes(state.prayerSource?.type);
  return {...notificationDefaults,...preferences,prayer,language,timezone,prayerTimezone:state.prayerTimeZone||timezone,source:prayer?state.prayerSource:null,method:state.method,timer:state.timer.running&&state.timer.endAt>Date.now()?{endAt:state.timer.endAt,mode:state.mode}:null};
}
export function createPushClient({url,storage=localStorage,fetcher=fetch,nav=navigator,notifications=window.Notification,crypto=window.crypto}){
  let record;try{record=JSON.parse(storage.getItem(PUSH_STORAGE_KEY));}catch{}
  if(!record||!/^([a-f0-9]{32})$/.test(record.id)||!/^([a-f0-9]{64})$/.test(record.token))record=null;
  const persist=()=>storage.setItem(PUSH_STORAGE_KEY,JSON.stringify(record));
  const random=n=>Array.from(crypto.getRandomValues(new Uint8Array(n)),v=>v.toString(16).padStart(2,'0')).join('');
  const ensure=()=>{if(!record){record={id:random(16),token:random(32),active:false,preferences:{...notificationDefaults}};persist();}};
  async function request(path,method='GET',data){
    const response=await fetcher(url.replace(/\/$/,'')+path,{method,headers:{...(record?{Authorization:'Bearer '+record.token}:{}),...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{}),signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error('push_'+response.status);return response.json();
  }
  async function registration(){return Promise.race([nav.serviceWorker.ready,new Promise((_,reject)=>{const id=setTimeout(()=>reject(Error('worker_unavailable')),10000);nav.serviceWorker.ready.then(()=>clearTimeout(id),()=>clearTimeout(id));})]);}
  return {
    get active(){return !!record?.active;},get pendingRemoval(){return !!record?.pendingRemoval;},
    get preferences(){return {...notificationDefaults,...record?.preferences};},
    setPreferences(preferences){ensure();record.preferences={...notificationDefaults,...preferences};persist();},
    async enable(preferences){
      // The permission prompt must originate directly from a user gesture.
      const permission=await notifications.requestPermission();if(permission!=='granted')throw Error('permission_denied');
      ensure();const {publicKey}=await request('/config');
      const bytes=Uint8Array.from(atob(publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
      const reg=await registration();let sub=await reg.pushManager.getSubscription();
      if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
      await request('/subscriptions/'+record.id,'PUT',{subscription:sub.toJSON(),preferences});
      record.active=true;record.pendingRemoval=false;persist();
    },
    async sync(preferences){if(!record?.active)return;const reg=await registration(),sub=await reg.pushManager.getSubscription();if(!sub||notifications.permission!=='granted')throw Error('subscription_missing');await request('/subscriptions/'+record.id,'PUT',{subscription:sub.toJSON(),preferences});},
    async disable(){
      if(!record)return;record.active=false;record.pendingRemoval=true;persist();
      const reg=await registration(),sub=await reg.pushManager.getSubscription();
      if(sub&&!await sub.unsubscribe())throw Error('unsubscribe_failed');
      try{await request('/subscriptions/'+record.id,'DELETE');}catch(e){if(e.message!=='push_404')throw e;}record.pendingRemoval=false;persist();
    },
    async test(){if(!record?.active)throw Error('not_enabled');return request('/subscriptions/'+record.id+'/test','POST');},
    reload(){try{const next=JSON.parse(storage.getItem(PUSH_STORAGE_KEY));if(next?.id===record?.id)record=next;}catch{}},
  };
}
