import {bilingual} from '../i18n/bindings.js';
import {isStopwatch, timerSeconds} from '../domain/focus-timer.js';
import {fmt} from '../shared/format.js';
export function createMiniPlayer({store,focus}) {
  let popup=null,opening=false,tick=null;
  const button=document.createElement('button');button.id='mini-player-open';button.className='button symbol-button';button.setAttribute('aria-pressed','false');
  button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><rect x="11" y="11" width="8" height="6" rx="1"/></svg>';
  document.querySelector('.controls').append(button);
  function labels(){button.title=bilingual('Mini pencere','Mini window');button.setAttribute('aria-label',button.title);}
  function cleanup(){clearInterval(tick);tick=null;popup=null;button.setAttribute('aria-pressed','false');}
  function render(){
    labels();if(!popup||popup.closed)return;
    const doc=popup.document,d=store.state,t=d.timer;
    const seconds=timerSeconds(d, Date.now());
    doc.body.dataset.theme=d.theme;doc.documentElement.lang=window.ikraLanguage();
    doc.getElementById('mini-mode').textContent=isStopwatch(d)?bilingual('KRONOMETRE','STOPWATCH'):d.mode==='focus'?bilingual('ODAK','FOCUS'):bilingual('MOLA','BREAK');
    doc.getElementById('mini-subject').textContent=d.mode==='focus'?(d.subject||bilingual('Kendine bir an ayır.','A moment for yourself.')):bilingual('Biraz nefes al.','Take a breath.');
    doc.getElementById('mini-time').textContent=fmt(seconds);doc.title=fmt(seconds)+' · IKRA';
    const start=doc.getElementById('mini-start');start.textContent=t.running?bilingual('Duraklat','Pause'):bilingual('Başlat','Start');
    doc.getElementById('mini-reset').textContent=bilingual('Sıfırla','Reset');
    doc.getElementById('mini-finish').textContent=bilingual('Bitir ve kaydet','Finish & save');
    doc.getElementById('mini-finish').hidden=d.mode!=='focus';
    doc.getElementById('mini-back').textContent=bilingual('Uygulamaya dön ↗','Back to app ↗');
    doc.getElementById('mini-hint').textContent=window.documentPictureInPicture?'':bilingual('Bu tarayıcıda pencere hep üstte kalmayabilir.','This browser may not keep the window on top.');
    doc.getElementById('mini-progress').hidden=isStopwatch(d);
    doc.getElementById('mini-progress').value=1-Math.min(1,seconds/(d.durations[d.mode]*60));
  }
  const act=fn=>()=>{try{fn();render();}catch(e){popup.document.getElementById('mini-status').textContent=e.message;}};
  button.onclick=async()=>{
    if(opening)return;if(popup&&!popup.closed){popup.focus();return;}
    opening=true;
    try{
      // Both paths are initiated by the user's click, avoiding popup blockers.
      popup=window.documentPictureInPicture?await window.documentPictureInPicture.requestWindow({width:360,height:310}):window.open('','ikra-mini','popup,width=360,height=330');
      if(!popup)throw Error('blocked');
      const doc=popup.document;doc.head.replaceChildren();doc.body.replaceChildren();
      const meta=doc.createElement('meta');meta.name='viewport';meta.content='width=device-width,initial-scale=1';
      const style=doc.createElement('link');style.rel='stylesheet';style.href=new URL('../../css/mini-player.css',import.meta.url).href;doc.head.append(meta,style);
      doc.body.innerHTML='<main class="mini"><header><span class="mark">IKRA</span><span id="mini-mode"></span></header><p id="mini-subject"></p><div id="mini-time" role="timer"></div><progress id="mini-progress" max="1" aria-label="Progress"></progress><div class="actions"><button id="mini-start" class="primary"></button><button id="mini-reset"></button></div><button id="mini-finish" class="mini-finish"></button><button id="mini-back" class="back"></button><p id="mini-status" role="status"></p><p id="mini-hint"></p></main>';
      doc.getElementById('mini-start').onclick=act(()=>{if(store.state.clockView)focus.changeMode(store.state.mode);focus.start();});doc.getElementById('mini-reset').onclick=act(()=>{focus.pause();if(store.state.pendingFocus?.length&&!popup.confirm(bilingual('Bu oturumu kaydetmeden sıfırla?','Reset this session without saving?')))return;focus.reset();});
      doc.getElementById('mini-finish').onclick=act(()=>focus.finish());
      doc.getElementById('mini-back').onclick=()=>{window.focus();popup?.close();};
      popup.addEventListener('pagehide',cleanup,{once:true});
      button.setAttribute('aria-pressed','true');render();tick=setInterval(()=>{if(popup?.closed)cleanup();else render();},1000);
    }catch{popup?.close();cleanup();window.ikraNotify(bilingual('Mini pencere açılamadı. Bu site için açılır pencerelere izin ver.','Could not open the mini window. Allow popups for this site.'));}
    finally{opening=false;}
  };
  const unsubscribe=store.subscribe(render);document.addEventListener('ikra-language',render);labels();
  const close=()=>popup?.close();window.addEventListener('pagehide',close);
  return {dispose(){close();cleanup();unsubscribe();document.removeEventListener('ikra-language',render);window.removeEventListener('pagehide',close);button.remove();}};
}
