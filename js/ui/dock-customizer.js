import { bilingual, localizedText, localizedAttribute } from '../i18n/bindings.js';
import { normalizeDock } from '../core/dock.js';

export function createDockCustomizer({store,dock}) {
  const labels={tasks:['Planım','My plan'],prayer:['Namaz','Prayer'],history:['İstatistikler','Statistics'],anki:['Anki','Anki'],sounds:['Mekânlar','Places'],settings:['Ayarlar','Settings'],peek:['Vakitler','Prayer times'],progress:['İlerleme','Progress']};
  const buttons=new Map([...dock.querySelectorAll('[data-dock-id]')].map(b=>[b.dataset.dockId,b]));
  const make=(tag,tr,en,cls='')=>{const e=document.createElement(tag);e.className=cls;if(tr)localizedText(e,()=>bilingual(tr,en));return e;};
  const edit=make('button','Menüyü düzenle','Edit menu','button dock-edit');edit.type='button';edit.id='dock-edit';edit.setAttribute('aria-haspopup','dialog');edit.setAttribute('aria-controls','dock-editor');edit.setAttribute('aria-expanded','false');dock.append(edit);
  const dialog=make('dialog',null,null,'glass-dialog dock-editor');dialog.id='dock-editor';dialog.setAttribute('aria-labelledby','dock-editor-title');
  const shell=make('div',null,null,'dialog-shell'),top=make('div',null,null,'dialog-top'),title=make('h2','Menün, senin düzenin.','Your menu, your way.');title.id='dock-editor-title';
  const close=make('button','Tamam','Done','button primary');close.type='button';close.onclick=()=>window.closePanel(dialog);top.append(title,close);
  const intro=make('p','Görmek istediğin araçları seç. Oklarla sırala; değişiklikler otomatik kaydedilir.','Choose the tools you want to see. Use the arrows to reorder; changes save automatically.','quiet');
  const preview=make('div',null,null,'dock-preview');preview.setAttribute('aria-label','Menu preview');
  const list=make('div',null,null,'dock-editor-list'),status=make('p');status.setAttribute('role','status');
  const reset=make('button','Varsayılana dön','Restore defaults','button');reset.type='button';reset.id='dock-reset';
  shell.append(top,intro,preview,list,reset,status);dialog.append(shell);document.body.append(dialog);
  let current='';
  function save(value,focusId){try{store.update(d=>{d.dock=normalizeDock(value);});localizedText(status,()=>bilingual('Kaydedildi.','Saved.'));if(focusId)dialog.querySelector(`[data-control="${focusId}"]`)?.focus();}catch{current="";render();localizedText(status,()=>bilingual('Kaydedilemedi. Tekrar dene.','Could not save. Try again.'));}}
  function render(){
    const state=normalizeDock(store.state.dock),signature=JSON.stringify(state);
    if(signature===current)return;current=signature;
    for(const id of state.order){const b=buttons.get(id);if(b){b.hidden=state.hidden.includes(id);dock.insertBefore(b,edit);}}
    preview.replaceChildren();list.replaceChildren();
    for(const id of state.order.filter(id=>!state.hidden.includes(id)))preview.append(make('span',...labels[id],'dock-preview-chip'));
    if(state.hidden.length===state.order.length)preview.append(make('span','Menüyü düzenle düğmesi her zaman burada kalır.','The Edit menu button always stays available.'));
    state.order.forEach((id,index)=>{
      const row=make('div',null,null,'dock-editor-row'),label=make('label'),check=make('input');check.type='checkbox';check.checked=!state.hidden.includes(id);check.dataset.control=id+'-show';
      check.onchange=()=>{const next=normalizeDock(store.state.dock);next.hidden=check.checked?next.hidden.filter(x=>x!==id):[...next.hidden,id];save(next,id+'-show');};label.append(check,make('span',...labels[id]));row.append(label);
      for(const [delta,symbol,tr,en] of [[-1,'↑','Öne al','Move earlier'],[1,'↓','Sona al','Move later']]){
        const b=make('button',null,null,'button');b.type='button';b.textContent=symbol;b.dataset.control=id+(delta===-1?'-up':'-down');b.disabled=index+delta<0||index+delta>=state.order.length;
        localizedAttribute(b,'aria-label',()=>bilingual(...labels[id])+' · '+bilingual(tr,en));
        b.onclick=()=>{const next=normalizeDock(store.state.dock),at=next.order.indexOf(id);[next.order[at],next.order[at+delta]]=[next.order[at+delta],next.order[at]];save(next,b.dataset.control);};row.append(b);
      }list.append(row);
    });
  }
  edit.onclick=()=>{render();dialog.showModal();edit.setAttribute('aria-expanded','true');};
  dialog.addEventListener('close',()=>edit.setAttribute('aria-expanded','false'));
  dialog.addEventListener('cancel',e=>{e.preventDefault();window.closePanel(dialog);});
  dialog.addEventListener('click',e=>{if(e.target===dialog)window.closePanel(dialog);});
  reset.onclick=()=>save(null);
  const unsubscribe=store.subscribe(render);render();
  return {dispose:unsubscribe};
}
