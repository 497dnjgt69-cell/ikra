export default function initialize() {
  (() => {
    const $ = (s) => document.querySelector(s),
      modes = $("#modes"),
      focus = modes.querySelector('[data-mode="focus"]'),
      clock = modes.querySelector('[data-mode="clock"]'),
      prayer = $("#prayerstart");
    $(".controls").append($("#focus-toggle"));
    focus.textContent = "ODAK";
    clock.textContent = "SAAT";
    const breaks = document.createElement("span");
    breaks.id = "mode-breaks";
    breaks.append(
      modes.querySelector('[data-mode="break"]'),
      modes.querySelector('[data-mode="long"]'),
    );
    breaks.inert = true;
    modes.replaceChildren(focus, breaks, clock, prayer);
    function setExpanded(open) {
      modes.classList.toggle("breaks-open", open);
      focus.setAttribute("aria-expanded", String(open));
      focus.setAttribute("aria-controls", "mode-breaks");
      breaks.inert = !open;
    }
    const original = focus.onclick;
    focus.onclick = (e) => {
      original?.call(focus, e);
      setExpanded(!modes.classList.contains("breaks-open"));
    };
    clock.addEventListener("click", () => setExpanded(false));
    prayer.addEventListener("click", () => setExpanded(false));
    setExpanded(false);
    function label() {
      prayer.textContent = "NAMAZ";
    }
    document.addEventListener("focus-render", label);
    label();
    const quotes = [
      [
        "Biliniz ki, kalpler ancak Allah’ı anmakla huzur bulur.",
        "Ra’d 13:28 · Mealden bölüm",
        "https://kuran.diyanet.gov.tr/tefsir/Ra%27d-suresi/1734/27-28-ayet-tefsiri",
      ],
      [
        "Namaz bir nurdur.",
        "Sahih Muslim 223 · Türkçe anlamı",
        "https://sunnah.com/muslim:223",
      ],
      [
        "Beni anmak için namaz kıl.",
        "Tâhâ 20:14 · Mealden bölüm",
        "https://quran.com/tr/taha/14",
      ],
      [
        "Kulun Rabbine en yakın olduğu hâl secdedir. Bu hâlde çokça dua edin.",
        "Sahih Muslim 482 · Türkçe anlamı",
        "https://sunnah.com/muslim:482",
      ],
      [
        "Sabır ve namazla yardım dileyin.",
        "Bakara 2:153 · Mealden bölüm",
        "https://quran.com/tr/bakara/153",
      ],
      [
        "Allah katında en sevimli amel, az da olsa devamlı olanıdır.",
        "Sahih al-Bukhari 6464 · Türkçe anlamı",
        "https://sunnah.com/bukhari:6464",
      ],
      [
        "Şüphesiz güçlükle beraber bir kolaylık vardır.",
        "İnşirâh 94:5 · Meal",
        "https://kuran.diyanet.gov.tr/mushaf/kuran-meal-2/insirah-suresi-94/ayet-1/diyanet-isleri-baskanligi-meali-1",
      ],
      [
        "Allah’ın en sevdiği ameller sorulduğunda verilen ilk cevap, namazı vaktinde kılmaktır.",
        "Sahih al-Bukhari 527 · Kısa anlamı",
        "https://sunnah.com/bukhari:527",
      ],
      [
        "Namaz, hayasızlıktan ve kötülükten alıkoyar.",
        "Ankebût 29:45 · Kısa anlamı",
        "https://quran.com/tr/ankebut/45",
      ],
      [
        "Allah’ı anın, O’na şükredin ve nankörlük etmeyin.",
        "Bakara 2:152 · Kısa anlamı",
        "https://quran.com/tr/bakara/152",
      ],
    ];
    const panel = document.createElement("section");
    panel.className = "prayer-rotating";
    panel.setAttribute("aria-label", "Ayet ve hadisler");
    const text = document.createElement("blockquote"),
      link = document.createElement("a"),
      position = document.createElement("span");
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    position.className = "quote-position";
    panel.append(text, link, position);
    $("#prayer-presence").after(panel);
    let timer = null,
      index = 0,
      active = false,
      version = 0;
    function paint() {
      const q = quotes[index];
      text.textContent = q[0];
      link.textContent = q[1];
      link.href = q[2];
      position.textContent = index + 1 + " / " + quotes.length;
    }
    async function next() {
      if (!active || document.hidden) return;
      const token = version;
      const duration = matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 240;
      await panel
        .animate([{ opacity: 1 }, { opacity: 0 }], {
          duration,
          fill: "forwards",
        })
        .finished.catch(() => {});
      if (token !== version) return;
      index = (index + 1) % quotes.length;
      paint();
      panel.getAnimations().forEach((a) => a.cancel());
      panel.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: duration + 100,
      });
    }
    function sync() {
      const show = document.body.classList.contains("prayer-active");
      if (show === active) return;
      active = show;
      version++;
      clearInterval(timer);
      panel.getAnimations().forEach((a) => a.cancel());
      if (show) {
        paint();
        timer = setInterval(next, 30000);
      }
    }
    document.addEventListener("focus-render", sync);
    paint();
    sync();
  })();
}
