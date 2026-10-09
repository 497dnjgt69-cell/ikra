// Deterministic, locally synthesized sound palettes. No downloads or recordings.
const durations = {
  nature: {tap:1.15,start:1.8,pause:1.25,finish:3.2,wind:2.2},
  neumorphism: {tap:0.32,start:0.75,pause:0.55,finish:1.8,wind:1.0},
  light: {tap:0.4,start:1.0,pause:0.7,finish:2.0,wind:1.2},
  dark: {tap:0.55,start:1.3,pause:0.85,finish:2.5,wind:1.6},
};
export const soundThemes = Object.keys(durations);
export const soundKinds = ['tap','start','pause','finish','wind'];
const smooth = x => { x=Math.max(0,Math.min(1,x)); return x*x*(3-2*x); };
const pulse = (t,at,width) => Math.exp(-(((t-at)/width)**2));
const tone = (t,at,freq,decay,weight,attack=0.008) => {
  const x=t-at;if(x<0)return 0;
  return weight*Math.sin(2*Math.PI*freq*x)*smooth(x/attack)*Math.exp(-x/decay);
};
export function synthesizeThemeSound(theme,kind,rate) {
  if(!durations[theme])theme='light';
  if(!soundKinds.includes(kind))kind='tap';
  const duration=durations[theme][kind], data=new Float32Array(Math.ceil(duration*rate));
  let seed=917+soundKinds.indexOf(kind)*173,low=0,mid=0,air=0,slow=0;
  const alpha=f=>1-Math.exp(-2*Math.PI*f/rate);
  const aLow=alpha(180),aMid=alpha(1900),aAir=alpha(4800),aSlow=alpha(13);
  const notes = kind==='finish' ? [1,1.25,1.5] : kind==='start' ? [1,1.5] : [1];
  for(let i=0;i<data.length;i++) {
    const t=i/rate,u=t/duration;
    seed=(1664525*seed+1013904223)>>>0;
    const noise=seed/4294967296*2-1;
    low+=aLow*(noise-low);mid+=aMid*(noise-mid);air+=aAir*(noise-air);slow+=aSlow*(noise-slow);
    let value=0;
    if(theme==='nature') {
      // Broad, irregular swells and fine dry texture; no repeated machine-gun grains.
      const swells=kind==='start' ? pulse(u,.2,.13)+.7*pulse(u,.49,.18) :
        kind==='finish' ? .7*pulse(u,.14,.09)+pulse(u,.35,.13)+.7*pulse(u,.59,.18) :
        kind==='pause' ? pulse(u,.18,.16)+.35*pulse(u,.4,.16) :
        pulse(u,.24,.16)+.6*pulse(u,.52,.2);
      const flutter=.7+.17*Math.sin(2*Math.PI*7.3*t+.8*Math.sin(2*Math.PI*1.7*t))+.13*Math.sin(2*Math.PI*17.1*t);
      const texture=(mid-low)*1.45+(air-mid)*.23;
      value=texture*swells*flutter*(.8+Math.min(.4,Math.abs(slow)*8));
      // A low woody accent distinguishes beginning, resting and completion.
      if(kind!=='tap'&&kind!=='wind') {
        const hits=kind==='finish'?[.15,.5,.93]:kind==='start'?[.08,.36]:[.1];
        hits.forEach((at,n)=>{value+=tone(t,at,kind==='pause'?220:330+n*85,.13,.12);});
      }
    } else if(theme==='neumorphism') {
      const hits=kind==='finish'?[0,.24,.52]:kind==='start'?[0,.18]:[0];
      hits.forEach((at,n)=>{
        const freq=kind==='pause'?230:kind==='finish'?280+n*60:310+n*45;
        value+=tone(t,at,freq,.065,.68,.002)+tone(t,at,freq*2.38,.035,.075,.002);
        const x=t-at;if(x>=0)value+=(mid-low)*.12*Math.exp(-x*150)*smooth(x/.002);
      });
      if(kind==='wind')value+=low*.55*pulse(u,.4,.25);
    } else if(theme==='light') {
      // Rounded glass: bright but with a restrained upper partial.
      notes.forEach((ratio,n)=>{
        const at=n*.19,base=kind==='pause'?520:680;
        value+=tone(t,at,base*ratio,kind==='finish'?.36:.14,.28)+tone(t,at,base*ratio*2.01,.11,.035);
      });
      if(kind==='wind')value+=(air-low)*.12*pulse(u,.4,.22);
    } else {
      // Dark: a low, warm electronic pulse with a slow, soft tail.
      notes.forEach((ratio,n)=>{
        const at=n*.25,base=kind==='pause'?155:196;
        value+=tone(t,at,base*ratio,kind==='finish'?.5:.22,.33,.018)+tone(t,at,base*ratio*2,.18,.065,.018);
      });
      if(kind==='wind')value+=low*.9*pulse(u,.42,.25);
    }
    // Every sound reaches exact silence: continuous onset and a long cosine-like release.
    const attack=theme==='nature'?.045:.002;
    const release=theme==='nature'?duration*.42:Math.min(.3,duration*.3);
    const envelope=smooth(t/attack)*smooth((duration-t-1/rate)/release);
    data[i]=Math.tanh(value)*envelope;
  }
  data[0]=0;data[data.length-1]=0;
  return data;
}
