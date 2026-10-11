# IKRA bildirim servisi

Bu servis, GitHub Pages uygulamasından ayrı çalışır. Ön yüz hazırdır; **`js/config/push.js` içindeki `PUSH_SERVER_URL` boşken telefona push gönderimi etkin değildir.** Uygulama ayar ekranı bu durumu açıkça gösterir. Bu depodaki değişiklikleri Pages'a yayınlamak tek başına sunucuyu çalıştırmaz.

## Çalıştırma

Gereksinimler: Node.js 24, sürekli çalışan bir işlem, HTTPS alan adı ve kalıcı disk. Uyuyan veya her istekte yeniden başlayan stateless fonksiyonlar bu sürümün zamanlayıcısı için uygun değildir. Tek servis örneği çalıştırın; SQLite dosyasını aynı anda birden fazla örneğe bağlamayın.

Depo kökünden:

```sh
cd server
npm ci --omit=dev
cp .env.example .env
npm run keys
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex')+'\n')"
```

Üretilen public/private VAPID anahtarlarını ve son komuttaki yönetici anahtarını `.env` dosyasına veya sunucunun secret yöneticisine yazın. `VAPID_SUBJECT` alanına ulaşılabilir bir `mailto:` adresi girin. `.env` ve veri tabanı git tarafından dışlanır. Özel anahtarları veya yönetici anahtarını ön yüz dosyalarına koymayın. VAPID anahtarlarını her deployda değiştirmeyin; abonelikler bunlara bağlıdır.

`APP_ORIGIN` yalnızca köken olmalıdır: `https://497dnjgt69-cell.github.io` (sonunda `/ikra/` veya `/` yok).

```sh
npm start
```

Servis varsayılan olarak 8787 portunda çalışır. HTTPS'i hosting sağlayıcısı veya ters proxy sonlandırmalıdır. `/health` kontrolü `{ "ok": true }` döner. `DB_PATH` kalıcı bir diski göstermelidir. Veri tabanı ve VAPID anahtarlarını güvenli şekilde yedekleyin.

Docker ile depo kökünden:

```sh
docker build -f server/Dockerfile -t ikra-push .
docker volume create ikra-push-data
docker run -d --name ikra-push --restart unless-stopped --env-file server/.env -e DB_PATH=/data/notifications.sqlite -v ikra-push-data:/data -p 8787:8787 ikra-push
```

## Ön yüzü bağlama

1. Servis HTTPS üzerinden erişilebilir olunca `js/config/push.js` içindeki `PUSH_SERVER_URL` değerini servis adresiyle doldurun. Örnek: `https://notifications.example.com`. `/config` public VAPID anahtarını verir.
2. Ön yüzü yeniden yayınlayın. Service worker sürümünü artırın; `npm run cache` çalıştırın.
3. Uygulamada **Ayarlar → Bildirimler → Bildirimleri aç** deyin. İzin yalnızca bu düğmeye basıldığında istenir.
4. **Deneme gönder** ile hedef cihazda gerçek teslimatı kontrol edin. iPhone/iPad'de iOS/iPadOS 16.4+ ve Safari üzerinden Ana Ekrana Ekle ile kurulmuş uygulama gerekir. Her cihaz kendi iznini vermelidir.
5. Gerçek cihazda uygulamayı kapatarak oturum bitişini ve ayarlı odak hatırlatmasını deneyin. İşletim sistemi Odak/Rahatsız Etmeyin ayarları ve bağlantı, görünme zamanını etkileyebilir.

## Kategoriler ve davranış

