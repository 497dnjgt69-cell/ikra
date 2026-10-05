import {bilingual,localizedText,localizedAttribute} from '../i18n/bindings.js';
import {normalizeDock} from '../core/dock.js';
export function createDockCustomizer({store,dock}){
 const labels={tasks:['Planım','My plan'],history:['İstatistikler','Statistics'],anki:['Anki','Anki'],sounds:['Mekânlar','Places'],settings:['Ayarlar','Settings'],peek:['Vakitler','Prayer times'],progress:['İlerleme','Progress']};
 const buttons=new Map([...dock.querySelectorAll('[data-dock-id]')].map(b=>[b.dataset.dockId,b]));
 const make=(tag,tr,en,cls='')=>{const e=document.createElement(tag);e.className=cls;if(tr)localizedText(e,()=>bilingual(tr,en));return e;};
 const section=make('section',null,null,'settings-section dock-settings');section.id='dock-editor';
 const header=make('div',null,null,'dock-settings-heading');header.append(make('h3','Dock kısmını düzenle','Customize your dock'));
 const edit=make('button','Düzenle','Edit','button');edit.id='dock-edit';edit.type='button';header.append(edit);
 const hint=make('p','Düzenle’ye dokun. İkonları sürükle, − ile kaldır, + ile ekle. Klavyede Alt + ok tuşlarıyla sırala.','Tap Edit. Drag icons, remove with −, add with +. Use Alt + arrow keys to reorder with a keyboard.','quiet');
 const preview=make('div',null,null,'dock-icon-preview');preview.id='dock-preview';
 const available=make('div',null,null,'dock-available');
 const reset=make('button','Varsayılan düzen','Default layout','button');reset.type='button';reset.id='dock-reset';
 const status=make('p');status.setAttribute('role','status');status.className='quiet';
 section.append(header,hint,preview,available,reset,status);document.querySelector('#panel-settings .settings').append(section);
 let editing=false,last='',drag=null;
 function save(prefs,focusId){try{store.update(d=>{d.dock=normalizeDock(prefs);});localizedText(status,()=>bilingual('Kaydedildi.','Saved.'));if(focusId)preview.querySelector(`[data-tool="${focusId}"]`)?.focus();}catch{last='';render();localizedText(status,()=>bilingual('Kaydedilemedi. Tekrar dene.','Could not save. Try again.'));}}
 function move(id,target){const prefs=normalizeDock(store.state.dock);const after=prefs.order.indexOf(id)<prefs.order.indexOf(target);prefs.order=prefs.order.filter(x=>x!==id);prefs.order.splice(Math.max(0,prefs.order.indexOf(target)+(after?1:0)),0,id);save(prefs,id);}
 function render(){
  const prefs=normalizeDock(store.state.dock),signature=JSON.stringify(prefs)+editing;
  if(last===signature)return;last=signature;
  for(const id of prefs.order){const b=buttons.get(id);if(b){b.hidden=prefs.hidden.includes(id);dock.append(b);}}
  section.classList.toggle('is-editing',editing);edit.setAttribute('aria-pressed',String(editing));localizedText(edit,()=>editing?bilingual('Bitti','Done'):bilingual('Düzenle','Edit'));
  preview.replaceChildren();available.replaceChildren();available.hidden=!editing;
  for(const id of prefs.order.filter(x=>!prefs.hidden.includes(x))){
   const tile=make('div',null,null,'dock-icon-tile');tile.dataset.dockTool=id;
   const item=make('button');item.type='button';item.dataset.tool=id;item.className='dock-icon-grip';
   const svg=buttons.get(id)?.querySelector('svg');if(svg)item.append(svg.cloneNode(true));item.append(make('span',...labels[id]));
   localizedAttribute(item,'aria-label',()=>bilingual(...labels[id])+bilingual(' · Sürükle veya Alt + ok tuşlarıyla taşı',' · Drag or use Alt + arrow keys'));
   item.onpointerdown=e=>{if(!editing||e.button!==0)return;drag={id,pointer:e.pointerId,target:null};item.setPointerCapture?.(e.pointerId);tile.classList.add('dragging');};
   item.onpointermove=e=>{if(!drag||drag.id!==id)return;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-dock-tool]');drag.target=target?.dataset.dockTool;preview.querySelectorAll('.drop-target').forEach(n=>n.classList.remove('drop-target'));if(target&&drag.target!==id)target.classList.add('drop-target');};
   item.onpointerup=()=>{if(!drag)return;const target=drag.target;drag=null;tile.classList.remove('dragging');preview.querySelectorAll('.drop-target').forEach(n=>n.classList.remove('drop-target'));if(target&&target!==id)move(id,target);};
   item.onpointercancel=()=>{drag=null;tile.classList.remove('dragging');};
   item.onkeydown=e=>{if(!editing||!e.altKey||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const p=normalizeDock(store.state.dock),at=p.order.indexOf(id),next=at+(e.key==='ArrowLeft'?-1:1);if(next<0||next>=p.order.length)return;[p.order[at],p.order[next]]=[p.order[next],p.order[at]];save(p,id);};
   tile.append(item);
   if(editing&&id!=='settings'){const remove=make('button');remove.type='button';remove.className='dock-remove';remove.dataset.remove=id;remove.textContent='−';localizedAttribute(remove,'aria-label',()=>bilingual(...labels[id])+bilingual(' kaldır',' remove'));remove.onclick=()=>{const p=normalizeDock(store.state.dock);p.hidden.push(id);save(p);};tile.append(remove);}
   preview.append(tile);
  }
  if(editing){available.append(make('small','Eklenebilecek araçlar','Available tools'));for(const id of prefs.hidden){const add=make('button',`+ ${labels[id][0]}`,`+ ${labels[id][1]}`,'button');add.type='button';add.dataset.add=id;add.onclick=()=>{const p=normalizeDock(store.state.dock);p.hidden=p.hidden.filter(x=>x!==id);save(p);};available.append(add);}if(!prefs.hidden.length)available.append(make('small','Bütün araçlar dock’ta.','All tools are in your dock.'));}
 }
 edit.onclick=()=>{editing=!editing;render();};reset.onclick=()=>save(null);
 const unsubscribe=store.subscribe(render);render();return {dispose:unsubscribe};
}
