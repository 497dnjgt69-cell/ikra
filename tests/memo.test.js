import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createStore} from '../js/services/store.js';
import {createMemo} from '../js/ui/memo.js';
import {reviewed,normalizeMemos} from '../js/core/memo.js';
import {normalizeBackup} from '../js/core/backup-validation.js';
import {fresh} from '../js/core/default-state.js';
import {isDateKey} from '../js/shared/format.js';
import {prayerNames} from '../js/domain/prayer-timer.js';
import {createFocusTimer} from '../js/services/focus-timer.js';
test('Memo editing, safe text rendering, hidden recall, review, persistence and backup',()=>{
 const dom=new JSDOM('<div class="hero"><div id="modes"></div></div>',{url:'https://example.test'});globalThis.window=dom.window;globalThis.document=dom.window.document;window.ikraLanguage=()=> 'tr';const errors=[];window.ikraNotify=msg=>errors.push(msg);
 const store=createStore({storage:window.localStorage});const memo=createMemo({store});
 const click=text=>{const button=[...document.querySelectorAll('button')].find(x=>x.textContent===text);assert.ok(button,text);button.click();};
 click('Memo');click('+ Yeni metin');document.querySelector('input').value='Deneme';document.querySelector('textarea').value='<img src=x onerror=alert(1)>\nبِسْمِ اللَّهِ\nÜçüncü satır';document.querySelector('form').dispatchEvent(new window.Event('submit',{cancelable:true}));
 assert.equal(store.state.memos.length,1);assert.equal(document.querySelectorAll('#memo-hub img').length,0);
 click('Çalış →');click('Tam gizle');assert.ok(document.querySelectorAll('.memo-mask').length);assert.ok(!document.querySelector('.memo-paper').textContent.includes('onerror'));
 click('Kontrol et');assert.ok(document.querySelector('.memo-paper').textContent.includes('onerror'));click('Biriktirerek çalış');click('Sonraki →');assert.equal(document.querySelectorAll('.memo-paper p').length,2);click('Sonraki →');click('Turu tamamla ✓');click('Rahat hatırladım');
 assert.equal(store.state.memos[0].reviews,1);assert.ok(store.state.memos[0].due>Date.now());
 const restored=createStore({storage:window.localStorage});assert.deepEqual(restored.state.memos,store.state.memos);assert.equal(restored.state.memoView,false);
 const backup=normalizeBackup({data:store.state},{fresh,isDateKey,names:prayerNames});assert.deepEqual(backup.memos,store.state.memos);
 assert.deepEqual(errors,[]);memo.dispose();dom.window.close();delete globalThis.window;delete globalThis.document;
});
test('Memo navigation preserves the running focus session',()=>{
 const data=new Map();const store=createStore({storage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}});
 store.update(d=>{d.subjects=['Anatomy'];d.subject='Anatomy';});
 const focus=createFocusTimer({store,access:{require(){}},now:()=>1000});focus.start();const end=store.state.timer.endAt;
 store.update(d=>{d.memoView=true;});focus.changeMode('focus');assert.equal(store.state.memoView,false);assert.equal(store.state.timer.running,true);assert.equal(store.state.timer.endAt,end);
});
test('review intervals and malformed memo recovery',()=>{
 const m={level:0,reviews:0};assert.equal(reviewed(m,'again',0).due,600000);assert.equal(reviewed(m,'hard',0).due,86400000);assert.equal(reviewed(m,'easy',0).due,259200000);assert.deepEqual(normalizeMemos([null,{}, {text:3}]),[]);
});
