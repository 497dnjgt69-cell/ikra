import { $, $$ } from "../shared/dom.js";
import { datekey } from "../shared/format.js";

export function createTimerView({ store }) {
  const quotes = [
    {
      text: "“Biliniz ki, kalpler ancak Allah’ı anmakla huzur bulur.”",
      source: "Ra’d 13:28 · Diyanet meali",
      url: "https://kuran.diyanet.gov.tr/tefsir/Ra%27d-suresi/1734/27-28-ayet-tefsiri",
    },
    {
      text: "“Şüphesiz güçlükle beraber bir kolaylık vardır.”",
      source: "İnşirâh 94:5 · Diyanet meali",
      url: "https://kuran.diyanet.gov.tr/mushaf/kuran-meal-2/insirah-suresi-94/ayet-1/diyanet-isleri-baskanligi-meali-1",
    },
    {
      text: "“Allah katında en sevimli amel, az da olsa devamlı olanıdır.”",
      source: "Sahih al-Bukhari 6464 · Türkçe anlamı",
      url: "https://sunnah.com/bukhari:6464",
    },
    {
      text: "“Namaz bir nurdur.”",
      source: "Sahih Muslim 223 · Türkçe anlamı",
      url: "https://sunnah.com/muslim:223",
    },
  ];
  function renderQuote() {
    let show = !store.state.clockView && ["break", "long"].includes(store.state.mode),
      q =
        quotes[
          (store.state.round + (["long"].includes(store.state.mode) ? 1 : 0)) %
            quotes.length
        ];
    $("#quote").classList.toggle("hidden", !show);
    $("#quotetext").textContent = q.text;
    $("#quotesource").textContent = q.source;
    $("#quotesource").href = q.url;
  }
  function render() {
    const activeRunning = store.state.prayerView
      ? !!store.state.prayerTimer?.running
      : store.state.timer.running;
    $("#prayermin").value = store.state.prayerDuration;
    document.body.classList.toggle("prayer-active", !!store.state.prayerView);
    document.body.classList.toggle(
      "focus-running",
      store.state.mode === "focus" &&
        store.state.timer.running &&
        !store.state.prayerView,
    );
    document.body.dataset.theme = store.state.theme;
    $("#theme").value = store.state.theme;

    for (let k of ["focus", "break", "long"])
      $("#" + k + "min").value = store.state.durations[k];
    $("#autonext").checked = !!store.state.auto;
    $("#longevery").value = store.state.longEvery;
    $("#soundenabled").checked = !!store.state.sound;
    $("#soundvolume").value = Math.round(store.state.soundVolume * 100);
    if (!$("#manual-subject").value)
      $("#manual-subject").value = store.state.subject;
    if (!$("#manual-date").value) $("#manual-date").value = datekey(Date.now());
    $$("[data-mode]").forEach((b) =>
      b.classList.toggle("active", b.dataset.mode === (store.state.clockView ? "clock" : store.state.mode)),
    );
    $("#overline").textContent =
      store.state.clockView
        ? "Şu an"
        : store.state.mode === "focus"
          ? "Çalışma zamanı"
          : store.state.mode === "long"
            ? "Uzun mola"
            : "Kısa mola";
    $("#title").textContent =
      store.state.clockView
        ? "Şimdiki an."
        : store.state.mode === "focus"
          ? "Odağını topla."
          : "Biraz nefes al.";
    $("#timerinfo").toggleAttribute(
      "data-user-text",
      store.state.mode === "focus" && !store.state.prayerView,
    );
    $("#timerinfo").textContent =
      store.state.clockView
        ? ""
        : store.state.mode === "focus"
          ? store.state.subject
          : "Dinlenme";
    $("#start").innerHTML = activeRunning
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14M15 5v14"/></svg><span>Duraklat</span>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"/></svg><span>Başlat</span>';
    $("#start").setAttribute(
      "aria-label",
      activeRunning ? "Duraklat" : "Başlat",
    );
    $("#start").disabled = false;
    for (let id of ["start", "reset", "skip"])
      $("#" + id).classList.toggle(
        "hidden",
        store.state.clockView && !store.state.prayerView,
      );
    if (store.state.prayerView) {
      $("#overline").textContent = "Namaz vakti";
      $("#title").textContent = "Rabbine yönel.";
      $("#timerinfo").textContent =
        (store.state.prayerTimer?.name || $("#prayerselect").value) +
        " · " +
        store.state.prayerDuration +
        " dk";
      $$("[data-mode]").forEach((b) => b.classList.remove("active"));
    }
    renderQuote();
  }
  return { render };
}
