import {bilingual,localizedText,t} from '../i18n/bindings.js';
export default function initialize({store}){
 const $=s=>document.querySelector(s);
 const make=(tag,tr,en,cls='')=>{const e=document.createElement(tag);e.className=cls;if(tr)localizedText(e,()=>bilingual(tr,en));return e;};
 const dispatch=name=>document.dispatchEvent(new Event(name));
 const presence=make('section',null,null,'prayer-setup');presence.id='prayer-presence';
 const heading=make('h2','Bir an dur. Niyet et.','Pause. Set your intention.');
 const intro=make('p','Önce kılacağın vakti seç.','First, choose your prayer.','prayer-setup-caption');
 const selection=$('.prayer-selection');
 const begin=make('button',null,null,'bismillah-button');begin.id='prayer-go';begin.type='button';
 begin.append(make('span','Namaza başla','Begin prayer'),make('strong','BISMILLAH','BISMILLAH'));
 begin.onclick=()=>dispatch(store.state.prayerTimer?'prayer-resume':'prayer-begin');
 const status=make('p');status.id='prayer-presence-status';status.setAttribute('role','status');
 const back=make('button','Geri dön','Go back','prayer-text-button');back.type='button';back.id='prayer-back';back.onclick=()=>dispatch('prayer-leave');
 presence.append(heading,intro,selection,begin,status,back);$('.hero').append(presence);
 const room=make('dialog');room.id='prayer-focus-room';room.setAttribute('aria-labelledby','prayer-focus-title');
 const shell=make('div',null,null,'prayer-focus-shell');
 const top=make('header',null,null,'prayer-focus-top');
 const exit=make('button','‹ Geri','‹ Back','prayer-text-button');exit.type='button';exit.id='prayer-focus-exit';exit.onclick=()=>dispatch('prayer-exit-focus');
 const title=make('h2');title.id='prayer-focus-title';top.append(exit,title,make('span','IKRA','IKRA','prayer-wordmark'));
 const center=make('div',null,null,'prayer-focus-center');
 const orb=make('div',null,null,'prayer-orb');orb.setAttribute('aria-hidden','true');for(let i=0;i<3;i++)orb.append(make('span'));
 const stateText=make('p');stateText.id='prayer-focus-status';stateText.setAttribute('role','status');
 const quote=make('figure',null,null,'prayer-focus-quote'),text=make('blockquote'),source=make('a');source.target='_blank';source.rel='noopener noreferrer';quote.append(text,source);
 center.append(orb,stateText,quote);
 const actions=make('footer',null,null,'prayer-focus-actions');
 const pause=make('button',null,null,'prayer-pause-button');pause.type='button';pause.id='prayer-pause';pause.onclick=()=>dispatch(store.state.prayerTimer?.paused?'prayer-resume':'prayer-pause');
 const finish=$('#prayerfinish');finish.className='prayer-text-button';localizedText(finish,()=>bilingual('Namazımı kıldım','Prayer completed'));finish.title='';
 actions.append(pause,finish);shell.append(top,center,actions);room.append(shell);document.body.append(room);
 room.addEventListener('cancel',e=>{e.preventDefault();dispatch('prayer-exit-focus');});
 room.addEventListener('close',()=>{document.body.classList.remove('prayer-immersed');if(!room.open&&store.state.prayerTimer?.immersed)dispatch('prayer-exit-focus');if(store.state.prayerView)begin.focus({preventScroll:true});});
 const quotes=[
  ['Beni anmak için namaz kıl.','Establish prayer for My remembrance.','Tâhâ 20:14 · Kısa anlamı','Taha 20:14 · Excerpt in meaning','https://quran.com/20/14'],
  ['Sabır ve namazla yardım dileyin.','Seek help through patience and prayer.','Bakara 2:45 · Kısa anlamı','Al-Baqarah 2:45 · Excerpt in meaning','https://quran.com/2/45'],
  ['Namaz bir nurdur.','Prayer is light.','Sahih Muslim 223 · Kısa anlamı','Sahih Muslim 223 · Excerpt in meaning','https://sunnah.com/muslim:223']
 ];
 let quoteIndex=0,lastOpen=false;
 function paintQuote(){const q=quotes[quoteIndex];localizedText(text,()=>bilingual(q[0],q[1]));localizedText(source,()=>bilingual(q[2],q[3]));source.href=q[4];}
 const rotate=setInterval(()=>{if(!room.open||store.state.prayerTimer?.paused||document.hidden)return;quoteIndex=(quoteIndex+1)%quotes.length;paintQuote();if(!matchMedia('(prefers-reduced-motion: reduce)').matches)quote.animate([{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:650,easing:'ease-out'});},18000);
 function sync(){
  const session=store.state.prayerTimer,selected=$('#prayerselect').value;
  begin.disabled=!session&&!selected;
  localizedText(begin.querySelector('span'),()=>session?bilingual('Namaza devam et','Continue prayer'):bilingual('Namaza başla','Begin prayer'));
  localizedText(status,()=>session?bilingual(`${t(session.name)} · Durduruldu`,`${t(session.name)} · Paused`):selected?bilingual(`${t(selected)} namazı için hazırsın.`,`Ready for ${t(selected)} prayer.`):bilingual('Başlamak için bir vakit seç.','Choose a prayer to begin.'));
  const open=!!(store.state.prayerView&&session?.immersed);
  room.classList.toggle('is-paused',!!session?.paused);
  localizedText(title,()=>session?t(session.name):bilingual('Namaz','Prayer'));
  localizedText(stateText,()=>session?.paused?bilingual('Durduruldu · Hazır olduğunda devam et.','Paused · Continue when you’re ready.'):bilingual('Şimdi yalnızca bu an.','Just this moment.'));
  localizedText(pause,()=>session?.paused?bilingual('▶ Devam et','▶ Resume'):bilingual('Ⅱ Durdur','Ⅱ Pause'));pause.setAttribute('aria-pressed',String(!!session?.paused));
  if(open&&!room.open){paintQuote();room.showModal();document.body.classList.add('prayer-immersed');pause.focus({preventScroll:true});}
  else if(!open&&room.open)room.close();
  if(open!==lastOpen){document.body.classList.toggle('prayer-immersed',open);lastOpen=open;}
 }
 document.addEventListener('focus-render',sync);$('#prayerselect').addEventListener('change',sync);paintQuote();sync();
 return {dispose(){clearInterval(rotate);document.removeEventListener('focus-render',sync);$('#prayerselect').removeEventListener('change',sync);}};
}
