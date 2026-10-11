import {synthesizeThemeSound, soundThemes, soundKinds} from './theme-sounds.js';
// Reuse one context and one buffer per theme/action. Settings are read lazily.
export function createAudio(getSettings) {
  let context, worker, workerFailed=false, disposed=false, nextId=0, lastTap=-Infinity;
  const pending=new Map(), jobs=new Map();
  const buffers=new Map(), active=new Set();
  function generate(theme,kind,rate) {
    return new Promise((resolve,reject)=>{
      const id=++nextId;
      const fallback=()=>setTimeout(()=>{
        if(disposed){reject(new Error('disposed'));return;}
        try{resolve(synthesizeThemeSound(theme,kind,rate));}catch(e){reject(e);}
      },0);
      if(!workerFailed && typeof window.Worker==='function') {
        try {
          if(!worker) {
            worker=new window.Worker(new URL('./sound-worker.js',import.meta.url),{type:'module'});
            worker.onmessage=({data})=>{
              const job=jobs.get(data.id);if(!job)return;jobs.delete(data.id);
              if(data.error)job.fallback();else job.resolve(data.samples);
            };
            worker.onerror=()=>{
              workerFailed=true;worker?.terminate();worker=null;
              for(const job of jobs.values())job.fallback();jobs.clear();
            };
          }
          jobs.set(id,{resolve,reject,fallback});worker.postMessage({id,theme,kind,rate});return;
        }catch{workerFailed=true;jobs.delete(id);}
      }
      fallback();
    });
  }
  async function playSound(kind='tap') {
    const d=getSettings();
    if(disposed || d.theme==='nature' || !d.sound || d.soundVolume<=0)return;
    if(!soundKinds.includes(kind))kind='tap';
    try {
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      context ||= new AC();
      if(context.state==='suspended')context.resume().catch(()=>{});
      let now=context.currentTime;
      if(kind==='tap'&&now-lastTap<.08)return;
      if(kind==='tap')lastTap=now;
      const theme=soundThemes.includes(d.theme)?d.theme:'light', key=theme+':'+kind;
      if(!buffers.has(key)) {
        if(!pending.has(key)) {
          const ctx=context;
          const task=generate(theme,kind,ctx.sampleRate).then(samples=>{
            if(disposed)return;
            const buffer=ctx.createBuffer(1,samples.length,ctx.sampleRate);
            buffer.getChannelData(0).set(samples);buffers.set(key,buffer);
          }).finally(()=>pending.delete(key));
          pending.set(key,task);
        }
        await pending.get(key);
      }
      const current=getSettings();
      if(disposed || !current.sound || current.soundVolume<=0 || current.theme!==d.theme)return;
      now=context.currentTime;
      // Fade the oldest click if rapid interaction would accumulate too many tails.
      const taps=[...active].filter(v=>v.kind==='tap'&&!v.fading);
      if(kind==='tap'&&taps.length>=4) {
        const voice=taps[0];voice.fading=true;
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setValueAtTime(voice.level,now);
        voice.gain.gain.linearRampToValueAtTime(0,now+.12);
        voice.source.stop(now+.13);
      }
      const source=context.createBufferSource(),gain=context.createGain();
      source.buffer=buffers.get(key);
      const scale=.32,level=current.soundVolume*scale;
      gain.gain.value=level;
      source.connect(gain).connect(context.destination);
      const voice={source,gain,kind,level,scale,fading:false};active.add(voice);
      source.onended=()=>{source.disconnect();gain.disconnect();active.delete(voice);};
      source.start();
    }catch{}
  }
  playSound.syncSettings=()=>{
    if(!context)return;
    const d=getSettings(),now=context.currentTime;
    for(const voice of active) {
      if(voice.fading)continue;
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(voice.level,now);
      voice.level=d.sound&&d.theme!=='nature'?d.soundVolume*voice.scale:0;
      voice.gain.gain.linearRampToValueAtTime(voice.level,now+.08);
    }
  };
  playSound.dispose=()=>{
    disposed=true;worker?.terminate();worker=null;
    for(const job of jobs.values())job.reject(new Error('disposed'));jobs.clear();
    context?.close().catch(()=>{});context=null;buffers.clear();active.clear();lastTap=-Infinity;
  };
  return playSound;
}
