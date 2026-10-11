import test from 'node:test';
import assert from 'node:assert/strict';
import {prayerGarden} from '../js/core/prayer-garden.js';
import {createStore} from '../js/services/store.js';
import {createFocusTimer} from '../js/services/focus-timer.js';
import {createRecords} from '../js/services/records.js';
import {datekey} from '../js/shared/format.js';
const now=new Date(2026,9,11,15),today=datekey(now);
test('garden deduplicates legacy and check-in records, applies corrections and excludes future/invalid data',()=>{
 const prayers=[{name:'Sabah',seconds:300,at:new Date(2026,9,11,8).toISOString()},{name:'Sabah',seconds:400,at:new Date(2026,9,11,9).toISOString()},{name:'Öğle',seconds:200,at:new Date(2026,9,11,13).toISOString()},{name:'İkindi',seconds:100,at:new Date(2026,9,12,13).toISOString()}];
 const model=prayerGarden(prayers,{[today]:{Sabah:true,'Öğle':false},'2026-10-10':{'Yatsı':true},'2026-99-00':{Sabah:true},'2026-10-12':{Sabah:true}},now);
 assert.equal(model.total,2);assert.equal(model.activeDays,2);assert.equal(model.weekTotal,2);assert.equal(model.days.length,7);assert.equal(model.days[6].count,1);
 const later=prayerGarden(prayers,{[today]:{Sabah:true,'Öğle':false},'2026-10-10':{'Yatsı':true}},new Date(2026,10,1));assert.equal(later.total,3);assert.equal(later.weekTotal,0);
});
test('empty days never remove growth; five checked prayers count as a full day',()=>{
 const checks={'2026-10-01':{Sabah:true,'Öğle':true,'İkindi':true,'Akşam':true,'Yatsı':true}};
 assert.equal(prayerGarden([],checks,new Date(2026,9,1,22)).fullDays,1);
 assert.equal(prayerGarden([],checks,now).total,5);assert.equal(prayerGarden([],checks,now).weekTotal,0);
});
test('hub entry, record changes and return to Focus preserve a running timer and its deadline',()=>{
 let stamp=+now,value=null;const storage={getItem:()=>value,setItem:(_,v)=>value=v},store=createStore({storage,now:()=>stamp}),access={require(){}};
 const focus=createFocusTimer({store,access,now:()=>stamp}),records=createRecords({store,access,now:()=>stamp});
 store.update(d=>{d.subjects=['Math'];d.subject='Math';});focus.start();const endAt=store.state.timer.endAt;
 store.update(d=>d.prayerHub=true);stamp+=10000;records.setPrayerCheck(today,'Sabah',true);focus.changeMode('focus');
 assert.equal(store.state.prayerHub,false);assert.equal(store.state.timer.running,true);assert.equal(store.state.timer.endAt,endAt);assert.equal(store.state.prayerChecks[today].Sabah,true);
 store.update(d=>d.prayerHub=true);focus.changeMode('clock');assert.equal(store.state.timer.endAt,endAt);assert.equal(store.state.prayerHub,false);
 const restored=createStore({storage,now:()=>stamp});assert.equal(restored.state.prayerChecks[today].Sabah,true);assert.equal(restored.state.timer.endAt,endAt);assert.equal(restored.state.prayerHub,false);
});
