# IKRA

Odak sayacı, çalışma planı, istatistik ve namaz desteği sunan statik PWA.

## Geliştirme

- `python3 -m http.server 8000` → http://localhost:8000
- Testler: `npm ci` ardından `npm test` (uyumlu Node.js sürümleri `package.json` içinde belirtilir).
- Yeni JS/CSS dosyası eklenince `npm run cache` çalıştır ve `service-worker.js` önbellek sürümünü artır.
- Yayın için derleme gerekmez. GitHub Pages depo kökünden çalışır. ES modülleri nedeniyle `file://` yerine HTTP kullan.

## Yapı

| Konum | Sorumluluk |
| --- | --- |
| `index.html`, `css/` | Sayfa yapısı, temalar, mobil görünüm |
| `js/app.js`, `js/bootstrap.js` | Giriş ve arayüzün başlatılma sırası |
| `js/core/application.js` | Servisleri birbirine bağlar; yaşam döngüsü ve render koordinasyonu |
| `js/domain/` | Ekrandan bağımsız sayaç, namaz ve ders kuralları |
| `js/services/` | Veri saklama, sayaç komutları, ders/görev, oturum, yedek, ayar ve erişim servisleri |
| `js/controllers/` | Kullanıcı olaylarını servis komutlarına çevirir |
| `js/ui/`, `js/features/` | Ekranı çizer; paneller, odak görünümü ve diğer arayüz davranışları |
| `js/config/features.js` | Ücretsiz/Pro özellik politikası |
| `js/platform/` | Namaz API'si, ticaret sağlayıcısı ve service worker kaydı |
| `js/i18n/` | TR/EN sözlüğü ve çeviri |
| `tests/` | Sayaç, veri, erişim, DOM ve çevrimdışı dosya testleri |

## Veri uyumluluğu

`mahir-focus-v1` anahtarı ve `ikra-v1`/eski yedek formatları korunur. Eski kayıtlara kimlik ve şema sürümü eklenir. Servisler güncellemeleri kopya üzerinde hazırlar; depolama başarılı olduktan sonra yayınlar. Ekranlar durumu doğrudan değiştiremez.

Veri aynı tarayıcı ve alan adına bağlıdır. Aynı GitHub Pages adresinden yayınlamaya devam et.

## Pro temeli

Mevcut özellikler ücretsizdir. `custom-presets` yalnızca gelecekteki bir Pro özelliği için ayrılmış kimliktir; uygulanmış bir özellik değildir. `services/access.js` kontrolü servis komutlarında kullanılır. Yedek veya `localStorage` içindeki Pro alanları erişim sağlamaz.

Gerçek satın alma henüz bağlı değildir. `platform/commerce.js` şu an ücretsiz web sağlayıcısıdır. Microsoft Store doğrulaması yapan bir sağlayıcı composition root'a enjekte edilecektir. İstemci erişim kontrolü tek başına güvenli lisans doğrulaması değildir.

Mimari sözleşmeler ve sonraki ödeme entegrasyonu: [docs/architecture.md](docs/architecture.md).

## Dil ve simgeler

Statik TR/EN metinler `js/i18n/dictionary.js` içindedir; HTML satır sonları eşleşmeden önce normalize edilir. Kullanıcı metni içeren cümlelerde `js/i18n/bindings.js` içindeki `localizedText` / `localizedAttribute` kullanılır. Bu bağlar dil değişiminde yeniden çizilir; ders/görev adları sözlüğe gönderilmez. Saf kullanıcı metni `data-user-text` ile işaretlenir.

`icon-*.png` ve `IKRA.ico` yeni yeşil hilalli saat logosunu içerir. `icon-180.png` Apple touch simgesidir; maskable sürümde ek güvenli boşluk bulunur. Manifest kimliği, başlangıç adresi ve kapsamı korunmuştur. Bu depo web/PWA kaynaklarını içerir; Microsoft Store listeleme görselleri ve yüklenen Windows paketi burada yönetilmez.
