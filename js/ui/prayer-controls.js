import {bilingual,localizedText} from '../i18n/bindings.js';
export default function initialize(){
 const $=s=>document.querySelector(s),controls=$('.prayer-main-controls');
 const presence=document.createElement('section');presence.id='prayer-presence';
 const begin=document.createElement('button');begin.id='prayer-go';begin.type='button';begin.className='bismillah-button';
 const caption=document.createElement('span');localizedText(caption,()=>bilingual('Namaza başla','Begin prayer'));
 const title=document.createElement('strong');title.textContent='BISMILLAH';begin.append(caption,title);
 begin.onclick=()=>document.dispatchEvent(new Event('prayer-begin'));
 const aura=document.createElement('div');aura.className='prayer-aura';aura.setAttribute('aria-hidden','true');
 const status=document.createElement('p');status.id='prayer-presence-status';status.setAttribute('role','status');
 presence.append(aura,begin,status);$('#bigclock').after(presence);
 const finish=$('#prayerfinish');localizedText(finish,()=>bilingual('Namazımı kıldım','Prayer completed'));finish.title='';
 const back=document.createElement('button');back.id='prayer-back';back.className='button';back.type='button';
 localizedText(back,()=>bilingual('Geri dön','Go back'));back.onclick=()=>document.dispatchEvent(new Event('prayer-leave'));controls.append(back);
 function sync(){const active=!finish.classList.contains('hidden');presence.classList.toggle('is-praying',active);begin.hidden=active;
   localizedText(status,()=>active?bilingual(`Şu anda ${window.ikraT($('#prayerselect').value)} namazı kılınıyor.`,`Praying ${window.ikraT($('#prayerselect').value)} now.`):bilingual('Vaktini seç. Bir an dur, niyet et.','Choose your prayer. Pause for a moment and set your intention.'));
 }
 document.addEventListener('focus-render',sync);sync();
}