- **Namaz:** Beş vakit; güneş doğuşu gönderilmez. Kullanıcının seçtiği konum, hesaplama yöntemi ve konumun saat dilimiyle AlAdhan'dan günlük vakitler alınır. Manuel vakit seçimi için otomatik bildirim açılmaz. Konum değişikliği bekleyen eski vakitleri iptal eder. Sessiz saatlerden etkilenmez.
- **Odak hatırlatmaları:** Varsayılan 3 günde bir, yerel saat 11.00; her gün seçeneği vardır. Metinler dönüşümlüdür. Aktif bir oturum sırasında veya sessiz saatlerde gönderilmez. Kaçırılmış eski hatırlatmalar sonradan yağdırılmaz.
- **Oturum bitişi:** Başlatılan mevcut odak/mola bitişi sunucuda kaydedilir. Duraklatma/sıfırlama, eşitleme başarılıysa bekleyen bildirimi iptal eder. Otomatik sonraki oturum ancak uygulama yeni sayacı başlatıp eşitlediğinde planlanır. Uygulama tamamen kapalıyken kendiliğinden yeni oturum zinciri başlatılmaz. Sessiz saatlerden etkilenmez.
- **Duyurular:** Varsayılan kapalıdır. Yönetici uç noktası yalnızca bu kategoriye izin veren cihazlara gönderir. Sessiz saatlerde bekler; 24 saat sonra geçersiz olur.
- **Deneme:** İzin ve kurulum kontrolü için; cihaz başına en sık 30 saniyede bir.

Zamanlayıcı 20 saniyede bir çalışır. Namaz ve oturum bildirimlerinin geçerliliği 2 dakikadır; kesin saniyesinde teslim garantisi yoktur. Sunucunun uzun süre kapalı kalması, bağlantı kopması veya işletim sistemi sınırlamaları teslimatı engelleyebilir. Ayar/sayaç eşitlemesi başarısızsa uygulama bunu ayarlar ekranında gösterir; sunucu son başarılı durumu kullanır. Çevrimdışı duraklatılan bir sayacın eski bitiş bildirimi bu nedenle gelebilir.

Abonelikler, tercihler, seçili konum (yalnızca namaz açıkken) ve sayaç bitişi saklanır. Ders adı ve çalışma geçmişi gönderilmez. Cihaz anahtarı yerel tarayıcıda tutulur ve çalışma yedeklerine girmez. Bildirim kapatılınca tarayıcı aboneliği iptal edilir, sunucudaki kayıt ve bağlı işler silinir. Süresi dolan push uç noktaları 404/410 yanıtında temizlenir.

## Yönetici duyurusu

`POST /broadcast`, `Authorization: Bearer <ADMIN_TOKEN>` ve JSON gövde kabul eder:

```json
{"title":"IKRA yenilendi","body":"Yeni özellikleri keşfetmek için uygulamayı aç."}
```

Başlık en fazla 80, mesaj 240 karakterdir. Yanıt `202` ve `queued` cihaz sayısıdır; bu sayı teslim onayı değildir. Keyfi dış URL açılmaz; duyuru IKRA'yı açar. Yönetici anahtarı yalnızca sunucu/yönetici ortamında kullanılmalıdır.

Diğer API'ler: `GET /config`; cihazın rastgele ID/anahtarıyla `PUT/DELETE /subscriptions/:id`; `POST /subscriptions/:id/test`. Ön yüz kökeni sınırlandırılır, cihaz anahtarı hash olarak saklanır, istek boyutu/hızı sınırlandırılır ve yalnızca bilinen HTTPS push sağlayıcılarına gönderilir. Ters proxy kullanılıyorsa uygulamanın IP limiti proxy adresine topluca uygulanır; büyük kurulumlarda proxy katmanında cihaz/IP limitleri yapılandırın.

## Kontroller

Depo kökünde `npm test`: sunucu planlama/iptal, yeniden başlatma, saat dilimi, sessiz saat, yetkilendirme, push istemcisi, service worker ve mini pencere senaryoları dahildir. Bu testler gerçek APNs/FCM teslimatı veya tarayıcı çizimi yerine kontrollü test ortamı kullanır. Yayından sonra yukarıdaki gerçek cihaz denemeleri ayrıca yapılmalıdır.
