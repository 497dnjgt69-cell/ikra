import {DatabaseSync} from 'node:sqlite';
import {hash,wall,epochAt,quiet,reminder} from './policy.js';
import {createPrayerAPI} from '../js/platform/prayer-api.js';
export function createNotificationService({filename,send,fetcher=fetch,now=Date.now}){
  const db=new DatabaseSync(filename);db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS subscriptions(id TEXT PRIMARY KEY,token TEXT NOT NULL,endpoint TEXT UNIQUE NOT NULL,subscription TEXT NOT NULL,prefs TEXT NOT NULL,updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,subscriber TEXT REFERENCES subscriptions(id) ON DELETE CASCADE,due INTEGER NOT NULL,expires INTEGER NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',attempts INTEGER NOT NULL DEFAULT 0,nextAt INTEGER NOT NULL DEFAULT 0);
    CREATE INDEX IF NOT EXISTS pending_jobs ON jobs(status,nextAt,due);
    CREATE TABLE IF NOT EXISTS prayer_cache(id TEXT PRIMARY KEY,data TEXT NOT NULL,expires INTEGER NOT NULL);`);
  const api=createPrayerAPI({fetcher});let ticking=false,lastSweep=0;
  function enqueue(id,key,payload,due=now(),ttl=120000){db.prepare('INSERT OR IGNORE INTO jobs(id,subscriber,due,expires,payload) VALUES(?,?,?,?,?)').run(id+':'+key,id,due,due+ttl,JSON.stringify({...payload,tag:key}));}
  function get(id){return db.prepare('SELECT * FROM subscriptions WHERE id=?').get(id);}
  function save(id,token,subscription,prefs){
    const stamp=now(),previous=get(id);
    db.exec('BEGIN');
    try{
      db.prepare(`INSERT INTO subscriptions VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET endpoint=excluded.endpoint,subscription=excluded.subscription,prefs=excluded.prefs,updated=excluded.updated`).run(id,hash(token),subscription.endpoint,JSON.stringify(subscription),JSON.stringify(prefs),stamp);
      if(previous){const old=JSON.parse(previous.prefs);if(JSON.stringify([old.source,old.method,old.prayerTimezone,old.language])!==JSON.stringify([prefs.source,prefs.method,prefs.prayerTimezone,prefs.language]))db.prepare("DELETE FROM jobs WHERE subscriber=? AND status='pending' AND json_extract(payload,'$.category')='prayer'").run(id);}
      // Cancel paused/reset timers immediately. Keep a due completion while the main app settles it.
      db.prepare("DELETE FROM jobs WHERE subscriber=? AND status='pending' AND json_extract(payload,'$.category')='sessionComplete' AND due>?").run(id,stamp);
      for(const category of ['prayer','focusReminder','sessionComplete','announcements'])if(!prefs[category])db.prepare("DELETE FROM jobs WHERE subscriber=? AND status='pending' AND json_extract(payload,'$.category')=?").run(id,category);
      if(prefs.sessionComplete&&prefs.timer){const en=prefs.language==='en',focus=prefs.timer.mode==='focus';enqueue(id,'timer:'+prefs.timer.endAt,{title:en?(focus?'Focus complete':'Break complete'):(focus?'Odak tamamlandı':'Mola tamamlandı'),body:en?'Ready for the next step?':'Bir sonraki adıma hazır mısın?',category:'sessionComplete',target:'focus'},prefs.timer.endAt);}
      db.exec('COMMIT');
    }catch(e){db.exec('ROLLBACK');throw e;}
  }
  async function prayerEvents(row,p,stamp){
    if(!p.prayer||!p.source)return;
    let date=wall(new Date(stamp),p.prayerTimezone).date,data;
    for(let attempt=0;attempt<2;attempt++){
      const key=hash(JSON.stringify([p.source,p.method,date]));
      const cache=db.prepare('SELECT data FROM prayer_cache WHERE id=?').get(key);
      if(cache)data=JSON.parse(cache.data);
      else{
        data=await api.load({date,source:p.source,method:p.method,signal:AbortSignal.timeout(8000)});
        db.prepare('INSERT OR REPLACE INTO prayer_cache VALUES(?,?,?)').run(key,JSON.stringify(data),stamp+172800000);
      }
      const actual=wall(new Date(stamp),data.timezone||p.prayerTimezone).date;
      if(actual===date)break;date=actual;data=null;
    }
    if(!data)return;
    // Recheck after fetch: an in-flight location request must not restore cancelled jobs.
    const current=get(row.id);if(!current||current.prefs!==row.prefs)return;
    for(const [name,time] of Object.entries(data.times)){
      if(name==='Güneş')continue;
      const due=epochAt(date,time,data.timezone||p.prayerTimezone);if(due<stamp-120000)continue;
      const en=p.language==='en',names={Sabah:'Fajr','Öğle':'Dhuhr','İkindi':'Asr','Akşam':'Maghrib','Yatsı':'Isha'};
      enqueue(row.id,'prayer:'+date+':'+name,{title:en?`${names[name]} time`:`${name} vakti`,body:en?'Prayer time has started.':'Namaz vakti girdi.',category:'prayer',target:'prayer'},due,120000);
    }
  }

  async function tick(){
    if(ticking)return;ticking=true;
    try{
      const stamp=now();
      if(stamp-lastSweep>86400000){db.prepare('DELETE FROM jobs WHERE expires<?').run(stamp-604800000);db.prepare('DELETE FROM prayer_cache WHERE expires<?').run(stamp);lastSweep=stamp;}
      const rows=db.prepare('SELECT * FROM subscriptions').all();
      for(const row of rows){const p=JSON.parse(row.prefs),r=reminder(p,new Date(stamp));if(r)enqueue(row.id,r.key,r,stamp,120000);}
      // Send timer/reminder jobs before network calls to the prayer-time provider.
      await deliver();
      for(let i=0;i<rows.length;i+=8)await Promise.all(rows.slice(i,i+8).map(async row=>{try{await prayerEvents(row,JSON.parse(row.prefs),now());}catch{/* Retry on the next scheduler pass. */}}));
      await deliver();
    }finally{ticking=false;}
  }
  async function deliver(){
    const stamp=now();
    const jobs=db.prepare("SELECT jobs.*,s.subscription,s.prefs FROM jobs JOIN subscriptions s ON s.id=jobs.subscriber WHERE status='pending' AND due<=? AND nextAt<=? AND expires>? LIMIT 200").all(stamp,stamp,stamp);
    for(const job of jobs){
      // Preferences may have changed while an earlier send awaited the network.
      const current=get(job.subscriber);if(!current)continue;
      const p=JSON.parse(current.prefs),payload=JSON.parse(job.payload);
      if(payload.category!=='test'&&!p[payload.category]){db.prepare("UPDATE jobs SET status='cancelled' WHERE id=?").run(job.id);continue;}
      if(['focusReminder','announcements'].includes(payload.category)&&quiet(p,new Date(now())))continue;
      if(job.expires<=now())continue;
      try{
        await send(JSON.parse(current.subscription),payload,Math.max(1,Math.ceil((job.expires-now())/1000)));
        db.prepare("UPDATE jobs SET status='sent' WHERE id=?").run(job.id);
      }catch(e){
        if([404,410].includes(e.statusCode))db.prepare('DELETE FROM subscriptions WHERE id=?').run(job.subscriber);
        else db.prepare("UPDATE jobs SET attempts=attempts+1,nextAt=?,status=? WHERE id=?").run(now()+Math.min(300000,15000*2**job.attempts),job.attempts>=4?'failed':'pending',job.id);
      }
    }
  }
  return {db,get,save,enqueue,tick,remove(id){db.prepare('DELETE FROM subscriptions WHERE id=?').run(id);},close(){db.close();}};
}
