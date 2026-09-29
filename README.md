# IKRA

Odak sayacı, çalışma takibi ve namaz desteği sunan statik PWA.

## Dosya düzeni

- `index.html`: Sayfa yapısı ve erişilebilir HTML kontrolleri.
- `css/`: Temel stiller, cam görünümü, çalışma alanı, doğa teması, mobil düzen ve sürüm duyuruları. HTML içindeki yükleme sırası CSS önceliğini korur.
- `js/app.js`: Uygulamanın tek giriş noktası; özellikleri bağımlılık sırasıyla başlatır.
- `js/core/`: Uygulama durumu ve sayaç koordinasyonu, varsayılan veriler, yedekleme/doğrulama ve istatistik hesapları.
- `js/features/`: Ses, odak görünümü, ayarlar, namaz ayarları/alıntıları, hakkında ve sürüm duyuruları.
- `js/ui/`: Paneller, bildirimler, zaman seçiciler, mobil kartlar ve ekran yerleşimi.
- `js/i18n/`: Türkçe/İngilizce sözlüğü ve DOM çevirisi.
- `service-worker.js`: Çevrimdışı dosyalar ve önbellek sürümü.
- `tests/`: Süre, istatistik ve yedek uyumluluğu regresyon kontrolleri.

## Yerel kullanım

`python3 -m http.server 8000` çalıştır ve http://localhost:8000 adresini aç.
ES modülleri nedeniyle HTML dosyasını çift tıklayarak `file://` üzerinden açma.
Derleme veya npm paketi kurulumu gerekmiyor. Testler için Node.js ile `npm test` çalıştır.

## Güncelleme

GitHub Pages mevcut depo kökünden yayınlamaya devam eder. HTML ile beraber `css/` ve `js/` klasörlerini de yükle. Yeni çalışma zamanı dosyalarını `service-worker.js` içindeki `CORE` listesine ekle ve önbellek sürümünü artır.

Mevcut `mahir-focus-v1` depolama anahtarı, kayıt yapısı ve yedek formatı korunur. Veriler tarayıcı ve alan adına bağlıdır; aynı yayın adresini kullan.

Bu geçiş mevcut davranışı korumaya odaklanır. `core/application.js` sayaç ve ekran koordinasyonunu hâlâ yönetir; özellikler sonraki adımlarda bu sınırdan aşamalı olarak ayrılabilir. Ücretli özellik veya ödeme doğrulaması bu değişikliğin kapsamında değildir.
