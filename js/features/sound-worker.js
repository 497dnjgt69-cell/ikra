import {synthesizeThemeSound} from './theme-sounds.js';
self.onmessage=({data:{id,theme,kind,rate}})=>{
  try {
    const samples=synthesizeThemeSound(theme,kind,rate);
    self.postMessage({id,samples},[samples.buffer]);
  } catch { self.postMessage({id,error:true}); }
};
