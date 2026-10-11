import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
test('push worker renders safely, focuses an existing app, and rejects external notification targets',async()=>{
  const handlers={},shown=[],opened=[],messages=[];let windows=[],promise,closed=false;
  const self={registration:{scope:'https://ikra.test/ikra/',showNotification:async(...args)=>shown.push(args)},addEventListener:(key,fn)=>handlers[key]=fn,clients:{matchAll:async()=>windows,openWindow:async url=>opened.push(url)}};
  vm.runInNewContext(readFileSync(new URL('../service-worker.js',import.meta.url),'utf8'),{self,URL});
  handlers.push({data:{json:()=>({title:'Odak',body:'Merhaba',target:'https://evil.test'})},waitUntil:p=>promise=p});await promise;
  assert.equal(shown[0][1].data.target,'home');assert.equal(shown[0][1].icon,'https://ikra.test/ikra/ikra-icon-v2-192.png');
  const event={notification:{data:{target:'prayer'},close:()=>closed=true},waitUntil:p=>promise=p};
  handlers.notificationclick(event);await promise;assert.equal(closed,true);assert.equal(opened[0],'https://ikra.test/ikra/?notification=prayer');
  windows=[{url:'https://ikra.test/ikra/',focus:async()=>{},postMessage:m=>messages.push(m)}];handlers.notificationclick(event);await promise;assert.equal(opened.length,1);assert.equal(messages[0].target,'prayer');
  handlers.push({data:{json:()=>{throw Error('invalid');}},waitUntil:p=>promise=p});await promise;assert.equal(shown[1][0],'IKRA');
});
