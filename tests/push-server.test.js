import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {validatePreferences,validateSubscription,quiet,reminder,epochAt} from '../server/policy.js';
import {createNotificationService} from '../server/service.js';
import {createHandler} from '../server/http.js';
const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/test',keys:{p256dh:Buffer.alloc(65,1).toString('base64url'),auth:Buffer.alloc(16,2).toString('base64url')}};
const defaults={prayer:false,focusReminder:true,sessionComplete:true,announcements:true,timezone:'Europe/Istanbul',prayerTimezone:'Europe/Istanbul',method:'2',reminderTime:'11:00',frequency:1,quietStart:'22:00',quietEnd:'09:00',language:'tr',source:null,timer:null};
const id='a'.repeat(32),token='b'.repeat(64);
function service(t,options={}){const s=createNotificationService({filename:':memory:',send:async()=>{},...options});t.after(()=>s.close());return s;}
test('push validation rejects private endpoints, invalid keys and missing prayer location; preserves app calculation method',()=>{
  assert.equal(validatePreferences(defaults).method,2);
  for(const endpoint of ['http://fcm.googleapis.com/a','https://127.0.0.1/x','https://fcm.googleapis.com.evil.test/a','https://fcm.googleapis.com:444/a','https://user:pass@fcm.googleapis.com/a'])assert.throws(()=>validateSubscription({...subscription,endpoint}));
  assert.deepEqual(validateSubscription(subscription),subscription);
  assert.throws(()=>validateSubscription({...subscription,keys:{auth:'a',p256dh:'b'}}));
  assert.throws(()=>validatePreferences({...defaults,prayer:true}));
  assert.throws(()=>validatePreferences({...defaults,timezone:'not-a-zone'}));
});
test('quiet hours span midnight in the device timezone; reminders rotate and respect active timers',()=>{
  assert.equal(quiet(defaults,new Date('2026-10-11T20:00:00Z')),true);
  assert.equal(quiet(defaults,new Date('2026-10-11T08:00:00Z')),false);
  const r=reminder(defaults,new Date('2026-10-11T08:00:10Z'));assert.ok(r);
  assert.notEqual(r.body,reminder(defaults,new Date('2026-10-12T08:00:10Z')).body);
  assert.equal(reminder({...defaults,timer:{endAt:Date.parse('2026-10-11T09:00:00Z')}},new Date('2026-10-11T08:00:10Z')),null);
  assert.equal(reminder(defaults,new Date('2026-10-11T08:01:00Z')),null);
  assert.equal(epochAt('2026-10-11','13:05','Europe/Istanbul'),Date.parse('2026-10-11T10:05:00Z'));
  assert.equal(epochAt('2026-07-01','13:00','Europe/Berlin'),Date.parse('2026-07-01T11:00:00Z'));
  assert.equal(epochAt('2026-12-01','13:00','Europe/Berlin'),Date.parse('2026-12-01T12:00:00Z'));
});
test('server sends completion without a browser, cancels paused jobs, and never replays a completed timer',async t=>{
  let stamp=Date.parse('2026-10-11T10:00:00Z');const sent=[];
  const s=service(t,{now:()=>stamp,send:async(sub,payload)=>sent.push(payload)});
  s.save(id,token,subscription,{...defaults,timer:{endAt:stamp+60000,mode:'focus'}});
  await s.tick();assert.equal(sent.length,0);
  s.save(id,token,subscription,defaults);stamp+=60000;await s.tick();assert.equal(sent.length,0);
  const endAt=stamp+60000;s.save(id,token,subscription,{...defaults,timer:{endAt,mode:'focus'}});
  stamp=endAt;s.save(id,token,subscription,defaults); // Main app settles before server poll.
  await s.tick();await s.tick();assert.equal(sent.length,1);assert.equal(sent[0].category,'sessionComplete');
  s.save(id,token,subscription,{...defaults,timer:{endAt,mode:'focus'}});await s.tick();assert.equal(sent.length,1);
});
test('prayer times schedule ahead in location timezone; location changes cancel old jobs and sunrise is excluded',async t=>{
  let stamp=Date.parse('2026-10-11T08:00:00Z');const sent=[],requests=[];
  const s=service(t,{now:()=>stamp,send:async(_,p)=>sent.push(p),fetcher:async url=>{
    requests.push(String(url));const changed=String(url).includes('Izmir');return {ok:true,json:async()=>({data:{timings:{Fajr:'05:00',Sunrise:'06:30',Dhuhr:changed?'13:30':'13:00',Asr:'16:00',Maghrib:'18:00',Isha:'20:00'},meta:{timezone:'Europe/Istanbul'}}})};
  }});
  const p={...defaults,prayer:true,focusReminder:false,source:{type:'address',address:'Istanbul'}};
  s.save(id,token,subscription,p);await s.tick();assert.equal(sent.length,0);
  assert.equal(s.db.prepare("SELECT count(*) AS n FROM jobs").get().n,4);
  s.save(id,token,subscription,{...p,source:{type:'address',address:'Izmir'}});await s.tick();
  stamp=Date.parse('2026-10-11T10:00:00Z');await s.tick();assert.equal(sent.length,0);
  stamp=Date.parse('2026-10-11T10:30:00Z');await s.tick();await s.tick();assert.equal(sent.length,1);assert.match(sent[0].title,/Öğle/);assert.equal(requests.length,2);
});
test('announcement quiet hours defer sending; opt out cancels pending delivery; expired endpoints are removed',async t=>{
  let stamp=Date.parse('2026-10-11T20:00:00Z'),gone=false;const sent=[];
  const s=service(t,{now:()=>stamp,send:async(_,p)=>{if(gone)throw {statusCode:410};sent.push(p);}});
  s.save(id,token,subscription,defaults);s.enqueue(id,'a',{category:'announcements',title:'Hello'},stamp,86400000);await s.tick();assert.equal(sent.length,0);
  stamp=Date.parse('2026-10-12T07:00:00Z');await s.tick();assert.equal(sent.length,1);
  s.enqueue(id,'b',{category:'announcements'},stamp);s.save(id,token,subscription,{...defaults,announcements:false});await s.tick();assert.equal(sent.length,1);
  gone=true;s.enqueue(id,'test',{category:'test'});await s.tick();assert.equal(s.get(id),undefined);
});
test('pending jobs survive process restart and deliveries deduplicate after restart',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'ikra-push-')),filename=join(dir,'db.sqlite');t.after(()=>rmSync(dir,{recursive:true,force:true}));
  let stamp=Date.parse('2026-10-11T10:00:00Z');const sent=[];const options={filename,now:()=>stamp,send:async(_,p)=>sent.push(p)};
  let s=createNotificationService(options);s.save(id,token,subscription,{...defaults,timer:{endAt:stamp+30000,mode:'focus'}});s.close();
  stamp+=30000;s=createNotificationService(options);await s.tick();s.close();assert.equal(sent.length,1);
  s=createNotificationService(options);await s.tick();s.close();assert.equal(sent.length,1);
});
test('HTTP requires origin and per-device token; broadcasts require admin and respect opt-in',async t=>{
  const s=service(t),origin='https://ikra.test',adminToken='x'.repeat(40);
  const server=createServer(createHandler({service:s,origin,publicKey:'public',adminToken}));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url='http://127.0.0.1:'+server.address().port;
  const request=(path,method='GET',data,auth=token,site=origin)=>fetch(url+path,{method,headers:{Origin:site,Authorization:'Bearer '+auth,'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});
  assert.equal((await request('/config','GET',null,token,'https://evil.test')).status,403);
  assert.equal((await request('/subscriptions/'+id,'PUT',{subscription,preferences:defaults})).status,200);
  assert.equal((await request('/subscriptions/'+id,'DELETE',null,'c'.repeat(64))).status,401);
  assert.equal((await request('/broadcast','POST',{title:'News',body:'Hello'})).status,401);
  const response=await request('/broadcast','POST',{title:'News',body:'Hello'},adminToken);assert.equal(response.status,202);assert.equal((await response.json()).queued,1);
  assert.equal((await request('/subscriptions/'+id+'/test','POST')).status,202);
  assert.equal((await request('/subscriptions/'+id+'/test','POST')).status,429);
  assert.equal((await request('/subscriptions/'+id,'DELETE')).status,200);assert.equal(s.get(id),undefined);
});
