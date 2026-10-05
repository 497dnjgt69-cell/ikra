import { bilingual, localizedText, t } from '../i18n/bindings.js';
import { display } from '../shared/format.js';
import { summarizeAnki, ankiJourney } from '../core/anki.js';
import { aggregateStats } from '../core/statistics.js';

export function createAnkiView({store, api}) {
  const root = document.querySelector('#statistics-anki');
  root.replaceChildren();
  function node(tag, tr, en, className='') {
    const el=document.createElement(tag); el.className=className;
    if (tr) localizedText(el,()=>bilingual(tr,en));
    return el;
  }
  root.classList.add('anki-dashboard');
  const header=node('div',null,null,'anki-header');
  const heading=node('div');
  heading.append(node('span','HER GÜN BİR ADIM','ONE DAY AT A TIME','anki-eyebrow'),node('h3','Bilgin büyüsün.','Grow what you know.'));
  header.append(heading); root.append(header);
  const journey=node('div'); journey.id='anki-journey';
  const goalLabel=node('label',null,null,'anki-goal-label');goalLabel.append(node('span','Günlük tekrar hedefin','Your daily review goal'));
  const goalSelect=node('select'); goalSelect.className='field'; goalSelect.id='anki-goal';
  for(const value of [10,25,50,100]) {const option=node('option');option.value=value;option.textContent=String(value);goalSelect.append(option);}
  goalLabel.append(goalSelect);
  goalSelect.onchange=()=>{try{store.update(d=>{d.ankiGoal=Number(goalSelect.value);});}catch{goalSelect.value=store.state.ankiGoal;localizedText(status,()=>bilingual('Hedef kaydedilemedi. Tekrar dene.','Could not save your goal. Try again.'));}};

  const description=node('p','Masaüstü Anki’den tekrar sayını, çalıştığın kartları ve çalışma süreni getir.','Import review counts, studied cards and study time from desktop Anki.','quiet');
  const setup=node('details'); setup.className='anki-setup'; setup.open=!store.state.anki;
  setup.append(node('summary','Bağlantı nasıl kurulur?','How do I connect?'));
  const steps=node('ol');
  for (const [tr,en] of [
    ['Bilgisayarında Anki’yi aç. Tools → Add-ons → Get Add-ons bölümünden 2055492159 koduyla AnkiConnect’i kur ve Anki’yi yeniden başlat.','Open Anki on your computer. Install AnkiConnect using code 2055492159 in Tools → Add-ons → Get Add-ons, then restart Anki.'],
    ['Anki açıkken “Anki’den getir” düğmesine bas. Anki’nin IKRA erişim isteğini ve tarayıcının yerel ağ iznini onayla.','With Anki open, click “Sync from Anki”. Accept the IKRA access request in Anki and your browser’s local network permission.'],
    ['Telefondaki çalışmalar için önce AnkiWeb ile eşitle, ardından masaüstü Anki’yi eşitle ve burada verileri getir. AnkiMobile ve AnkiWeb’e doğrudan bağlanılmaz.','For phone reviews, sync with AnkiWeb, sync desktop Anki, then refresh here. There is no direct connection to AnkiMobile or AnkiWeb.'],
  ]) steps.append(node('li',tr,en));
  setup.append(steps);
  const link=node('a','AnkiConnect eklentisi','AnkiConnect add-on'); link.href='https://ankiweb.net/shared/info/2055492159'; link.target='_blank'; link.rel='noopener noreferrer'; setup.append(link);
  const keyLabel=node('label');keyLabel.append(node('span','API anahtarı (yalnızca AnkiConnect’te ayarladıysan)','API key (only if configured in AnkiConnect)'));
  const key=node('input'); key.type='password'; key.autocomplete='off'; key.className='field'; key.id='anki-api-key'; keyLabel.append(key); const advanced=node('details');advanced.append(node('summary','Gelişmiş ayarlar','Advanced settings'),keyLabel);setup.append(advanced);
  const sync=node('button','Anki’den getir','Sync from Anki','button primary'); sync.type='button'; sync.id='anki-sync';
  const status=node('p'); status.id='anki-status'; status.setAttribute('role','status');
  const metadata=node('p'); metadata.className='quiet';
  const summary=node('div'); summary.className='stat-summary'; summary.id='anki-summary';
  const history=node('div'); history.className='subjects'; history.id='anki-days';
  const note=node('p','Anki süreleri Focus toplamına ve Focus Streak’e eklenmez. Günler cihazının yerel takvimine göre gösterilir; Anki’nin gün başlangıcı farklı olabilir. Veriler son başarılı eşitlemeye aittir.','Anki time stays separate from Focus totals and Focus Streak. Days use your device’s local calendar; Anki’s day cutoff may differ. Data reflects the last successful sync.','quiet');
  header.append(sync);
  const help=node('div',null,null,'anki-connect-card');help.append(description,setup,status,metadata);
  const periodTitle=node('h4','Seçili dönemin özeti','Selected period overview','anki-section-title');
  const archive=node('details',null,null,'anki-archive');archive.append(node('summary','Günlük geçmişi aç','View daily history'),history);
  root.append(help,goalLabel,journey,periodTitle,summary,archive,note);
  let busy=false, disposed=false;
  sync.onclick=async()=>{
    if(busy) return;
    busy=true; sync.disabled=true; root.setAttribute('aria-busy','true');
    const previous=store.state.anki;
    const before=ankiJourney(previous,store.state.ankiGoal);
    localizedText(status,()=>bilingual('Anki’ye bağlanılıyor… Anki’deki izin penceresini kontrol et.','Connecting… Check Anki for a permission request.'));
    try {
      const snapshot=await api.sync({key:key.value.trim(),onProgress:(done,total)=>{
        if(!disposed) localizedText(status,()=>bilingual(`${done}/${total} kart okundu…`,`${done}/${total} cards read…`));
      }});
      if(disposed) return;
      // A backup restore during the request must not be overwritten.
      if(JSON.stringify(previous)!==JSON.stringify(store.state.anki)) throw Error('changed');
      store.update(d=>{d.anki=snapshot;});
      setup.open=false;
      const after=ankiJourney(snapshot,store.state.ankiGoal);
      if(previous?.profile===snapshot.profile && before.today<after.goal && after.today>=after.goal){
        localizedText(status,()=>bilingual('Günlük hedef tamamlandı! Bugünkü emeğine sağlık.','Daily goal complete! Nice work showing up today.'));
        journey.classList.remove('anki-celebrate');void journey.offsetWidth;journey.classList.add('anki-celebrate');
        return;
      }
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
    goalSelect.value=String(store.state.ankiGoal||25);
    const game=ankiJourney(snapshot,store.state.ankiGoal);
    journey.replaceChildren();
    const hero=node('div',null,null,'anki-hero');
    const ring=node('div',null,null,'anki-ring');
    ring.style.setProperty('--progress',`${Math.min(100,game.today/game.goal*100)}%`);
    ring.setAttribute('role','progressbar');ring.setAttribute('aria-label',bilingual('Bugünkü hedef','Today’s goal'));
    ring.setAttribute('aria-valuemin','0');ring.setAttribute('aria-valuemax',String(game.goal));ring.setAttribute('aria-valuenow',String(Math.min(game.goal,game.today)));
    const ringInner=node('div');const count=node('strong');count.textContent=String(game.today);
    ringInner.append(count,node('span',`/ ${game.goal} tekrar`,`/ ${game.goal} reviews`));ring.append(ringInner);
    const heroCopy=node('div',null,null,'anki-hero-copy');
    heroCopy.append(node('span','BUGÜNKÜ KÜÇÜK ZAFERİN','YOUR SMALL WIN TODAY','anki-eyebrow'),
      node('h4',game.today>=game.goal?'Hedef tamam!':game.today?'Harika bir başlangıç.':'Bir kartla başla.',game.today>=game.goal?'Goal complete!':game.today?'You’re on your way.':'Start with one card.'),
      node('p',game.today>=game.goal?'Bugün kendine verdiğin sözü tuttun.':`Hedefine ${game.goal-game.today} tekrar kaldı. Anki’de çalış, burada ilerlemeni eşitle.`,game.today>=game.goal?'You showed up for yourself today.':`${game.goal-game.today} reviews to your goal. Study in Anki, then sync your progress here.`));
    hero.append(ring,heroCopy);journey.append(hero);
    const rewards=node('div',null,null,'anki-rewards');
    for(const [value,tr,en,hintTR,hintEN] of [
      [game.streak,'Günlük seri','Day streak',`En uzun: ${game.longest} gün`,`Best: ${game.longest} days`],
      [game.level,'Seviye','Level',`${game.xp} toplam XP`,`${game.xp} total XP`],
      [game.badges.filter(Boolean).length+'/6','Başarı rozeti','Badges','Küçük adımlar, kalıcı alışkanlıklar','Small steps, lasting habits']]){
      const card=node('div',null,null,'anki-reward');const valueNode=node('strong');valueNode.textContent=String(value);
      card.append(valueNode,node('span',tr,en),node('small',hintTR,hintEN));rewards.append(card);
    }
    journey.append(rewards);
    const xp=node('div',null,null,'anki-xp');
    xp.append(node('span',`Sonraki seviyeye ${1000-game.levelXP} XP`,`Next level in ${1000-game.levelXP} XP`));
    const meter=node('progress');meter.max=1000;meter.value=game.levelXP;meter.setAttribute('aria-label',bilingual('Seviye ilerlemesi','Level progress'));xp.append(meter);
    xp.append(node('small','Her tekrar 10 XP • Eşitlemek puanı çoğaltmaz.','Each review earns 10 XP • Syncing never duplicates points.'));journey.append(xp);
    const activity=node('section',null,null,'anki-activity');activity.append(node('h4','Son 28 günün ritmi','Your rhythm over 28 days'),node('p','Bugün ve bu alan seçili dönemden bağımsızdır. Seri için günde en az bir tekrar yeterli.','Today and this area are independent of the period filter. One review a day keeps your streak going.','quiet'));
    const calendar=node('div',null,null,'anki-calendar');
    for(const day of game.days){
      const cell=node('div',null,null,'anki-day');cell.dataset.active=String(day.count>0);
      const date=new Date(day.key+'T12:00:00');const title=`${date.toLocaleDateString(window.ikraLocale(),{dateStyle:'medium'})} · ${day.count} ${bilingual('tekrar','reviews')}`;
      cell.title=title;cell.setAttribute('aria-label',title);cell.tabIndex=0;
      const number=node('span');number.textContent=String(date.getDate());const amount=node('strong');amount.textContent=String(day.count);cell.append(number,amount);calendar.append(cell);
    }
    activity.append(calendar);journey.append(activity);
    const badges=node('section',null,null,'anki-badges');badges.append(node('h4','Başarı koleksiyonun','Your milestones'));
    const badgeGrid=node('div',null,null,'anki-badge-grid');
    const milestones=[['✦','İlk adım','First step','1 tekrar','1 review'],['◈','Yüzlük','Century','100 tekrar','100 reviews'],['★','Bilgi birikimi','Knowledge builder','500 tekrar','500 reviews'],['♧','Ritim','Finding rhythm','3 günlük seri','3-day streak'],['♜','Bir hafta','A full week','7 günlük seri','7-day streak'],['♛','İstikrar','Consistency','30 günlük seri','30-day streak']];
    milestones.forEach(([icon,tr,en,reqTR,reqEN],i)=>{const badge=node('div',null,null,'anki-badge');badge.dataset.earned=String(game.badges[i]);
      const symbol=node('span',null,null,'anki-badge-symbol');symbol.textContent=icon;symbol.setAttribute('aria-hidden','true');
      badge.append(symbol,node('strong',tr,en),node('small',reqTR,reqEN),node('span',game.badges[i]?'Kazanıldı':'Sıradaki hedef',game.badges[i]?'Unlocked':'To unlock','anki-badge-state'));badgeGrid.append(badge);});
    badges.append(badgeGrid);journey.append(badges);

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
