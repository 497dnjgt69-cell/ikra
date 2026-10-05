import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDock,DOCK_IDS} from '../js/core/dock.js';
import {getFajrEnd} from '../js/domain/prayer-times.js';
import {createPrayerAPI} from '../js/platform/prayer-api.js';
test('dock preferences deduplicate unknown items and keep every tool recoverable',()=>{
 const d=normalizeDock({order:['anki','unknown','anki'],hidden:['history','unknown','history']});
 assert.equal(d.order[0],'anki');assert.equal(d.order.length,DOCK_IDS.length);assert.deepEqual(d.hidden,['history']);
 assert.deepEqual(normalizeDock(null).order,DOCK_IDS);
});
test('Fajr end uses location timezone, rounds partial minutes, rejects stale or invalid times',()=>{
 const d={prayerDate:'2026-10-04',prayerTimeZone:'America/Toronto',prayerTimes:{Sabah:'05:30','Güneş':'07:00'}};
 assert.equal(getFajrEnd(d,Date.parse('2026-10-04T10:45:20Z')).minutes,15);
 assert.equal(getFajrEnd(d,Date.parse('2026-10-04T09:00:00Z')).active,false);
 assert.equal(getFajrEnd(d,Date.parse('2026-10-04T09:30:00Z')).active,true);
 assert.equal(getFajrEnd(d,Date.parse('2026-10-04T11:00:00Z')).ended,true);
 assert.equal(getFajrEnd(d,Date.parse('2026-10-05T10:00:00Z')),null);
 assert.equal(getFajrEnd({...d,prayerTimes:{Sabah:'05:30'}},Date.parse('2026-10-04T10:00:00Z')),null);
});
test('prayer API preserves Sunrise alongside the five prayers',async()=>{
 const api=createPrayerAPI({fetcher:async()=>({ok:true,json:async()=>({data:{timings:{Fajr:'05:30',Sunrise:'07:00 (EDT)',Dhuhr:'12:00',Asr:'15:00',Maghrib:'18:00',Isha:'20:00'},meta:{timezone:'America/Toronto'}}})})});
 const result=await api.load({date:'2026-10-04',source:{type:'address',address:'Toronto'},method:'2'});
 assert.equal(result.times['Güneş'],'07:00');assert.equal(Object.keys(result.times).length,6);
});

import {JSDOM} from 'jsdom';
import fs from 'node:fs';
test('startup applies saved themes before showing content and tolerates corrupt storage',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const value of ['{"theme":"dark"}','{"theme":"nature"}','{invalid']){
  const dom=new JSDOM(html,{url:'https://ikra.test',runScripts:'outside-only'});
  dom.window.localStorage.setItem('mahir-focus-v1',value);
  for(const script of dom.window.document.querySelectorAll('script:not([src])'))dom.window.eval(script.textContent);
  assert.equal(dom.window.document.body.dataset.theme,value.includes('dark')?'dark':value.includes('nature')?'nature':'light');
  assert.ok(dom.window.document.documentElement.classList.contains('ikra-booting'));
  dom.window.clearTimeout(dom.window.ikraBootGuard);dom.window.close();
 }
});
