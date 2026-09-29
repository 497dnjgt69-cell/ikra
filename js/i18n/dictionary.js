export default function initialize() {
  (() => {
    const dictionary = {
      Odak: "Focus",
      ODAK: "FOCUS",
      Saat: "Clock",
      SAAT: "CLOCK",
      Namaz: "Prayer",
      NAMAZ: "PRAYER",
      Mola: "Break",
      "Uzun mola": "Long break",
      "Kısa mola": "Short break",
      Fokus: "Focus view",
      Başlat: "Start",
      Duraklat: "Pause",
      Sıfırla: "Reset",
      Geç: "Skip",
      "Bitir ve kaydet": "Finish & save",
      "Sonraki aşamaya geç": "Skip to the next stage",
      "Çalışma zamanı": "Study time",
      "Odağını topla.": "Find your focus.",
      "Şimdiki an.": "Be in the present.",
      "Biraz nefes al.": "Take a breath.",
      "Şu an": "Right now",
      Dinlenme: "Rest",
      "Namaz vakti": "Prayer time",
      "Rabbine yönel.": "Turn to your Lord.",
      "Ders seç": "Choose a subject",
      "İlk dersini ekle": "Add your first subject",
      Planım: "My plan",
      "Bir sonraki küçük adımını belirle.": "Choose your next small step.",
      "+ Ders": "+ Subject",
      "Yeni ders adı": "New subject name",
      "Yeni dersin rengi": "New subject colour",
      Kaydet: "Save",
      "Ne üzerinde çalışacaksın?": "What will you work on?",
      "Yeni görev": "New task",
      Ekle: "Add",
      "Hedef tarih": "Due date",
      "Görev hedef tarihi": "Task due date",
      "İsteğe bağlı": "Optional",
      Yapılacak: "To do",
      Tamamlanan: "Completed",
      Tümü: "All",
      "Dersler ve renkler": "Subjects & colours",
      "Dersi silmek çalışma geçmişini veya görevlerini silmez.":
        "Deleting a subject keeps your study history and tasks.",
      "Dersi sil": "Delete subject",
      Sil: "Delete",
      "Geri al": "Undo",
      "Ders silindi": "Subject deleted",
      "Çalışma geçmişin ve görevlerin korundu.":
        "Your study history and tasks have been kept.",
      "Ders geri eklendi.": "Subject restored.",
      "Ders silinemedi. Lütfen tekrar dene.":
        "Could not delete the subject. Please try again.",
      "Henüz ders eklenmedi.": "No subjects yet.",
      "İlk görevini ekle": "Add your first task",
      "Görev ekleyerek planını oluşturmaya başla.":
        "Add a task to start your plan.",
      "Tamamladığın görevler burada görünecek.":
        "Your completed tasks will appear here.",
      "Planındaki görevler tamamlandı.": "All tasks in your plan are complete.",
      "Görev metni": "Task text",
      "Görevi düzenle": "Edit task",
      "Görevi sil": "Delete task",
      Düzenle: "Edit",
      Genel: "General",
      İlerleme: "Progress",
      Bugün: "Today",
      "Son 7 gün": "Last 7 days",
      "Odak turu": "Focus sessions",
      "Bu hafta": "This week",
      Hafta: "Week",
      Ay: "Month",
      Yıl: "Year",
      "Tüm zamanlar": "All time",
      Az: "Less",
      Çok: "More",
      İstatistikler: "Statistics",
      "Son kayıtlar": "Recent sessions",
      "Çalışma süresi": "Study time",
      "Tamamlanan tur": "Completed sessions",
      "Aktif gün": "Active days",
      "Döneme göre çalışma süreleri": "Study time by period",
      "İstatistik dönemi": "Statistics period",
      "Önceki dönem": "Previous period",
      "Sonraki dönem": "Next period",
      "Tüm kayıtlı çalışmalar burada birikir. Namaz süreleri çalışma toplamına eklenmez.":
        "All recorded study sessions are included here. Prayer time is not included in study totals.",
      "İlk çalışma kaydınla istatistikler oluşacak.":
        "Your statistics will appear after your first study session.",
      "Henüz kayıt yok.": "No sessions yet.",
      "+ Oturum ekle": "+ Add session",
      Ders: "Subject",
      "Ders seç veya yeni ders yaz": "Choose or enter a subject",
      "Süre (dakika)": "Duration (minutes)",
      "Örn. 50": "e.g. 50",
      Tarih: "Date",
      "Bir ders seç veya dersin adını yaz.":
        "Choose a subject or enter its name.",
      "1–1440 arasında tam sayı olarak dakika gir.":
        "Enter a whole number of minutes from 1 to 1440.",
      "Bugün veya geçmişte geçerli bir tarih seç.":
        "Choose a valid date today or in the past.",
      "Dakika olarak gir: 1 saat = 60 dakika":
        "Enter minutes: 1 hour = 60 minutes",
      "Oturum kaydedildi": "Session saved",
      "Oturum silindi": "Session deleted",
      "Oturum geri yüklendi.": "Session restored.",
      "Oturum tamamlandı": "Session complete",
      Bildirim: "Notification",
      Bildirimler: "Notifications",
      "Tamamlanan oturumlar": "Completed sessions",
      "Bildirimi kapat": "Dismiss notification",
      "Geri yüklenemedi.": "Could not restore the session.",
      "Kayıt saklanamadı. Tarayıcı depolaması dolu olabilir.":
        "Could not save. Your browser storage may be full.",
      "Kayıt silinemedi. Tarayıcı depolamasını kontrol et.":
        "Could not delete. Check your browser storage.",
      Ayarlar: "Settings",
      Süreler: "Durations",
      dakika: "minutes",
      dk: "min",
      tur: "sessions",
      "Otomatik devam": "Auto-continue",
      "Otomatik geç": "Auto-continue",
      "Süre bitince sonraki sayacı başlat.":
        "Start the next timer when this one ends.",
      "Ses efektleri": "Sound effects",
      "Geçişler ve oturum bitişi.": "Transitions and session completion.",
      Ses: "Sound",
      "Ses seviyesi": "Volume",
      "Sesi dene": "Preview sound",
      "Uzun mola düzeni": "Long break schedule",
      "Uzun mola aralığı": "Long break interval",
      "0 = serbest; uzun molayı kendin seç.":
        "0 = manual; start long breaks yourself.",
      "0 seçersen uzun molayı kendin başlatırsın. Örneğin 4, her dört odak turundan sonra uzun mola verir.":
        "Choose 0 to start long breaks manually. Choose 4 for a long break after every four focus sessions.",
      Elle: "Manual",
      Serbest: "Manual",
      "Veriler ve düzen": "Data & layout",
      "Yedeği indir": "Download backup",
      "Yedek indir": "Download backup",
      "Yedekten yükle": "Restore backup",
      "Yedek yükle": "Restore backup",
      "Kartları başlangıç konumuna getir": "Reset card positions",
      "Kart konumlarını sıfırla": "Reset card positions",
      "Çalışmaların bu tarayıcıda saklanır. Başka tarayıcıya geçmeden önce yedek indir.":
        "Your study data is stored in this browser. Download a backup before switching browsers.",
      "Değişiklikler otomatik kaydedilir.": "Changes are saved automatically.",
      "Tam ekran": "Full screen",
      Görünüm: "Appearance",
      Açık: "Light",
      Koyu: "Dark",
      "Açık temaya geç": "Switch to light theme",
      "Koyu temaya geç": "Switch to dark theme",
      Kapat: "Close",
      "Fokus görünümüne geç": "Enter focus view",
      "Fokus görünümü": "Focus view",
      "Fokus modundan çık": "Exit focus view",
      "Esc veya saate dokunarak geri dön":
        "Press Esc or click the clock to return",
      Sayaç: "Timer",
      "Çalışma araçları": "Study tools",
      "Bilgi kartları": "Information cards",
      "Namaz vakitleri": "Prayer times",
      Vakitler: "Prayer times",
      "Namaz vakitleri özeti": "Prayer times overview",
      "Namaz vakitleri ve konum": "Prayer times & location",
      "Konum ve vakit ayarları": "Location & prayer settings",
      "Konum ekle": "Add a location",
      "Şehir, ülke — ör. Montréal, Canada":
        "City, country — e.g. Montréal, Canada",
      "Şehir ve ülke": "City and country",
      "Vakitleri getir": "Get prayer times",
      Konumum: "My location",
      Hesaplama: "Calculation",
      "ISNA (Kuzey Amerika)": "ISNA (North America)",
      Diyanet: "Diyanet",
      "Elle gir": "Enter manually",
      "Elle girildi": "Entered manually",
      "Alanları kapat": "Hide fields",
      Sabah: "Fajr",
      Öğle: "Dhuhr",
      İkindi: "Asr",
      Akşam: "Maghrib",
      Yatsı: "Isha",
      "Namaz seçimi": "Prayer selection",
      "Kılınacak namaz": "Choose a prayer",
      "Namaza başla": "Start prayer",
      "Namaz sayacını başlat": "Start prayer timer",
      "Namazı bitir ve kaydet": "Finish & save prayer",
      "Çalışma ekranına dön": "Return to study",
      "Ayet ve hadisler": "Verses & hadith",
      "Güncel vakitleri getirerek kalan süreyi gör.":
        "Get today's prayer times to see the countdown.",
      "Bugünün vakitleri tamamlandı. Yarın için vakit bekleniyor.":
        "Today's prayers have passed. Waiting for tomorrow's times.",
      "Otomatik vakitler internet ister ve hesaplama yöntemine göre değişebilir. Konum izni dosya olarak açıldığında çalışmazsa şehirle arayabilir veya elle girebilirsin. Yerel cami takvimini esas al.":
        "Automatic times require internet and depend on the calculation method. If location access is unavailable, search by city or enter times manually. Follow your local mosque's timetable.",
      "Şehir ve ülke yaz.": "Enter a city and country.",
      "Konum desteklenmiyor. Şehir yazabilirsin.":
        "Location is unavailable. You can enter a city instead.",
      "Konum izni alınamadı. Şehirle arayabilirsin.":
        "Location permission was unavailable. Try searching by city.",
      "İnternet bağlantısını kontrol et.": "Check your internet connection.",
      "Vakitler alınıyor…": "Loading prayer times…",
      "Vakitler getiriliyor…": "Loading prayer times…",
      "Vakitler alınamadı.": "Could not load prayer times.",
      Çalışma: "Study",
      "Önce Planım bölümünden bir ders ekle.":
        "Add a subject in My plan first.",
      "Mola başladı.": "Your break has started.",
      "Molan hazır.": "Time for a break.",
      "Mola tamamlandı": "Break complete",
      "Odak sayacı başladı.": "Your focus timer has started.",
      "Hazır olduğunda yeni bir çalışma başlatabilirsin.":
        "Start your next study session when you're ready.",
      "Namaz oturumu tamamlandı": "Prayer session complete",
      "Namaz oturumu kaydedildi": "Prayer session saved",
      "Kaydetme başarısız. Tarayıcı depolamasını kontrol et.":
        "Could not save. Check your browser storage.",
      "Yedek indirme başlatıldı. Dosyayı İndirilenler klasöründe bulabilirsin.":
        "Backup download started. You can find the file in Downloads.",
      "Yedek hazırlanamadı. Lütfen tekrar dene.":
        "Could not prepare the backup. Please try again.",
      "Geçerli bir yedek seç.": "Choose a valid backup.",
      "Bu yedek biçimi desteklenmiyor.": "This backup format is not supported.",
      "Yedekte çalışma, görev veya ders listesi eksik.":
        "The backup is missing sessions, tasks or subjects.",
      "Ders listesi geçersiz.": "Invalid subject list.",
      "Namaz kayıtları geçersiz.": "Invalid prayer records.",
      "Namaz kayıtlarından biri geçersiz.": "One prayer record is invalid.",
      "Sayaç süresi geçersiz.": "Invalid timer duration.",
      "Namaz sayacı geçersiz.": "Invalid prayer timer.",
      "Yedek 20 MB sınırını aşıyor.": "The backup exceeds the 20 MB limit.",
      "Yeterli depolama yok. Mevcut kayıtların değiştirilmedi.":
        "Not enough storage. Your existing data was not changed.",
      "Dosya okunamadı: geçerli bir JSON yedeği seç.":
        "Could not read the file. Choose a valid JSON backup.",
      "Yedek yüklenemedi.": "Could not restore the backup.",
      "IKRA hakkında": "About IKRA",
      "IKRA · Yapımcı hakkında": "IKRA · About the creator",
      "Merhaba, ben Mahir. Bir öğrenciyim. IKRA’yı ders çalışırken daha iyi odaklanmak, ilerlememi takip etmek ve namaza zaman ayırmak için hazırladım. Kendi ihtiyacımdan doğan bu sade alanın sana da eşlik etmesini umuyorum.":
        "Hi, I'm Mahir, a student. I built IKRA to focus better while studying, keep track of my progress and make time for prayer. I hope this simple space, created from my own needs, can support you too.",
      "© 2026 Mahir · IKRA. Tüm hakları saklıdır.":
        "© 2026 Mahir · IKRA. All rights reserved.",
      "Biliniz ki, kalpler ancak Allah’ı anmakla huzur bulur.":
        "Surely, hearts find comfort in the remembrance of Allah.",
      "Namaz bir nurdur.": "Prayer is a light.",
      "Beni anmak için namaz kıl.": "Establish prayer for My remembrance.",
      "Kulun Rabbine en yakın olduğu hâl secdedir. Bu hâlde çokça dua edin.":
        "A servant is closest to their Lord while prostrating, so make abundant supplication.",
      "Sabır ve namazla yardım dileyin.":
        "Seek help through patience and prayer.",
      "Allah katında en sevimli amel, az da olsa devamlı olanıdır.":
        "The deeds most beloved to Allah are those done consistently, even if they are small.",
      "Şüphesiz güçlükle beraber bir kolaylık vardır.":
        "Surely, with hardship comes ease.",
      "Allah’ın en sevdiği ameller sorulduğunda verilen ilk cevap, namazı vaktinde kılmaktır.":
        "When asked about the deeds most beloved to Allah, the first answer was prayer at its proper time.",
      "Namaz, hayasızlıktan ve kötülükten alıkoyar.":
        "Prayer restrains a person from indecency and wrongdoing.",
      "Allah’ı anın, O’na şükredin ve nankörlük etmeyin.":
        "Remember Allah, be grateful to Him, and do not be ungrateful.",
      "Kayıtlar bu tarayıcıda saklanır. Başka tarayıcıya taşımak için yedeği indir. Sayfa açıkken sayaç ve namaz süresi kaldığı yerden hesaplanır; bildirimler tarayıcı kapalıyken çalışmaz.":
        "Records are stored in this browser. Download a backup to move them elsewhere. Timers recover elapsed time while the page is open; notifications do not work when the browser is closed.",
      "Namaz sayacı": "Prayer timer",
      "Namazını seç ve sayacı başlat. Çalışma sayacı duraklatılır.":
        "Choose your prayer and start the timer. Your study timer will be paused.",
      "Kayıtların bu tarayıcıda saklanır. Başka bir dosyaya veya tarayıcıya geçmeden önce yedek indir. Otomatik namaz vakitleri için internet bağlantısı gerekir.":
        "Your records are stored in this browser. Download a backup before switching files or browsers. Automatic prayer times require internet access.",
      Tamamlandı: "Completed",
      "Vakitler yenileniyor…": "Updating prayer times…",
      "Yenilenemedi. İnternet bağlantısını kontrol et.":
        "Could not update. Check your internet connection.",
    };
    Object.assign(dictionary, {
      "IKRA · YENİLİKLER": "IKRA · WHAT’S NEW",
      "Odak alanın yenilendi.": "A fresh space to focus.",
      "Daha sakin bir görünüm, daha rahat bir deneyim. İşte IKRA’daki yenilikler.":
        "A calmer look. A smoother experience. Discover what’s new in IKRA.",
      "Doğadan ilham alan bir tema": "A little closer to nature",
      "Yeşil tonları ve cam efektiyle yeni Doğa teması.":
        "Meet Nature: soft greens with a glass finish.",
      "Telefonunda daha akıcı": "Made for your phone",
      "Dokunmaya uygun kontroller, alt menü ve yenilenen paneller.":
        "Touch-friendly controls, bottom navigation and refreshed panels.",
      "Yenilikleri kaçırma": "Stay in the loop",
      "Her yeni sürümde seni karşılayan, sade bir güncelleme özeti.":
        "A simple welcome to the latest features in each new release.",
      "Harika, başlayalım": "Let’s get started",
      "Her güncellemede, yalnızca bir kez.":
        "Once per update. Then back to your focus.",
    });
    Object.assign(dictionary, {
      "IKRA güncellendi · v1.1.0": "IKRA updated · v1.1.0",
      "Yeşil tonlarında yeni Doğa teması.":
        "New Nature theme in soft green tones.",
      "Telefonlarda daha rahat kullanım ve alt menü.":
        "Improved phone layout and bottom navigation.",
      "Mobilde yenilenen ilerleme ve namaz vakitleri panelleri.":
        "Refreshed progress and prayer-time panels on mobile.",
    });
    Object.assign(dictionary, {
      Doğa: "Nature",
      Tema: "Theme",
      Aydınlık: "Light",
      Karanlık: "Dark",
    });
    const reverse = Object.fromEntries(
      Object.entries(dictionary).map(([tr, en]) => [en, tr]),
    );
    let language = "tr";
    try {
      language = localStorage.getItem("ikra-language") === "en" ? "en" : "tr";
    } catch {}
    window.ikraLocale = () => (language === "en" ? "en-CA" : "tr-TR");
    window.ikraOriginal = (text) => reverse[text] || text;
    window.ikraT = (value) => {
      if (language === "tr") return value;
      const raw = String(value),
        text = raw.trim();
      let result = dictionary[text];
      if (result === undefined) {
        result = text;
        if (/^“.*”$/.test(text) && dictionary[text.slice(1, -1)])
          result = "“" + dictionary[text.slice(1, -1)] + "”";
        result = result
          .replace(/^(\d+) gün seri$/, "$1 day streak")
          .replace(
            /^(\d+) \/ (\d+) görev tamamlandı$/,
            "$1 / $2 tasks completed",
          )
          .replace(/^Her (\d+) turda$/, "Every $1 sessions")
          .replace(/^Daha eski kayıtlar \((\d+)\)$/, "Older sessions ($1)")
          .replace(
            /^(\d+)\. çalışma oturumu tamamlandı$/,
            "Study session $1 complete",
          );
        result = result
          .replace(/^Toplam /, "Total ")
          .replace(/ · tamamlandı/g, " · completed")
          .replace(/ tamamlandı$/, " completed")
          .replace(/ oturumunu sil$/, " — delete session")
          .replace(/ rengi$/, " colour")
          .replace(
            / kartını sürükle; ok tuşlarıyla taşı$/,
            " card: drag or use arrow keys",
          );
        result = result
          .replace(
            / · (\d+) dakika istatistiklerine eklendi\.$/,
            " · $1 minutes added to your statistics.",
          )
          .replace(/ · (\d+) dakika kaydedildi\.$/, " · $1 minutes saved.")
          .replace(/ kaydedildi\.$/, " saved.")
          .replace(/ silindi\.$/, " deleted.");
        result = result.replace(
          /^(\d+) çalışma kaydı ve derslerin yüklendi\.$/,
          "$1 study records and your subjects were restored.",
        );
        result = result.replace(
          /^(Çalışma kaydı|Görev) (\d+) geçersiz\.( Hiçbir veri değiştirilmedi\.)?$/,
          (_, kind, n) =>
            `${kind === "Görev" ? "Task" : "Study record"} ${n} is invalid. No data was changed.`,
        );
        result = result.replace(
          /^(Yarın )?(Sabah|Öğle|İkindi|Akşam|Yatsı) · (\d+) dk kaldı$/,
          (_, tomorrow, name, n) =>
            (tomorrow ? "Tomorrow " : "") +
            dictionary[name] +
            " · " +
            n +
            " min remaining",
        );
        result = result.replace(
          /^(Sabah|Öğle|İkindi|Akşam|Yatsı) · /,
          (_, name) => dictionary[name] + " · ",
        );
        result = result
          .replace(/^Yenilenemedi\. /, "Could not update. ")
          .replace(/^Güncel · /, "Updated · ")
          .replace(
            / tarihli kayıt gösteriliyor; güncel vakitler henüz alınmadı\.$/,
            " — saved times; today’s times have not loaded yet.",
          )
          .replace(
            / tarihli kayıt korunuyor; bugünün vakitleri değildir\.$/,
            " — saved times, not today’s timetable.",
          );
        result = result.replace(
          /^(\d+) çalışma, (\d+) görev, (\d+) ders ve (\d+) namaz kaydı yüklenecek\. Mevcut kayıtlar değişecek; sayaçlar duraklatılmış olarak açılacak\. Devam edilsin mi\?$/,
          "Restore $1 study sessions, $2 tasks, $3 subjects and $4 prayer records? This replaces existing data and pauses timers. Continue?",
        );
        result = result
          .replace(/\b(\d+) sa\b/g, "$1 h")
          .replace(/\b(\d+) dk\b/g, "$1 min")
          .replace(/\b(\d+) sn\b/g, "$1 s");
        for (const [tr, en] of Object.entries(dictionary)) {
          if (result.endsWith(" · " + tr))
            result = result.slice(0, -tr.length) + en;
        }
        if (
          / · (Diyanet meali|Türkçe anlamı|Mealden bölüm|Kısa anlamı|Meal)$/.test(
            result,
          )
        )
          result = result.replace(
            / · .*$/,
            " · English rendering of the meaning",
          );
      }
      return (
        raw.slice(0, raw.indexOf(text)) +
        result +
        raw.slice(raw.indexOf(text) + text.length)
      );
    };
    window.ikraSetLanguage = (value) => {
      language = value === "en" ? "en" : "tr";
      try {
        localStorage.setItem("ikra-language", language);
      } catch {}
      document.documentElement.lang = language;
      document.dispatchEvent(new Event("ikra-language"));
    };
    window.ikraLanguage = () => language;
  })();
}
