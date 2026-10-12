import {bilingual as b} from '../i18n/bindings.js';
import {splitLines,reviewed,hiddenWord} from '../core/memo.js';
export function createMemo({store}) {
 const root=document.createElement('section');root.id='memo-hub';root.dataset.i18nManaged='';root.hidden=true;
 const tab=document.createElement('button');tab.type='button';tab.id='memo-tab';tab.textContent='Memo';tab.setAttribute('aria-controls',root.id);
 document.querySelector('#modes').append(tab);document.querySelector('.hero').append(root);
 let selected=null,line=0,stage=0,cumulative=false,revealed=false,screen='library',editing=null,dueOnly=false,last='';
 const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const btn=(text,fn,cls='button')=>{const e=el('button',text,cls);e.type='button';e.onclick=()=>safe(fn);return e;};
 function safe(fn){try{fn();}catch{window.ikraNotify(b('Kaydedilemedi. Depolama alanını kontrol edip tekrar dene.','Could not save. Check storage and try again.'));}}
 const current=()=>store.state.memos.find(m=>m.id===selected);
 function save(mutator){store.update(d=>mutator(d.memos));}
 function study(m){selected=m.id;line=0;stage=0;revealed=false;screen='study';render();}
 function library(){screen='library';render();}
 function render(){
  if(root.hidden)return;
  root.replaceChildren();
  const top=el('div',undefined,'memo-top');root.append(top);
  top.append(el('span',b('MEMO · EZBER ALANI','MEMO · MEMORY SPACE'),'memo-eyebrow'));
  if(screen!=='library')top.append(btn(b('← Ezberlerim','← My collection'),library));
  if(screen==='editor'){editor();return;}
  if(screen==='library'){
   const head=el('div',undefined,'memo-heading');head.append(el('h2',b('Kelimeler geçmesin. Kalsın.','Words worth keeping.')),btn(b('+ Yeni metin','+ New text'),()=>{editing=null;screen='editor';render();},'button primary'));root.append(head);
   root.append(el('p',b('Oku, gizle, hatırla. Kendi hızında, satır satır.','Read, hide, recall. Line by line, at your pace.'),'memo-muted'));
   const due=store.state.memos.filter(m=>m.due<=Date.now()).length;
   const filters=el('div',undefined,'memo-actions');
   for(const [label,value] of [[b('Tümü','All'),false],[b(`Tekrar zamanı · ${due}`,`Due for review · ${due}`),true]]){const x=btn(label,()=>{dueOnly=value;render();});x.setAttribute('aria-pressed',String(dueOnly===value));filters.append(x);}root.append(filters);
   const list=el('div',undefined,'memo-grid');root.append(list);
   const memos=store.state.memos.filter(m=>!dueOnly||m.due<=Date.now());
   if(!memos.length){const empty=el('div',undefined,'memo-card memo-empty');empty.append(el('h3',dueOnly?b('Şimdilik tamam.','All caught up.'):b('İlk ezberine yer aç.','Make room for your first text.')),el('p',b('Şiirini, ayetini veya metnini ekle. Her satır bir çalışma parçası olur.','Add a poem, verse or passage. Each line becomes a practice step.')));if(!dueOnly)empty.append(btn(b('Örnek şiirle dene','Try a sample poem'),()=>{const m={id:crypto.randomUUID(),title:'Âtiyi karanlık görerek · Mehmet Âkif',kind:'poem',text:'Âtiyi karanlık görerek azmi bırakmak...\nAlçak bir ölüm varsa, emînim, budur ancak.\nDünyâda inanmam, hani görsem de gözümle.\nİmânı olan kimse gebermez bu ölümle:',level:0,due:0,reviews:0};save(ms=>ms.push(m));study(m);}));list.append(empty);}
   for(const m of memos){const card=el('article',undefined,'memo-card');card.append(el('small',m.kind==='poem'?b('ŞİİR','POEM'):m.kind==='verse'?b('AYET','VERSE'):b('METİN','TEXT')),el('h3',m.title),el('p',splitLines(m.text)[0],'memo-preview'),el('p',`${splitLines(m.text).length} ${b('satır','lines')} · ${m.due<=Date.now()?b('Tekrar zamanı','Ready to review'):new Date(m.due).toLocaleDateString(b('tr-TR','en-GB'))}`,'memo-muted'));const actions=el('div',undefined,'memo-actions');actions.append(btn(b('Çalış →','Practice →'),()=>study(m),'button primary'),btn(b('Düzenle','Edit'),()=>{editing=m.id;screen='editor';render();}));card.append(actions);list.append(card);}return;
  }
  const m=current();if(!m){library();return;}const lines=splitLines(m.text);
  root.append(el('h2',m.title));
  if(screen==='done'){
   const card=el('div',undefined,'memo-card memo-done');card.append(el('div','✓','memo-seal'),el('h3',b('Bir tur tamamlandı.','One round complete.')),el('p',b('Metni yardım almadan ne kadar hatırladın? Sonraki tekrarını buna göre planlayalım.','How well did you recall it without help? Plan the next review.')));
   const actions=el('div',undefined,'memo-actions');for(const [r,tr,en] of [['again','Tekrar · 10 dk','Again · 10 min'],['hard','Zorlandım','With effort'],['easy','Rahat hatırladım','Recalled easily']])actions.append(btn(b(tr,en),()=>{save(ms=>{const i=ms.findIndex(x=>x.id===m.id);ms[i]=reviewed(ms[i],r);});library();}));card.append(actions);root.append(card);return;
  }
  const toolbar=el('div',undefined,'memo-actions');
  for(const [i,tr,en] of [[0,'Oku','Read'],[1,'Az gizle','Hide some'],[2,'Çok gizle','Hide more'],[3,'Tam gizle','Hide all']]){const x=btn(b(tr,en),()=>{stage=i;revealed=false;render();});x.setAttribute('aria-pressed',String(stage===i));toolbar.append(x);}root.append(toolbar);
  const toggle=btn(b('Biriktirerek çalış','Cumulative practice'),()=>{cumulative=!cumulative;revealed=false;render();});toggle.setAttribute('aria-pressed',String(cumulative));root.append(toggle);
  const paper=el('div',undefined,'memo-paper');paper.setAttribute('aria-label',b('Ezber metni','Practice text'));
  const visible=cumulative?lines.slice(0,line+1):[lines[line]];
  for(const text of visible){const row=el('p');row.dir='auto';text.split(/(\s+)/).forEach((word,i)=>{if(!word.trim()){row.append(document.createTextNode(word));return;}if(stage&&!revealed&&hiddenWord(i/2,stage)){const chip=btn('•••',()=>{chip.textContent=word;chip.classList.add('memo-peek');},'memo-mask');chip.setAttribute('aria-label',b('Kelimeyi göster','Reveal word'));row.append(chip);}else row.append(document.createTextNode(word));});paper.append(row);}root.append(paper);
  const actions=el('div',undefined,'memo-actions memo-navigation');const prev=btn(b('← Önceki','← Previous'),()=>{line--;revealed=false;render();});prev.disabled=line===0;actions.append(prev,el('span',`${line+1} / ${lines.length}`,'memo-muted'),btn(revealed?b('Yeniden gizle','Hide again'):b('Kontrol et','Check text'),()=>{revealed=!revealed;render();}),btn(line===lines.length-1?b('Turu tamamla ✓','Finish round ✓'):b('Sonraki →','Next →'),()=>{if(line===lines.length-1)screen='done';else line++;revealed=false;render();},'button primary'));root.append(actions,el('p',b('Önce ezberinden söyle. Takıldığında gizli kelimeye dokun.','Recall aloud first. Tap a hidden word when you need a hint.'),'memo-muted'));
 }
 function editor(){
  const m=store.state.memos.find(x=>x.id===editing);root.append(el('h2',m?b('Metni düzenle','Edit text'):b('Yeni bir ezber','A new memory')));
  const form=el('form',undefined,'memo-card memo-form');
  function field(label,input){const l=el('label',label);l.append(input);form.append(l);return input;}
  const title=field(b('Başlık','Title'),el('input'));title.required=true;title.maxLength=120;title.value=m?.title||'';
  const kind=field(b('Tür','Type'),el('select'));for(const [v,tr,en] of [['poem','Şiir','Poem'],['verse','Ayet','Verse'],['text','Metin','Text']]){const o=el('option',b(tr,en));o.value=v;kind.append(o);}kind.value=m?.kind||'poem';
  const text=field(b('Metin · Her parçayı ayrı satıra yaz','Text · Put each practice part on a separate line'),el('textarea'));text.required=true;text.maxLength=30000;text.rows=10;text.dir='auto';text.value=m?.text||'';
  form.append(el('p',b('Ayetleri harekeleriyle yapıştırabilirsin; metnin aynen korunur. Değiştirdiğin metnin tekrar ilerlemesi sıfırlanır.','Paste verses with their diacritics; your text is preserved. Editing the text resets its review progress.'),'memo-muted'));
  const actions=el('div',undefined,'memo-actions'),submit=el('button',b('Kaydet','Save'),'button primary');submit.type='submit';actions.append(submit,btn(b('Vazgeç','Cancel'),library));if(m)actions.append(btn(b('Sil','Delete'),()=>{if(window.confirm(b('Bu ezber silinsin mi?','Delete this text?'))){save(ms=>ms.splice(ms.findIndex(x=>x.id===m.id),1));library();}}));form.append(actions);
  form.onsubmit=e=>{e.preventDefault();if(!title.value.trim()||!splitLines(text.value).length)return;safe(()=>{const changed=!m||m.text!==text.value;const item={id:m?.id||crypto.randomUUID(),title:title.value.trim(),kind:kind.value,text:text.value,level:changed?0:m.level,due:changed?0:m.due,reviews:changed?0:m.reviews};save(ms=>{const i=ms.findIndex(x=>x.id===item.id);if(i<0)ms.push(item);else ms[i]=item;});library();});};root.append(form);title.focus();
 }
 function sync(){const open=!!store.state.memoView;root.hidden=!open;document.body.classList.toggle('memo-active',open);tab.classList.toggle('active',open);tab.setAttribute('aria-pressed',String(open));const sig=JSON.stringify(store.state.memos);if(open&&(last!==sig||!root.childElementCount))render();last=sig;}
 tab.onclick=()=>safe(()=>store.update(d=>{d.memoView=true;d.prayerHub=false;}));
 const unsub=store.subscribe(sync);const language=()=>render();document.addEventListener('ikra-language',language);sync();
 return {dispose(){unsub();document.removeEventListener('ikra-language',language);root.remove();tab.remove();document.body.classList.remove('memo-active');}};
}
