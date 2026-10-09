import test from 'node:test';
import assert from 'node:assert/strict';
import {createAudio} from '../js/features/audio.js';
test('marble sound reuses its buffer, respects mute/volume, throttles clicks, and releases nodes',()=>{
 const old=globalThis.window;
 let ctx,buffers=0,closed=0;const nodes=[];
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
 const node=()=>{const n={gain:param(),frequency:param(),playbackRate:param(),connect(x){return x;},disconnect(){this.disconnected=true;},start(){},stop(){}};nodes.push(n);return n;};
 class Context {
  constructor(){ctx=this;this.currentTime=1;this.sampleRate=48000;this.state='running';this.destination={};}
  createBuffer(ch,len){buffers++;const data=new Float32Array(len);return {getChannelData:()=>data};}
  createBufferSource(){return node();}createGain(){return node();}createOscillator(){return node();}
  close(){closed++;return Promise.resolve();}
 }
 globalThis.window={AudioContext:Context};
 try {
  const state={sound:false,soundVolume:0.5,theme:'neumorphism'};const play=createAudio(()=>state);
  play();assert.equal(buffers,0);state.sound=true;play();assert.equal(buffers,1);
  const source=nodes[0],gain=nodes[1];assert.equal(gain.gain.value,0.16);
  const samples=source.buffer.getChannelData();assert.ok(samples.every(Number.isFinite));assert.ok(Math.max(...samples)<1);
  play();assert.equal(nodes.length,2);
  ctx.currentTime+=0.1;play('pause');assert.equal(buffers,1);assert.equal(nodes[2].playbackRate.value,0.88);
  source.onended();assert.ok(source.disconnected&&gain.disconnected);
  state.soundVolume=0;ctx.currentTime+=1;play();assert.equal(nodes.length,4);
  state.soundVolume=0.5;state.theme='dark';play();assert.equal(buffers,1);assert.equal(nodes.length,6);
  play.dispose();assert.equal(closed,1);
 } finally { if(old===undefined)delete globalThis.window;else globalThis.window=old; }
});
