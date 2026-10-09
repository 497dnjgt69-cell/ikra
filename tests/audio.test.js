import test from 'node:test';
import assert from 'node:assert/strict';
import {createAudio} from '../js/features/audio.js';
import {synthesizeThemeSound,soundThemes,soundKinds} from '../js/features/theme-sounds.js';
test('every theme and action has a distinct bounded sound with a smooth silent ending',()=>{
 const fingerprints=new Set();
 for(const rate of [44100,48000])for(const theme of soundThemes)for(const kind of soundKinds){
  const data=synthesizeThemeSound(theme,kind,rate);
  assert.equal(data[0],0);assert.equal(Math.abs(data.at(-1)),0);
  let peak=0,energy=0,tail=0;
  for(let i=0;i<data.length;i++){assert.ok(Number.isFinite(data[i]));peak=Math.max(peak,Math.abs(data[i]));energy+=data[i]**2;if(i>data.length-rate*.01)tail+=data[i]**2;}
  assert.ok(peak<1&&peak>.005);assert.ok(tail/energy<.0001,`${theme}/${kind} abrupt tail`);
  if(rate===48000){const key=data.length+':'+Array.from(data.slice(1000,1020)).join(',');assert.ok(!fingerprints.has(key));fingerprints.add(key);}
  if(theme==='nature')assert.ok(data.length/rate>=1.1);
 }
});
test('audio caches theme/action buffers, respects settings, fades crowded clicks, and cleans up',()=>{
 const old=globalThis.window;let ctx,buffers=0,closed=0;const nodes=[];
 const param=()=>({value:0,cancelScheduledValues(){},setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;}});
 const node=()=>{const n={gain:param(),connect(x){return x;},disconnect(){this.disconnected=true;},start(){},stop(t){this.stoppedAt=t;}};nodes.push(n);return n;};
 class Context {
  constructor(){ctx=this;this.currentTime=1;this.sampleRate=48000;this.state='running';this.destination={};}
  createBuffer(ch,len){buffers++;const data=new Float32Array(len);return {getChannelData:()=>data};}
  createBufferSource(){return node();}createGain(){return node();}close(){closed++;return Promise.resolve();}
 }
 globalThis.window={AudioContext:Context};
 try{
  const state={sound:false,soundVolume:.5,theme:'nature'},play=createAudio(()=>state);
  play();assert.equal(buffers,0);state.sound=true;play();assert.equal(buffers,1);
  play();assert.equal(nodes.length,2);
  for(let i=0;i<4;i++){ctx.currentTime+=.1;play();}
  assert.equal(buffers,1);assert.ok(nodes[0].stoppedAt>ctx.currentTime);
  ctx.currentTime+=1;play('start');assert.equal(buffers,2);
  const start=nodes.at(-2);assert.ok(start.buffer.getChannelData().length>nodes[0].buffer.getChannelData().length);
  state.theme='dark';play('finish');assert.equal(buffers,3);
  state.sound=false;play.syncSettings();assert.equal(nodes.at(-1).gain.value,0);
  const count=nodes.length;play();assert.equal(nodes.length,count);
  start.onended();assert.ok(start.disconnected);
  play.dispose();assert.equal(closed,1);
 }finally{if(old===undefined)delete globalThis.window;else globalThis.window=old;}
});
