import {bilingual} from '../i18n/bindings.js';
import {datekey} from '../shared/format.js';
import {prayerNames} from '../domain/prayer-timer.js';
import {prayerGarden} from '../core/prayer-garden.js';
import {getNextPrayer,prayerWallNow} from '../domain/prayer-times.js';
const english={Sabah:'Fajr','Öğle':'Dhuhr','İkindi':'Asr','Akşam':'Maghrib','Yatsı':'Isha'};
export function gardenScene(total){
  const mature=Math.min(1,total/30),scale=.3+mature*.7;
  const plants=Array.from({length:Math.min(8,Math.floor(total/5))},(_,i)=>{
    const x=[145,445,205,391,110,485,245,355][i],y=[241,246,262,266,275,278,288,291][i];
    return `<g transform="translate(${x} ${y})"><path d="M0 0v-24" stroke="#67846b" stroke-width="2"/><ellipse cx="-7" cy="-15" rx="9" ry="4" transform="rotate(30 -7 -15)" fill="#89aa83"/><ellipse cx="7" cy="-22" rx="9" ry="4" transform="rotate(-30 7 -22)" fill="#bad1a2"/><circle cy="-27" r="4" fill="#e6d4a3"/></g>`;
  }).join('');
  return `<svg viewBox="0 0 600 330" aria-hidden="true" focusable="false"><defs><linearGradient id="garden-soil" x2="0" y2="1"><stop stop-color="#acb99f"/><stop offset="1" stop-color="#6e866f"/></linearGradient><radialGradient id="garden-glow"><stop stop-color="#efdba3" stop-opacity=".35"/><stop offset="1" stop-color="#efdba3" stop-opacity="0"/></radialGradient></defs><circle cx="304" cy="124" r="122" fill="url(#garden-glow)"/><circle cx="450" cy="84" r="25" fill="#dfcd9e" opacity=".5"/><ellipse cx="300" cy="294" rx="202" ry="17" fill="#293e3920"/><path d="M88 247Q300 173 512 247L487 273Q300 338 113 273Z" fill="url(#garden-soil)"/><ellipse cx="300" cy="245" rx="212" ry="53" fill="#bdcaaa"/><path d="M315 293Q257 266 296 242Q322 225 303 214" fill="none" stroke="#e6dfc7" stroke-width="17" opacity=".8"/>${plants}<g transform="translate(300 236) scale(${scale})"><path d="M0 0Q-8-52 0-139M-3-65L-43-105M-1-82L42-117" fill="none" stroke="#797263" stroke-width="9" stroke-linecap="round"/><ellipse cx="-34" cy="-125" rx="53" ry="43" fill="#8da984"/><ellipse cx="37" cy="-135" rx="53" ry="44" fill="#a2bd92"/><ellipse cx="0" cy="-167" rx="52" ry="47" fill="#b8cba0"/><ellipse cx="-19" cy="-179" rx="27" ry="24" fill="#cedabb" opacity=".65"/></g><ellipse cx="198" cy="246" rx="17" ry="8" fill="#e0dfce"/><ellipse cx="418" cy="271" rx="12" ry="6" fill="#dddecb"/><path d="M171 108q7-7 14 0q7-7 14 0M389 65q5-5 10 0q5-5 10 0" fill="none" stroke="#8c9c92" stroke-width="2" stroke-linecap="round"/></svg>`;
}
export function createPrayerHub({store,records}){
  const hub=document.createElement('section');hub.id='prayer-hub';hub.hidden=true;hub.dataset.i18nManaged='';hub.setAttribute('aria-label',bilingual('Namaz merkezi','Prayer hub'));
  hub.innerHTML=`<div class="ph-grid">
    <section class="ph-card ph-times"><div class="ph-eyebrow" data-copy="times"></div><h2 id="ph-next-name"></h2><div id="ph-countdown"></div><p id="ph-place"></p><div id="ph-times-list"></div><button type="button" class="ph-link" id="ph-location" data-copy="location"></button></section>
    <section class="ph-card ph-garden"><div class="ph-eyebrow" data-copy="garden"></div><h2 id="ph-garden-title"></h2><div id="ph-scene" role="img"></div><p id="ph-garden-caption"></p><span id="ph-growth"></span></section>
    <section class="ph-card ph-insights"><div class="ph-eyebrow" data-copy="journey"></div><h2 data-copy="seven"></h2><div class="ph-numbers"><div><strong id="ph-week-total"></strong><span data-copy="marked"></span></div><div><strong id="ph-full-days"></strong><span data-copy="full"></span></div></div><div id="ph-bars" class="ph-bars"></div><div class="ph-lifetime"><span data-copy="active"></span><strong id="ph-active-days"></strong></div><p class="ph-soft" data-copy="gentle"></p></section>
  </div><section class="ph-card ph-daily"><div class="ph-day-header"><div><div class="ph-eyebrow" data-copy="daily"></div><h2 id="ph-day-label"></h2></div><div class="ph-day-nav"><button type="button" id="ph-prev">‹</button><button type="button" id="ph-today" data-copy="today"></button><button type="button" id="ph-next">›</button></div></div><div id="ph-checks"></div><p id="ph-feedback" role="status" aria-live="polite"></p></section>`;
  document.querySelector('.hero').append(hub);
  const $=selector=>hub.querySelector(selector),tab=document.querySelector('#prayerstart');
  tab.setAttribute('aria-controls','prayer-hub');
  const copy={times:['SIRADAKİ VAKİT','NEXT PRAYER'],location:['Konum ve vakit ayarları ↗','Location & prayer settings ↗'],garden:['HUZUR BAHÇEN','YOUR PEACEFUL GARDEN'],journey:['KENDİ RİTMİNDE','AT YOUR OWN PACE'],seven:['Son 7 gün','Last 7 days'],marked:['işaretlenen vakit','prayers marked'],full:['beş vakitlik gün','days with all five'],active:['Toplam kayıtlı gün','Total days with a record'],gentle:['Her yeni gün, yeni bir başlangıç.','Each new day is a fresh start.'],daily:['GÜNLÜK TAKİP','DAILY CHECK-IN'],today:['Bugün','Today']};
  let selected=datekey(Date.now()),lastDay=selected,model=null,signature='',sceneTotal=-1,wasOpen=false;
  function data(){const d=store.state,key=JSON.stringify([d.prayers,d.prayerChecks,datekey(Date.now())]);if(signature!==key){signature=key;model=prayerGarden(d.prayers,d.prayerChecks);return true;}return false;}
  for(const name of prayerNames){const button=document.createElement('button');button.type='button';button.dataset.prayer=name;button.innerHTML='<span class="ph-check-icon" aria-hidden="true"></span><span class="ph-check-name"></span><small></small>';button.onclick=()=>{
    data();const done=model.completed.has(selected+':'+name);
    try{records.setPrayerCheck(selected,name,!done);$('#ph-feedback').textContent=done?bilingual('İşaret kaldırıldı.','Mark removed.'):bilingual('Kaydedildi. Bahçendeki yerini aldı.','Saved. A little growth for your garden.');}
    catch(error){$('#ph-feedback').textContent=error.message;}
  };$('#ph-checks').append(button);}
  function shift(delta){const date=new Date(selected+'T12:00:00');date.setDate(date.getDate()+delta);const key=datekey(date);if(key>datekey(Date.now()))return;selected=key;$('#ph-feedback').textContent='';render(true);}
  $('#ph-prev').onclick=()=>shift(-1);$('#ph-next').onclick=()=>shift(1);$('#ph-today').onclick=()=>{selected=datekey(Date.now());render(true);};
  $('#ph-location').onclick=()=>window.openPrayerSettings();
  function paintTimes(){
    const d=store.state,now=Date.now();let wall,next;
    try{wall=prayerWallNow(d,new Date(now));next=getNextPrayer(d,now);}catch{wall={date:'',zone:''};next=null;}
    const valid=d.prayerDate===wall.date;
    $('#ph-next-name').textContent=next?bilingual(next.name,english[next.name]||next.name):bilingual('Vakitlerini ekle','Add your prayer times');
    $('#ph-countdown').textContent=next?`${String(Math.floor(next.minutes/60)).padStart(2,'0')}:${String(next.minutes%60).padStart(2,'0')}`:'—';
    $('#ph-countdown').setAttribute('aria-label',next?bilingual(`${next.minutes} dakika kaldı`,`${next.minutes} minutes remaining`):bilingual('Vakit bilgisi yok','Prayer times unavailable'));
    $('#ph-place').textContent=[d.prayerLocation,wall.zone].filter(Boolean).join(' · ');
    if(!next&&valid)$('#ph-next-name').textContent=bilingual('Yarının vakitleri bekleniyor','Waiting for tomorrow’s times');
    const list=$('#ph-times-list');
    if(!list.children.length)for(const name of prayerNames){const row=document.createElement('div');row.dataset.name=name;row.append(document.createElement('span'),document.createElement('time'));list.append(row);}
    for(const row of list.children){const name=row.dataset.name;row.firstChild.textContent=bilingual(name,english[name]);row.lastChild.textContent=valid?(d.prayerTimes[name]||'—'):'—';row.classList.toggle('is-next',next?.name===name&&!next.tomorrow);}
  }
  function render(force=false){
    const open=!!store.state.prayerHub;
    document.body.classList.toggle('prayer-hub-active',open);hub.hidden=!open;tab.classList.toggle('active',open);tab.setAttribute('aria-pressed',String(open));
    if(!open){wasOpen=false;return;}
    const today=datekey(Date.now());if(today!==lastDay){if(selected===lastDay)selected=today;lastDay=today;force=true;}
    const changed=data();
    if(force||changed||!wasOpen){
      hub.setAttribute('aria-label',bilingual('Namaz merkezi','Prayer hub'));
      for(const el of hub.querySelectorAll('[data-copy]'))el.textContent=bilingual(...copy[el.dataset.copy]);
      const total=model.total;
      $('#ph-garden-title').textContent=total===0?bilingual('Bir başlangıca yer aç.','Make room for a beginning.'):total<30?bilingual('Küçük adımlar, yeni yapraklar.','Small steps, new leaves.'):bilingual('Huzur burada büyüyor.','Peace grows here.');
      if(sceneTotal!==total){$('#ph-scene').innerHTML=gardenScene(total);sceneTotal=total;}
      $('#ph-scene').setAttribute('aria-label',bilingual(`${total} kayıtla büyüyen huzur bahçen`, `Your peaceful garden, grown with ${total} records`));
      $('#ph-garden-caption').textContent=bilingual('Bahçen küçük adımlarla büyür. Ara verdiğinde seni bekler.','Your garden grows with small steps. It waits for you when you take a break.');
      $('#ph-growth').textContent=bilingual(`${total} vakit · ${model.activeDays} gün`,`${total} prayers · ${model.activeDays} days`);
      $('#ph-week-total').textContent=model.weekTotal;$('#ph-full-days').textContent=model.fullDays;$('#ph-active-days').textContent=model.activeDays;
      const locale=window.ikraLanguage()==='en'?'en-GB':'tr-TR';
      $('#ph-bars').replaceChildren(...model.days.map(day=>{const bar=document.createElement('div'),track=document.createElement('div'),fill=document.createElement('i'),label=document.createElement('span');track.className='ph-bar-track';fill.style.height=`${day.count*20}%`;track.append(fill);label.textContent=day.date.toLocaleDateString(locale,{weekday:'short'});bar.title=`${day.date.toLocaleDateString(locale)} · ${day.count}/5`;bar.setAttribute('role','img');bar.setAttribute('aria-label',bar.title);bar.append(track,label);return bar;}));
      $('#ph-day-label').textContent=(selected===today?bilingual('Bugün · ','Today · '):'')+new Date(selected+'T12:00:00').toLocaleDateString(locale,{day:'numeric',month:'long'});
      $('#ph-next').disabled=selected>=today;$('#ph-prev').setAttribute('aria-label',bilingual('Önceki gün','Previous day'));$('#ph-next').setAttribute('aria-label',bilingual('Sonraki gün','Next day'));
      for(const button of $('#ph-checks').children){const name=button.dataset.prayer,done=model.completed.has(selected+':'+name);button.setAttribute('aria-pressed',String(done));button.querySelector('.ph-check-icon').textContent=done?'✓':'○';button.querySelector('.ph-check-name').textContent=bilingual(name,english[name]);button.querySelector('small').textContent=done?bilingual('Kıldım','Completed'):bilingual('İşaretle','Mark');}
    }
    paintTimes();wasOpen=true;
  }
  const unsubscribe=store.subscribe(()=>render());
  const language=()=>render(true);document.addEventListener('ikra-language',language);
  const interval=setInterval(()=>{if(!document.hidden&&store.state.prayerHub)render();},15000);
  const visible=()=>{if(!document.hidden)render(true);};document.addEventListener('visibilitychange',visible);
  render();
  return {dispose(){unsubscribe();clearInterval(interval);document.removeEventListener('ikra-language',language);document.removeEventListener('visibilitychange',visible);document.body.classList.remove('prayer-hub-active');hub.remove();}};
}
