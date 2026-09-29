# IKRA mimarisi

## Bağımlılık yönü

Kullanıcı olayı → controller → service → domain/store. UI, store'un salt okunur durumunu okur. Servisler DOM, `window` veya HTML seçicilerini bilmez. `platform/` dış sistemlerin adaptörlerini sağlar. `core/application.js` yalnızca bunları oluşturup birbirine bağlar.

`bootstrap.js` eski arayüzdeki panel/yerleşim bağımlılıklarının sırasını açıkça korur. Yerleşim modülleri aşamalı DOM oluşturmayı sürdürüyor; iş kuralları bu modüllerde tutulmamalı.

## Veri sözleşmesi

- `services/store.js` çalışma verisinin tek sahibidir. `state` derin dondurulur.
- `update(mutator)` kopyayı değiştirir, saklar, sonra abonelere bildirir. Yazma hatasında mevcut durum korunur.
- Saniyelik `previewTimer` yalnızca sayaç kopyasını değiştirir; uzun geçmiş dizilerini kopyalamaz veya her saniye diske yazmaz.
- `replace` eski kayıtları normalize eder. İçe aktarma önce `-before-import` kurtarma kopyasını yazar.
- Dersler arşivlendiğinde eski oturumlar ve görevler korunur. Oturum silme/geri alma kayıt kimliğini kullanır; başka kayıtlar eklenince eski dizi konumuna bağımlı kalmaz.
- Dil ve görülmüş sürüm duyurusu gibi arayüz tercihleri kendi ayrı anahtarlarındadır; lisans verisi çalışma yedeğine ait değildir.

## Sayaç sözleşmesi

`focus-timer` ve `prayer-timer` servislerine saat (`now`) enjekte edilebilir. Bu sayede gerçek zaman beklemeden duraklatma, devam, kapanıp açılma ve süre bitimi test edilir. Sayaç, interval sayısını saymak yerine bitiş zamanını kullanır. Kaydedilen çalışma süresi bitiş zamanında sınırlanır. Namaz servisi başlamadan önce odak servisini duraklatır.

Bitirme olayı ancak veri güncellemesi başarılı olduktan sonra ses/bildirim katmanına ulaşır. Ekran çizimi süre kredilendirme yapmaz.

## Namaz sağlayıcısı

`platform/prayer-api.js` mevcut AlAdhan yanıtını uygulama formatına dönüştürür. `services/prayer-times.js` yenileme, zaman aşımı, manuel vakit ve geç gelen yanıtları yönetir. Şehir/yöntem değişikliği veya yedek geri yükleme eski isteği geçersiz kılar. Testler gerçek konum ya da dış ağ kullanmaz.

## Ücretsiz / Pro sözleşmesi

`config/features.js` her özelliğin minimum planını tanımlar. Şu an mevcut özellikler ücretsizdir. Yeni bir ücretli özellik eklenirken:

1. Özellik kimliği ve planı katalogda tanımlanır.
2. İlgili servis komutu `access.require(featureId)` çağırır; yalnızca düğmenin gizlenmesine güvenilmez.
3. UI `access.can(featureId)` ile uygun görünümü seçer; reddedilen işlem kullanıcıya açıklanır.
4. Özelliğin kendisi uygulanır ve katalogdaki `implemented` bilgisi güncellenir.

`services/access.js` çalışma verisinden bağımsız, bellekte tutulan hak durumunu yönetir. Bilinmeyen özellik reddedilir. Süresi geçmiş veya doğrulanamayan Pro hakkı Pro erişimi açmaz. Gecikmiş yanıt daha yeni hak sonucunu değiştiremez.

Ticaret sağlayıcısının üç asenkron metodu vardır:

- `getEntitlements()` → doğrulanmış `{ plan: 'free' | 'pro', expiresAt: null | epochMilliseconds }`
- `purchase(product)` → işlemden sonra aynı doğrulanmış hak formatı
- `restore()` → doğrulanan mevcut satın alımlardan aynı format

Üretim sağlayıcısı Store ürünleri tanımlandıktan ve uygulamanın paketleme/çalıştırma yolu incelendikten sonra bağlanır. Adaptör Store köprüsü veya güvenilir backend üzerinden satın alma doğrulamalıdır. HTML/JS dosyaları ve tarayıcı belleği kullanıcı tarafından değiştirilebilir; bu katman tek başına korsanlığa karşı koruma sağlamaz. Sunucu kaynakları eklendiğinde sunucu da erişimi doğrulamalıdır.

Bu değişiklik fiyat, abonelik modeli veya mevcut özellikleri ücretli hale getirme kararı içermez. Aktif satın alma ekranı, Store ürün kimlikleri ve ödeme doğrulaması sonraki entegrasyondur.

## Yayın ve doğrulama

Yeni dosyalar eklenince `npm run cache`, ardından `npm test`. Kaynak dosyalar GitHub Pages'e olduğu gibi yayınlanır; çalışma zamanı npm bağımlılığı yoktur. `jsdom` yalnızca test bağımlılığıdır.

Testler gerçek DOM olaylarını benzetilmiş ortamda çalıştırır; masaüstü ve mobil medya koşullarındaki dalları doğrular. CSS yerleşimi, gerçek tarayıcı animasyonları ve gerçek Store satın alımı bu testlerin kapsamında değildir. Tarayıcı görsel kontrolü yayın öncesi ayrıca yapılmalıdır.
