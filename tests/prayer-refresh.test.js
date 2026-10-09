import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrayerTimes} from '../js/services/prayer-times.js';
const table={Sabah:'05:30','Güneş':'07:00','Öğle':'12:30','İkindi':'15:30','Akşam':'18:30','Yatsı':'20:00'};
function setup(initial,load){
 let now=Date.parse('2026-10-09T02:00:00Z');
 const store={state:{prayerTimes:{},method:'2',...initial},update(fn){fn(this.state);}};
 const calls=[];
 const times=createPrayerTimes({store,access:{require(){}},now:()=>now,api:{async load(args){calls.push(args);return load?load(args):{times:{...table},timezone:store.state.prayerTimeZone||'America/Toronto'};}}});
 return {store,times,calls,advance(ms){now+=ms;}};
}
test('refresh requests the location day rather than device day and does not refetch current data',async()=>{
 const f=setup({prayerSource:{type:'address',address:'Toronto'},prayerTimeZone:'America/Toronto'});
 await f.times.refresh();
 assert.equal(f.calls[0].date,'2026-10-08');assert.equal(f.store.state.prayerDate,'2026-10-08');
 assert.ok(f.times.status().startsWith('Güncel'));
 await f.times.refresh();assert.equal(f.calls.filter(c=>c.date==='2026-10-08').length,1);
 f.times.invalidate();
});
test('new location corrects the requested date after discovering its timezone',async()=>{
 const f=setup({prayerTimeZone:'America/Toronto'},async()=>({times:{...table},timezone:'Asia/Tokyo'}));
 await f.times.fetchForSource({type:'address',address:'Tokyo'});
 assert.deepEqual(f.calls.slice(0,2).map(c=>c.date),['2026-10-08','2026-10-09']);
 assert.equal(f.store.state.prayerDate,'2026-10-09');f.times.invalidate();
});
test('midnight promotes prefetched times even offline and does not overwrite manual data',async()=>{
 const f=setup({prayerTimeZone:'America/Toronto',prayerSource:{type:'address',address:'Toronto'},prayerMethod:'2',prayerDate:'2026-10-07',prayerTomorrow:{date:'2026-10-08',times:table}},async()=>{throw Error('offline');});
 await f.times.refresh();assert.equal(f.store.state.prayerDate,'2026-10-08');assert.deepEqual(f.store.state.prayerTimes,table);
 f.times.setManual('Sabah','06:00','Toronto');f.advance(86400000);const count=f.calls.length;
 await f.times.refresh(true);assert.equal(f.calls.length,count);assert.equal(f.store.state.prayerTimes.Sabah,'06:00');f.times.invalidate();
});
test('failed initial selection retries after backoff and deduplicates tomorrow requests',async()=>{
 let fail=true;
 const f=setup({},async()=>{if(fail)throw Error('offline');return {times:table,timezone:'America/Toronto'};});
 await f.times.fetchForSource({type:'address',address:'Toronto'});
 await f.times.refresh();assert.equal(f.calls.length,1);
 fail=false;f.advance(300001);await f.times.refresh();assert.equal(f.store.state.prayerSource.address,'Toronto');
 await Promise.all([f.times.fetchTomorrow(),f.times.fetchTomorrow()]);
 assert.equal(f.calls.filter(c=>c.date==='2026-10-09').length,1);f.times.invalidate();
});
