import {bilingual,localizedText,t} from '../i18n/bindings.js';
import {ankiJourney,summarizeAnki} from '../core/anki.js';
import {display} from '../shared/format.js';
export function createAnkiWidget({store}){
 const card=document.createElement('section');card.id='anki-widget';card.className='card anki-mini hidden';
 const body=document.createElement('div');body.className='anki-mini-stats';card.append(body);document.querySelector('.focusstage').append(card);
 const button=document.createElement('button');button.id='anki-toggle';button.className='button';button.type='button';button.dataset.dockId='anki';button.setAttribute('aria-controls',card.id);button.setAttribute('aria-expanded','false');
 button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h12v16H5zM9 7h4m-4 4h4m7-5v16H9"/></svg><span>Anki</span>';
 button.onclick=()=>{const show=button.getAttribute('aria-expanded')!=='true';window.animatePanel(card,show);button.setAttribute('aria-expanded',String(show));};document.querySelector('.dock').append(button);
 const meta=document.createElement('small');card.append(meta);
 function render(){
  const journey=ankiJourney(store.state.anki,store.state.ankiGoal),now=new Date(),start=new Date(now);start.setHours(0,0,0,0);const stats=summarizeAnki(store.state.anki,start,now);
  body.replaceChildren();for(const [value,tr,en] of [[journey.today,'Bugünkü tekrar','Reviews today'],[t(display(stats.seconds)),'Bugünkü süre','Time today'],[journey.streak,'Gün seri','Day streak']]){
   const item=document.createElement('div'),amount=document.createElement('strong'),label=document.createElement('span');amount.textContent=String(value);localizedText(label,()=>bilingual(tr,en));item.append(amount,label);body.append(item);
  }
  localizedText(meta,()=>store.state.anki?bilingual('Son eşitlenen veriler','Last synced data'):bilingual('Bağlamak için İstatistikler → Anki','Connect in Statistics → Anki'));
 }
 const unsub=store.subscribe(render);document.addEventListener('ikra-language',render);render();return {dispose(){unsub();document.removeEventListener('ikra-language',render);}};
}
