import {createHash, timingSafeEqual} from 'node:crypto';
export const hash = value => createHash('sha256').update(value).digest('hex');
export function sameSecret(a,b){return typeof a==='string'&&typeof b==='string'&&timingSafeEqual(Buffer.from(hash(a)),Buffer.from(hash(b)));}
export function wall(now,zone){
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(x=>[x.type,x.value]));
  return {date:`${p.year}-${p.month}-${p.day}`,minute:+p.hour*60 + +p.minute};
}
export const minutes = time => +time.slice(0,2)*60 + +time.slice(3,5);
export function quiet(p,now){const m=wall(now,p.timezone).minute,a=minutes(p.quietStart),b=minutes(p.quietEnd);return a===b?false:a<b?m>=a&&m<b:m>=a||m<b;}
const time=v=>typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
function zone(v){if(typeof v!=='string'||v.length>80)throw Error('timezone');new Intl.DateTimeFormat('en',{timeZone:v});return v;}
export function validatePreferences(p,now=Date.now()){
  if(!p||typeof p!=='object')throw Error('preferences');
  const out={};for(const key of ['prayer','focusReminder','sessionComplete','announcements']){if(typeof p[key]!=='boolean')throw Error(key);out[key]=p[key];}
  out.timezone=zone(p.timezone);out.prayerTimezone=zone(p.prayerTimezone||p.timezone);
  for(const key of ['reminderTime','quietStart','quietEnd']){if(!time(p[key]))throw Error(key);out[key]=p[key];}
  out.language=p.language==='en'?'en':'tr';out.frequency=p.frequency===1?1:3;
  out.method=[2,3,13].includes(Number(p.method))?Number(p.method):13;
  const s=p.source;
  if(s?.type==='address'&&typeof s.address==='string'&&s.address.trim().length>0&&s.address.length<=200)out.source={type:'address',address:s.address.trim()};
  else if(s?.type==='coords'&&Number.isFinite(s.lat)&&Number.isFinite(s.lon)&&Math.abs(s.lat)<=90&&Math.abs(s.lon)<=180)out.source={type:'coords',lat:s.lat,lon:s.lon};
  else out.source=null;
  if(out.prayer&&!out.source)throw Error('prayer_location_required');
  out.timer=null;
  if(p.timer!=null){if(!Number.isFinite(p.timer.endAt)||p.timer.endAt<now-120000||p.timer.endAt>now+86400000)throw Error('timer');out.timer={endAt:Math.round(p.timer.endAt),mode:p.timer.mode==='focus'?'focus':'break'};}
  return out;
}
export function validateSubscription(s){
  if(!s||typeof s.endpoint!=='string'||s.endpoint.length>4096)throw Error('subscription');
  const u=new URL(s.endpoint),host=u.hostname;
  const allowed=host==='fcm.googleapis.com'||host==='updates.push.services.mozilla.com'||host.endsWith('.push.services.mozilla.com')||host.endsWith('.push.apple.com')||host.endsWith('.notify.windows.com');
  if(u.protocol!=='https:'||u.port||u.username||u.password||!allowed)throw Error('push_endpoint');
  for(const [key,size] of [['p256dh',65],['auth',16]]){const v=s.keys?.[key];if(typeof v!=='string'||v.length>150||!/^[\w-]+={0,2}$/.test(v)||Buffer.from(v,'base64url').length!==size)throw Error('push_key');}
  return {endpoint:s.endpoint,keys:{p256dh:s.keys.p256dh,auth:s.keys.auth}};
}
export function reminder(p,now){
  const w=wall(now,p.timezone),day=Math.floor(Date.parse(w.date+'T12:00:00Z')/86400000);
  if(!p.focusReminder||day%p.frequency!==0||w.minute!==minutes(p.reminderTime)||quiet(p,now)||(p.timer?.endAt>now.getTime()))return null;
  const tr=['Bugün kendine bir odak anı ayır. Küçük bir adımla başla.','Dikkatini tek bir işe ver. 25 dakikalık bir odak sana iyi gelebilir.','Bugün odaklan. Kaldığın yerden devam etmek için güzel bir an.'];
  const en=['Make a little room for focus today. Start with one small step.','One task at a time. How about 25 minutes of focus?','A fresh moment to focus. Pick up where you left off.'];
  return {key:'focus:'+w.date,title:p.language==='en'?'A moment to focus':'Biraz odak zamanı',body:(p.language==='en'?en:tr)[Math.floor(day/p.frequency)%3],category:'focusReminder',target:'focus'};
}

export function epochAt(date,time,zone){
  const [y,m,d]=date.split('-').map(Number),desired=Date.UTC(y,m-1,d,0,minutes(time));let epoch=desired;
  for(let i=0;i<3;i++){const w=wall(new Date(epoch),zone);epoch+=desired-(Date.parse(w.date+'T00:00:00Z')+w.minute*60000);}
  return epoch;
}
