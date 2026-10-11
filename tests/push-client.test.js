import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createPushClient,notificationDefaults,pushPreferences} from '../js/platform/push-client.js';
function fixture({permission='granted',fail=false}={}){
  let value=null,sub=null;const calls=[];
  const storage={getItem:()=>value,setItem:(_,v)=>value=v};
  const notifications={permission,requestPermission:()=>{calls.push('permission');return Promise.resolve(permission);}};
  const subscription={toJSON:()=>({endpoint:'https://fcm.googleapis.com/demo',keys:{}}),unsubscribe:async()=>{calls.push('unsubscribe');sub=null;return true;}};
  const nav={serviceWorker:{ready:Promise.resolve({pushManager:{getSubscription:async()=>sub,subscribe:async()=>{calls.push('subscribe');sub=subscription;return sub;}}})}};
  const fetcher=async(url,options)=>{calls.push({url,...options});if(fail)return {ok:false,status:503};return {ok:true,json:async()=>url.endsWith('/config')?{publicKey:Buffer.alloc(65,1).toString('base64url')}:{ok:true}};};
  const client=createPushClient({url:'https://push.test',storage,fetcher,nav,notifications,crypto:webcrypto});
  return {client,calls,storage};
}
test('push permission originates from click; device credentials persist; disabling unsubscribes before deleting',async()=>{
  const {client,calls,storage}=fixture();
  client.setPreferences({...notificationDefaults,announcements:true});
  const initial=JSON.parse(storage.getItem());assert.equal(initial.token.length,64);
  const promise=client.enable({});assert.equal(calls[0],'permission');await promise;
  assert.equal(client.active,true);assert.ok(calls.find(c=>c.method==='PUT').headers.Authorization.endsWith(initial.token));
  await client.sync({timer:null});await client.test();await client.disable();
  assert.equal(client.active,false);assert.equal(client.pendingRemoval,false);
  assert.ok(calls.indexOf('unsubscribe')<calls.findIndex(c=>c.method==='DELETE'));
  assert.equal(JSON.parse(storage.getItem()).token,initial.token);
});
test('denied permission sends no server data; failed registration never claims active',async()=>{
  const a=fixture({permission:'denied'});await assert.rejects(a.client.enable({}),/permission_denied/);assert.deepEqual(a.calls,['permission']);assert.equal(a.client.active,false);
  const b=fixture({fail:true});await assert.rejects(b.client.enable({}),/push_503/);assert.equal(b.client.active,false);
});
test('push sync contains only selected location and timer metadata, never study history',()=>{
  const state={prayerSource:{type:'coords',lat:41,lon:29},prayerTimeZone:'Europe/Istanbul',method:'13',timer:{running:true,endAt:Date.now()+60000},mode:'focus',subject:'Private subject',sessions:[{private:true}]};
  const p=pushPreferences(state,notificationDefaults,'tr','Europe/Istanbul');assert.equal(p.source,null);assert.equal(p.subject,undefined);assert.equal(p.sessions,undefined);assert.ok(p.timer.endAt);
  assert.equal(pushPreferences({...state,prayerSource:null},{...notificationDefaults,prayer:true}).prayer,false);
  assert.deepEqual(pushPreferences(state,{...notificationDefaults,prayer:true},'en','Europe/Istanbul').source,state.prayerSource);
});
