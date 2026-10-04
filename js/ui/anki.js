import { bilingual, localizedText, t } from '../i18n/bindings.js';
import { display } from '../shared/format.js';
import { summarizeAnki } from '../core/anki.js';
import { aggregateStats } from '../core/statistics.js';

export function createAnkiView({store, api}) {
  const root = document.querySelector('#statistics-anki');
  root.replaceChildren();
  function node(tag, tr, en, className='') {
    const el=document.createElement(tag); el.className=className;
    if (tr) localizedText(el,()=>bilingual(tr,en));
    return el;
  }
  root.append(node('h3','Anki tekrarların','Your Anki reviews'));
  const description=node('p','Masaüstü Anki’den tekrar sayını, çalıştığın kartları ve çalışma süreni getir.','Import review counts, studied cards and study time from desktop Anki.','quiet');
  const setup=node('details'); setup.className='anki-setup';
  setup.append(node('summary','Bağlantı nasıl kurulur?','How do I connect?'));
  const steps=node('ol');
  for (const [tr,en] of [
    ['Bilgisayarında Anki’yi aç. Tools → Add-ons → Get Add-ons bölümünden 2055492159 koduyla AnkiConnect’i kur ve Anki’yi yeniden başlat.','Open Anki on your computer. Install AnkiConnect using code 2055492159 in Tools → Add-ons → Get Add-ons, then restart Anki.'],
    ['Anki açıkken “Anki’den getir” düğmesine bas. Anki’nin IKRA erişim isteğini ve tarayıcının yerel ağ iznini onayla.','With Anki open, click “Sync from Anki”. Accept the IKRA access request in Anki and your browser’s local network permission.'],
    ['Telefondaki çalışmalar için önce AnkiWeb ile eşitle, ardından masaüstü Anki’yi eşitle ve burada verileri getir. AnkiMobile ve AnkiWeb’e doğrudan bağlanılmaz.','For phone reviews, sync with AnkiWeb, sync desktop Anki, then refresh here. There is no direct connection to AnkiMobile or AnkiWeb.'],
  ]) steps.append(node('li',tr,en));
  setup.append(steps);
  const link=node('a','AnkiConnect eklentisi','AnkiConnect add-on'); link.href='https://ankiweb.net/shared/info/2055492159'; link.target='_blank'; link.rel='noopener noreferrer'; setup.append(link);
  const keyLabel=node('label','API anahtarı (yalnızca AnkiConnect’te ayarladıysan)','API key (only if configured in AnkiConnect)');
  const key=node('input'); key.type='password'; key.autocomplete='off'; key.className='field'; key.id='anki-api-key'; keyLabel.append(key); setup.append(keyLabel);
  const sync=node('button','Anki’den getir','Sync from Anki','button primary'); sync.type='button'; sync.id='anki-sync';
  const status=node('p'); status.id='anki-status'; status.setAttribute('role','status');
  const metadata=node('p'); metadata.className='quiet';
  const summary=node('div'); summary.className='stat-summary'; summary.id='anki-summary';
  const history=node('div'); history.className='subjects'; history.id='anki-days';
  const note=node('p','Anki süreleri Focus toplamına ve Focus Streak’e eklenmez. Günler cihazının yerel takvimine göre gösterilir; Anki’nin gün başlangıcı farklı olabilir. Veriler son başarılı eşitlemeye aittir.','Anki time stays separate from Focus totals and Focus Streak. Days use your device’s local calendar; Anki’s day cutoff may differ. Data reflects the last successful sync.','quiet');
  root.append(description,setup,sync,status,metadata,summary,history,note);
  let busy=false, disposed=false;
  sync.onclick=async()=>{
    if(busy) return;
    busy=true; sync.disabled=true; root.setAttribute('aria-busy','true');
    const previous=store.state.anki;
    localizedText(status,()=>bilingual('Anki’ye bağlanılıyor… Anki’deki izin penceresini kontrol et.','Connecting… Check Anki for a permission request.'));
    try {
      const snapshot=await api.sync({key:key.value.trim(),onProgress:(done,total)=>{
        if(!disposed) localizedText(status,()=>bilingual(`${done}/${total} kart okundu…`,`${done}/${total} cards read…`));
      }});
      if(disposed) return;
      // A backup restore during the request must not be overwritten.
      if(JSON.stringify(previous)!==JSON.stringify(store.state.anki)) throw Error('changed');
      store.update(d=>{d.anki=snapshot;});
      localizedText(status,()=>bilingual('Anki verileri güncellendi.','Anki data updated.'));
    } catch(error) {
      if(disposed) return;
      const copy=error.message==='key'
        ? ['AnkiConnect API anahtarını gir.','Enter your AnkiConnect API key.']
        : error.message==='permission'
        ? ['Anki’de IKRA bağlantısına izin ver.','Allow IKRA to connect in Anki.']
        : ['Eşitleme tamamlanamadı; önceki verilerin korundu. Anki’nin açık olduğunu, AnkiConnect kurulumunu ve bağlantı izinlerini kontrol edip tekrar dene.','Sync failed; your previous data was kept. Check that Anki is open, AnkiConnect is installed and connection permissions are enabled, then retry.'];
      localizedText(status,()=>bilingual(...copy));
    } finally {busy=false; sync.disabled=false; root.removeAttribute('aria-busy');}
  };
  function render() {
    const snapshot=store.state.anki;
    localizedText(metadata,()=>snapshot
      ? `${snapshot.profile} · ${bilingual('Son eşitleme: ','Last sync: ')}${new Date(snapshot.syncedAt).toLocaleString(window.ikraLocale(),{dateStyle:'medium',timeStyle:'short'})}`
      : bilingual('Henüz veri yok. Bağlantı adımlarını açarak başlayabilirsin.','No data yet. Open the connection steps to get started.'));
    const anchor=store.state.statsAnchor ? new Date(store.state.statsAnchor+'T12:00:00') : new Date();
    const range=aggregateStats([],store.state.statsView||'all',anchor);
    const result=summarizeAnki(snapshot,range.start,range.end);
    summary.replaceChildren(); history.replaceChildren();
    for(const [value,tr,en] of [[result.count,'Tekrar','Reviews'],[result.cards,'Farklı kart','Unique cards'],[t(display(result.seconds)),'Çalışma süresi','Study time'],[result.days,'Aktif gün','Active days'],[result.again,'Tekrar yanıtı (Again)','Again answers']]) {
      const box=node('div'), amount=node('strong'); amount.textContent=String(value);
      box.append(amount,node('span',tr,en)); summary.append(box);
    }
    history.append(node('h4','Günlük tekrarlar (son 30 aktif gün)','Daily reviews (last 30 active days)'));
    for(const [day,count] of result.daily.slice(-30).reverse()) {
      const row=node('div'), label=node('span'), amount=node('strong');
      label.textContent=new Date(day+'T12:00:00').toLocaleDateString(window.ikraLocale(),{dateStyle:'medium'});
      amount.textContent=String(count); row.append(label,amount); history.append(row);
    }
    if(!result.count) history.append(node('p','Bu dönemde Anki tekrarı yok.','No Anki reviews in this period.','quiet'));
  }
  return {render,dispose(){disposed=true;key.value='';}};
}
