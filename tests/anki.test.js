import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnkiConnect} from '../js/platform/anki-connect.js';
import {normalizeAnki,summarizeAnki} from '../js/core/anki.js';
import {display} from '../js/shared/format.js';
import {focusDistribution} from '../js/core/activity-insights.js';

test('Anki batches reviews, excludes rescheduling, sends API keys and preserves duration units',async()=>{
  const calls=[]; const id=Date.parse('2026-10-01T12:00:00Z');
  const api=createAnkiConnect({fetcher:async(url,options)=>{
    const req=JSON.parse(options.body);calls.push(req);
    const result=req.action==='requestPermission'?{permission:'granted',requireApiKey:true}
      :req.action==='getActiveProfile'?'Mahir'
      :req.action==='findCards'?Array.from({length:251},(_,i)=>i+1)
      :Object.fromEntries(req.params.cards.map(card=>[card,card===1?[{id,time:60500,ease:3},{id:id+1,time:0,ease:0}]:[]]));
    return {ok:true,json:async()=>({result,error:null})};
  }});
  const snapshot=await api.sync({key:'test-key'});
  assert.equal(calls.filter(c=>c.action==='getReviewsOfCards').length,2);
  assert.ok(calls.slice(1).every(c=>c.key==='test-key'));
  assert.equal(snapshot.reviews.length,1);
  assert.equal(summarizeAnki(snapshot).seconds,60.5);
  assert.equal(summarizeAnki(snapshot,new Date(id+1)).count,0);
  assert.equal(display(60.5),'1 dk');
  assert.equal(display(3599),'59 dk');
  assert.equal(display(1),'<1 dk');
  assert.throws(()=>normalizeAnki({...snapshot,reviews:[{...snapshot.reviews[0],seconds:-1}]}));
});

test('Anki rejects denied permissions and failed responses',async()=>{
  const denied=createAnkiConnect({fetcher:async()=>({ok:true,json:async()=>({result:{permission:'denied'},error:null})})});
  await assert.rejects(()=>denied.sync(),/permission/);
  const broken=createAnkiConnect({fetcher:async()=>({ok:false})});
  await assert.rejects(()=>broken.sync(),/connection/);
});

test('manual sessions with a known end time enter hourly analysis; legacy entries remain excluded',()=>{
  const end=new Date(2026,9,1,11,30),start=new Date(2026,9,1);
  const record={at:end.toISOString(),seconds:3600,manual:true};
  const result=focusDistribution([record,{...record,timeKnown:true}],start,new Date(+end+1));
  assert.equal(result.total,3600);assert.equal(result.excluded,3600);
  assert.equal(result.hours[10],1800);assert.equal(result.hours[11],1800);
});
