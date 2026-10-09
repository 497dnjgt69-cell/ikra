import {synthesizeThemeSound, soundThemes, soundKinds} from './theme-sounds.js';
// Reuse one context and one buffer per theme/action. Settings are read lazily.
export function createAudio(getSettings) {
  let context, lastTap=-Infinity;
  const buffers=new Map(), active=new Set();
  function playSound(kind='tap') {
    const d=getSettings();
    if(!d.sound || d.soundVolume<=0)return;
    if(!soundKinds.includes(kind))kind='tap';
    try {
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
      context ||= new AC();
      if(context.state==='suspended')context.resume().catch(()=>{});
      const now=context.currentTime;
      if(kind==='tap'&&now-lastTap<.08)return;
      if(kind==='tap')lastTap=now;
      const theme=soundThemes.includes(d.theme)?d.theme:'light', key=theme+':'+kind;
      if(!buffers.has(key)) {
        const samples=synthesizeThemeSound(theme,kind,context.sampleRate);
        const buffer=context.createBuffer(1,samples.length,context.sampleRate);
        buffer.getChannelData(0).set(samples);buffers.set(key,buffer);
      }
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
      const scale=theme==='nature'?.55:.32,level=d.soundVolume*scale;
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
      voice.level=d.sound?d.soundVolume*voice.scale:0;
      voice.gain.gain.linearRampToValueAtTime(voice.level,now+.08);
    }
  };
  playSound.dispose=()=>{
    context?.close().catch(()=>{});context=null;buffers.clear();active.clear();lastTap=-Infinity;
  };
  return playSound;
}
