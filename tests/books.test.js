import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createLibrary} from '../js/ui/library.js';
import {safeCover,normalizeBooks} from '../js/core/books.js';
import {createStore} from '../js/services/store.js';
import {normalizeBackup} from '../js/core/backup-validation.js';
import {fresh} from '../js/core/default-state.js';
import {isDateKey} from '../js/shared/format.js';
import {prayerNames} from '../js/domain/prayer-timer.js';

test('library creation, page validation, editing, touch details, filters and backup round trip',()=>{
 const dom=new JSDOM('<div class="hero"><button id="prayerstart"></button></div>',{url:'https://example.test'});
 globalThis.window=dom.window;globalThis.document=dom.window.document;window.ikraLanguage=()=> 'tr';
 const store=createStore({storage:window.localStorage});const library=createLibrary({store});
 try{
  store.update(d=>{d.prayerHub=true;});
  const $=s=>document.querySelector(s);const click=text=>{const btn=[...document.querySelectorAll('button')].find(x=>x.textContent===text);assert.ok(btn,text);btn.click();};
  const submit=()=>$('.library-form').dispatchEvent(new window.Event('submit',{cancelable:true}));
  click('+ Kitap ekle');$('#book-title').value='<img src=x onerror=alert(1)>';$('#book-author').value='Test Author';$('#book-summary').value='First sentence. Second sentence.';$('#book-total').value='300';$('#book-page').value='301';submit();assert.equal(store.state.books.length,0);
  $('#book-page').value='124';$('#book-page').dispatchEvent(new window.Event('input'));$('#book-status').value='reading';submit();
  assert.equal(store.state.books.length,1);assert.equal($('.library-book-info h3').textContent,'<img src=x onerror=alert(1)>');assert.equal(document.querySelectorAll('#library-hub img').length,0);
  $('.library-cover').click();assert.equal($('.library-cover').getAttribute('aria-expanded'),'true');assert.ok($('.library-book-info').textContent.includes('124 / 300'));assert.ok($('.library-book-info').textContent.includes('First sentence. Second sentence.'));
  click('Düzenle · Sayfayı güncelle');$('#book-page').value='300';$('#book-status').value='read';submit();assert.equal(store.state.books[0].status,'read');
  click('Şu anda okuyorum · 0');assert.equal($('.library-book'),null);click('Okundu · 1');assert.ok($('.library-book'));
  const restored=createStore({storage:window.localStorage});assert.deepEqual(restored.state.books,store.state.books);
  assert.deepEqual(normalizeBackup({data:store.state},{fresh,isDateKey,names:prayerNames}).books,store.state.books);
  window.ikraLanguage=()=> 'en';document.dispatchEvent(new window.Event('ikra-language'));assert.equal($('.library-badge').textContent,'Read');
  store.update(d=>{d.prayerHub=false;});assert.equal($('#library-hub').hidden,true);
 }finally{library.dispose();dom.window.close();delete globalThis.window;delete globalThis.document;}
});
test('covers reject executable URLs and malformed records recover safely',()=>{
 for(const cover of ['javascript:alert(1)','data:image/svg+xml,<svg/>','http://example.com/a.png','https://user:pass@example.com/a.png'])assert.equal(safeCover(cover),'');
 assert.equal(safeCover('https://example.com/cover.jpg'),'https://example.com/cover.jpg');
 assert.deepEqual(normalizeBooks([null,{}]),[]);
 const [book]=normalizeBooks([{id:'a',title:'Book',page:400,total:200,status:'bad',cover:'javascript:evil()'},{id:'a',title:'duplicate'}]);
 assert.equal(book.page,200);assert.equal(book.status,'shelf');assert.equal(book.cover,'');
});
