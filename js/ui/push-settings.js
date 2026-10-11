import {bilingual} from '../i18n/bindings.js';
import {PUSH_SERVER_URL} from '../config/push.js';
import {createPushClient,pushPreferences,PUSH_STORAGE_KEY} from '../platform/push-client.js';
export function createPushSettings({store,url=PUSH_SERVER_URL}){
  const section=document.createElement('section');section.id='notification-settings';section.className='settings-section notification-settings';section.dataset.i18nManaged='';
  section.innerHTML='<h3 class="settings-heading" id="push-heading"></h3><p class="quiet" id="push-note"></p><div id="push-categories"></div><div class="push-schedule"></div><p class="quiet" id="push-privacy"></p><p id="push-status" role="status" aria-live="polite"></p><div class="push-actions"><button type="button" class="button primary" id="push-enable"></button><button type="button" class="button" id="push-test"></button></div>';
  document.querySelector('#panel-settings .settings').append(section);
  const $=s=>section.querySelector(s),supported=window.isSecureContext&&'Notification' in window&&'PushManager' in window&&'serviceWorker' in navigator;
  const client=createPushClient({url});let busy=false,status='',timer=null,lastSynced='',disposed=false,syncing=false,rerun=false;
  const labels={prayer:['Namaz vakitleri','Prayer times'],focusReminder:['Odak hatırlatmaları','Focus reminders'],sessionComplete:['Odak ve mola bitişi','Focus & break completion'],announcements:['Yenilikler ve duyurular','Updates & announcements']};
  for(const [key] of Object.entries(labels)){const label=document.createElement('label');label.className='setting-row';const text=document.createElement('span'),input=document.createElement('input');input.type='checkbox';input.className='switch';input.setAttribute('role','switch');input.dataset.pref=key;label.append(text,input);$('#push-categories').append(label);}
  for(const [key,type] of [['reminderTime','time'],['frequency','select'],['quietStart','time'],['quietEnd','time']]){const label=document.createElement('label'),text=document.createElement('span'),input=document.createElement(type==='select'?'select':'input');input.dataset.pref=key;if(type==='select')input.innerHTML='<option value="3"></option><option value="1"></option>';else input.type=type;label.append(text,input);$('.push-schedule').append(label);}
  const texts={reminderTime:['Hatırlatma saati','Reminder time'],frequency:['Sıklık','Frequency'],quietStart:['Sessiz saat başlangıcı','Quiet hours start'],quietEnd:['Sessiz saat bitişi','Quiet hours end']};
  const messages={enabled:['Bildirimler açık · Ayarların kaydedildi.','Notifications on · Preferences saved.'],disabled:['Bildirimler kapalı.','Notifications off.'],syncing:['Ayarlar eşitleniyor…','Syncing preferences…'],error:['Eşitlenemedi. İnternet bağlantını kontrol et; son kaydedilen ayarlar geçerli olabilir.','Could not sync. Check your connection; the last saved settings may still apply.'],denied:['Bildirim izni verilmedi. Tarayıcının site ayarlarından açabilirsin.','Permission was not granted. Enable it in your browser site settings.'],test:['Deneme bildirimi sıraya alındı. Birazdan cihazında görünecek.','Test notification queued. It should appear on your device shortly.'],location:['Namaz bildirimi için önce Konum ve hesaplama bölümünden otomatik konum seç.','Choose an automatic location under Location & calculation first.'],removal:['Kapatma tamamlanamadı. İnternete bağlanınca tekrar denenecek.','Could not finish disabling. Retrying when online.']};
  function render(){if(disposed)return;const p=client.preferences;
    $('#push-heading').textContent=bilingual('Bildirimler','Notifications');
    $('#push-note').textContent=!url?bilingual('Bildirim servisi henüz etkin değil. Tercihlerini şimdiden seçebilirsin.','The notification service is not active yet. You can choose your preferences now.'):!supported?bilingual('Bu tarayıcıda push kullanılamıyor. iPhone’da Safari’den Ana Ekrana Ekle ile kurup uygulamayı oradan aç.','Push is unavailable here. On iPhone, add the app to your Home Screen from Safari, then open it there.'):bilingual('Bu cihaz için açılır. iPhone’da uygulamayı Ana Ekrana Ekle ile kurmalısın.','Enabled per device. On iPhone, install the app using Add to Home Screen.');
    for(const input of section.querySelectorAll('[data-pref]')){const key=input.dataset.pref;input.previousElementSibling.textContent=bilingual(...(labels[key]||texts[key]));if(input.type==='checkbox')input.checked=p[key];else input.value=String(p[key]);input.disabled=busy||syncing;}
    const frequency=$('[data-pref=frequency]');frequency.options[0].textContent=bilingual('3 günde bir','Every 3 days');frequency.options[1].textContent=bilingual('Her gün','Every day');
    $('#push-privacy').textContent=bilingual('İzin verdiğinde cihazın bildirim aboneliği, tercihler ve sayaç bitişi servise gönderilir. Namaz bildirimini açarsan seçili konum da paylaşılır. Sessiz saatler odak hatırlatmaları ve duyurular için geçerlidir.','When enabled, your push subscription, preferences and timer end are sent to the service. Prayer notifications also share your selected location. Quiet hours apply to reminders and announcements.');
    $('#push-status').textContent=busy?bilingual('Kaydediliyor…','Saving…'):status?bilingual(...messages[status]):'';
    $('#push-enable').textContent=client.active?bilingual('Bildirimleri kapat','Turn off notifications'):client.pendingRemoval?bilingual('Kapatmayı tamamla','Finish disabling'):bilingual('Bildirimleri aç','Enable notifications');
    $('#push-enable').disabled=busy||syncing||!url||(!supported&&!client.active&&!client.pendingRemoval);
    $('#push-test').textContent=bilingual('Deneme gönder','Send a test');$('#push-test').disabled=busy||syncing||!client.active||!url;
  }
  const payload=()=>pushPreferences(store.state,client.preferences,window.ikraLanguage());
  function validLocation(){const s=store.state.prayerSource;return !client.preferences.prayer||s?.type==='coords'||(s?.type==='address'&&s.address);}
  async function sync(){
    clearTimeout(timer);if(disposed||!url||!client.active||busy)return;
    if(syncing){rerun=true;return;}const p=payload(),signature=JSON.stringify(p);if(signature===lastSynced)return;
    syncing=true;status='syncing';render();
    try{await client.sync(p);lastSynced=signature;status=validLocation()?'enabled':'location';}catch{status='error';}
    finally{syncing=false;render();if(rerun){rerun=false;schedule();}}
  }
  function schedule(){clearTimeout(timer);if(client.active&&url)timer=setTimeout(sync,150);}
  section.addEventListener('change',e=>{if(!e.target.dataset.pref)return;const p=client.preferences;for(const input of section.querySelectorAll('[data-pref]'))p[input.dataset.pref]=input.type==='checkbox'?input.checked:input.tagName==='SELECT'?+input.value:input.value;try{client.setPreferences(p);status=validLocation()?'':'location';schedule();}catch{status='error';}render();});
  $('#push-enable').onclick=async()=>{
    if(busy||syncing)return;
    if(!client.active&&!client.pendingRemoval&&!validLocation()){status='location';render();return;}
    busy=true;render();
    try{if(client.active||client.pendingRemoval){await client.disable();status='disabled';lastSynced='';}else{const p=payload();await client.enable(p);lastSynced=JSON.stringify(p);status='enabled';}}
    catch(e){status=client.pendingRemoval?'removal':e.message==='permission_denied'?'denied':'error';}
    finally{busy=false;render();schedule();}
  };
  $('#push-test').onclick=async()=>{busy=true;render();try{await client.test();status='test';}catch{status='error';}finally{busy=false;render();}};
  const unsubscribe=store.subscribe(schedule);
  const language=()=>{render();schedule();};document.addEventListener('ikra-language',language);
  const retry=async()=>{if(client.pendingRemoval&&url){try{await client.disable();status='disabled';}catch{status='removal';}render();}else{lastSynced='';schedule();}};
  const visibility=()=>{if(document.visibilityState==='visible')retry();};
  const storage=e=>{if(e.key===PUSH_STORAGE_KEY){client.reload();lastSynced='';render();schedule();}};
  window.addEventListener('online',retry);window.addEventListener('storage',storage);document.addEventListener('visibilitychange',visibility);
  function route(target){if(target==='prayer'){const button=document.querySelector('#peek-toggle');if(button?.getAttribute('aria-expanded')!=='true')button?.click();}else if(target==='focus'){for(const dialog of document.querySelectorAll('dialog[open]'))window.closePanel?.(dialog);if(store.state.clockView)document.querySelector(`[data-mode="${store.state.mode}"]`)?.click();document.querySelector('#start')?.focus();}}
  const message=e=>{if(e.data?.type==='ikra-notification')route(e.data.target);};navigator.serviceWorker?.addEventListener('message',message);
  const initial=new URL(window.location.href);if(initial.searchParams.has('notification')){route(initial.searchParams.get('notification'));initial.searchParams.delete('notification');window.history.replaceState(null,'',initial.href);}
  render();retry();
  return {dispose(){disposed=true;clearTimeout(timer);unsubscribe();document.removeEventListener('ikra-language',language);window.removeEventListener('online',retry);window.removeEventListener('storage',storage);document.removeEventListener('visibilitychange',visibility);navigator.serviceWorker?.removeEventListener('message',message);section.remove();}};
}
