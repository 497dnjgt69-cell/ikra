import {newId} from '../shared/format.js';
import {bilingual as b} from '../i18n/bindings.js';
import {BOOK_STATUSES, normalizeBooks, safeCover} from '../core/books.js';

// Retain the legacy prayerHub navigation flag so Focus, Clock and Memo remain exclusive.
export function createLibrary({store}) {
  const root=document.createElement('section');root.id='library-hub';root.dataset.i18nManaged='';root.hidden=true;
  document.querySelector('.hero').append(root);
  const tab=document.querySelector('#prayerstart');tab.setAttribute('aria-controls',root.id);
  const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
  const button=(text,fn,cls='button')=>{const node=el('button',text,cls);node.type='button';node.onclick=fn;return node;};
  const statusText=status=>({shelf:b('Rafta','On shelf'),reading:b('Şu anda okuyorum','Currently reading'),read:b('Okundu','Read')})[status];
  let filter='all',last='',editing=false,disposed=false;
  function persist(item) {
    store.update(d=>{const index=d.books.findIndex(x=>x.id===item.id);if(index<0)d.books.push(item);else d.books[index]=item;});
  }
  function render() {
    root.replaceChildren();editing=false;
    const header=el('div',undefined,'library-heading');header.append(el('div',b('KİŞİSEL KİTAPLIĞIN','YOUR PERSONAL LIBRARY'),'library-eyebrow'),button(b('+ Kitap ekle','+ Add book'),()=>editor(), 'button primary'));root.append(header);
    const filters=el('div',undefined,'library-filters');filters.setAttribute('aria-label',b('Okuma durumu','Reading status'));
    for(const value of ['all',...BOOK_STATUSES]){const count=store.state.books.filter(book=>value==='all'||book.status===value).length;const control=button(`${value==='all'?b('Tümü','All'):statusText(value)} · ${count}`,()=>{filter=value;render();root.querySelector(`[data-filter="${value}"]`).focus();});control.dataset.filter=value;control.setAttribute('aria-pressed',String(filter===value));filters.append(control);}root.append(filters);
    const shelf=el('div',undefined,'library-shelf');root.append(shelf);
    const books=store.state.books.filter(book=>filter==='all'||book.status===filter);
    if(!books.length){const empty=el('div',undefined,'library-empty');empty.append(el('div','▤','library-empty-icon'),el('h2',store.state.books.length?b('Bu rafta henüz kitap yok.','No books on this shelf yet.'):b('İlk kitabına yer aç.','Make room for your first book.')),el('p',b('Kapaklarını ekle, kaldığın sayfayı kaydet. Hikâyen burada devam etsin.','Add covers and save your page. Let your story continue here.')));shelf.append(empty);}
    books.forEach((book,index)=>{
      const card=el('article',undefined,'library-book');card.style.setProperty('--book-delay',`${Math.min(index,10)*55}ms`);
      const cover=button('',()=>{const expanded=card.classList.toggle('is-expanded');cover.setAttribute('aria-expanded',String(expanded));},'library-cover');
      cover.setAttribute('aria-label',`${book.title} · ${b('Kitap bilgilerini göster','Show book details')}`);cover.setAttribute('aria-expanded','false');
      const detailId=`book-details-${index}`;cover.setAttribute('aria-controls',detailId);
      const fallback=el('span',undefined,'library-cover-art');fallback.style.setProperty('--book-hue',String([...book.title].reduce((n,c)=>n+c.charCodeAt(0),0)%360));fallback.append(el('small','IKRA · '+b('KİTAPLIK','LIBRARY')),el('strong',book.title),el('span',book.author||b('Yazar eklenmedi','Author not added')));cover.append(fallback);
      if(book.cover){const image=el('img');image.src=book.cover;image.alt='';image.loading='lazy';image.referrerPolicy='no-referrer';image.onerror=()=>image.remove();cover.append(image);}
      const info=el('div',undefined,'library-book-info');info.id=detailId;
      info.append(el('span',statusText(book.status),`library-badge status-${book.status}`),el('h3',book.title),el('p',book.author||b('Yazar eklenmedi','Author not added'),'library-author'),el('p',book.summary||b('Bu kitap için henüz özet eklenmedi.','No summary added for this book yet.'),'library-summary'));
      const progress=el('div',undefined,'library-progress');progress.append(el('strong',b(`Kaldığım sayfa · ${book.page}${book.total?' / '+book.total:''}`,`Current page · ${book.page}${book.total?' / '+book.total:''}`)));
      if(book.total){const meter=el('progress');meter.max=book.total;meter.value=book.page;meter.setAttribute('aria-label',b('Okuma ilerlemesi','Reading progress'));progress.append(meter);}info.append(progress,button(b('Düzenle · Sayfayı güncelle','Edit · Update page'),()=>editor(book)));
      const close=button(b('Kapağa dön','Back to cover'),()=>{card.classList.remove('is-expanded');cover.setAttribute('aria-expanded','false');document.activeElement?.blur();},'library-close');info.append(close);
      card.append(cover,info);card.onkeydown=e=>{if(e.key==='Escape'){card.classList.remove('is-expanded');cover.setAttribute('aria-expanded','false');cover.blur();}};
      shelf.append(card);
    });
  }
  function editor(book) {
    editing=true;root.replaceChildren();
    root.append(el('h2',book?b('Kitabını düzenle','Edit your book'):b('Rafına yeni bir kitap','A new book for your shelf')));
    const form=el('form',undefined,'library-form');const fields={};
    const field=(name,label,tag='input')=>{const wrapper=el('label',label),input=el(tag);input.name=name;input.id='book-'+name;input.setAttribute('aria-label',label);wrapper.append(input);form.append(wrapper);fields[name]=input;return input;};
    const title=field('title',b('Kitap adı','Book title'));title.required=true;title.maxLength=150;title.value=book?.title||'';
    const author=field('author',b('Yazar','Author'));author.maxLength=150;author.value=book?.author||'';
    const summary=field('summary',b('Kısa özet · 2–3 cümle','Short summary · 2–3 sentences'),'textarea');summary.maxLength=900;summary.rows=3;summary.value=book?.summary||'';
    for(const [name,label] of [['page',b('Kaldığım sayfa','Current page')],['total',b('Toplam sayfa · Bilmiyorsan boş bırak','Total pages · Leave blank if unknown')]]){const input=field(name,label);input.type='number';input.min='0';input.max='100000';input.step='1';input.value=book?.[name]||'';}
    const status=field('status',b('Okuma durumu','Reading status'),'select');BOOK_STATUSES.forEach(value=>{const option=el('option',statusText(value));option.value=value;status.append(option);});status.value=book?.status||'shelf';
    const cover=field('cover',b('Kapak bağlantısı · HTTPS','Cover URL · HTTPS'));cover.type='url';cover.placeholder='https://…';cover.maxLength=2000;cover.value=book?.cover?.startsWith('https:')?book.cover:'';
    const upload=field('upload',b('Veya kapak yükle · JPG, PNG, WebP · En fazla 500 KB','Or upload cover · JPG, PNG, WebP · Up to 500 KB'));upload.type='file';upload.accept='image/jpeg,image/png,image/webp';
    let uploaded=book?.cover?.startsWith('data:')?book.cover:'';
    const feedback=el('p','','library-feedback');feedback.setAttribute('role','status');form.append(feedback);
    const actions=el('div',undefined,'library-actions');const save=el('button',b('Kaydet','Save'),'button primary');save.type='submit';actions.append(save,button(b('Vazgeç','Cancel'),()=>{render();root.querySelector('.library-heading button').focus();}));form.append(actions);
    const removeCover=button(b('Kapağı kaldır','Remove cover'),()=>{uploaded='';cover.value='';upload.value='';feedback.textContent=b('Kapak kaydedince kaldırılacak.','Cover will be removed when saved.');});actions.append(removeCover);
    cover.oninput=()=>{cover.setCustomValidity('');uploaded='';upload.value='';};
    fields.page.oninput=()=>fields.page.setCustomValidity('');fields.total.oninput=()=>fields.page.setCustomValidity('');
    upload.onchange=async()=>{
      const file=upload.files[0];if(!file)return;
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>500000){feedback.textContent=b('500 KB altında bir JPG, PNG veya WebP seç.','Choose a JPG, PNG or WebP under 500 KB.');upload.value='';return;}
      save.disabled=true;removeCover.disabled=true;cover.disabled=true;
      try{const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});if(!safeCover(data))throw Error();uploaded=data;cover.value='';feedback.textContent=b('Kapak hazır. Kaydet’e bas.','Cover ready. Press Save.');}catch{feedback.textContent=b('Kapak okunamadı. Tekrar dene.','Could not read cover. Try again.');}finally{save.disabled=false;removeCover.disabled=false;cover.disabled=false;}
    };
    form.onsubmit=e=>{
      e.preventDefault();if(disposed||save.disabled||!title.value.trim())return;
      const page=Number(fields.page.value)||0,total=Number(fields.total.value)||0;
      if(total&&page>total){fields.page.setCustomValidity(b('Kaldığın sayfa toplam sayfayı aşamaz.','Current page cannot exceed total pages.'));fields.page.reportValidity();return;}
      const image=uploaded||cover.value.trim();if(image&&!safeCover(image)){cover.setCustomValidity(b('Geçerli bir HTTPS kapak bağlantısı gir.','Enter a valid HTTPS cover URL.'));cover.reportValidity();return;}
      const item=normalizeBooks([{id:book?.id||newId(),title:title.value,author:author.value,summary:summary.value,page,total,status:status.value,cover:image}])[0];
      try{persist(item);filter='all';render();root.querySelector('.library-heading button').focus();}catch{feedback.textContent=b('Kaydedilemedi. Depolama alanını kontrol et veya daha küçük bir kapak seç.','Could not save. Check storage or choose a smaller cover.');}
    };
    root.append(form);title.focus();
  }
  function sync(){const open=!!store.state.prayerHub,opening=open&&root.hidden;root.hidden=!open;document.body.classList.toggle('prayer-hub-active',open);tab.classList.toggle('active',open);tab.setAttribute('aria-pressed',String(open));const signature=JSON.stringify(store.state.books);if(open&&(opening||(!editing&&last!==signature)||!root.childElementCount))render();last=signature;}
  const unsubscribe=store.subscribe(sync);
  // Keep unsaved form input intact when switching the interface language.
  const language=()=>{if(!root.hidden&&!editing)render();};document.addEventListener('ikra-language',language);sync();
  return {dispose(){disposed=true;unsubscribe();document.removeEventListener('ikra-language',language);document.body.classList.remove('prayer-hub-active');root.remove();}};
}
