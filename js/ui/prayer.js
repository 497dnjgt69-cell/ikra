import { t, bilingual, localizedText } from "../i18n/bindings.js";
import { $ } from "../shared/dom.js";
import { datekey } from "../shared/format.js";
import { prayerNames as names } from "../domain/prayer-timer.js";
export function createPrayerView({ store, times }) {
  function locationText() {
    const name = store.state.prayerLocation;
    return !name ? t("Konum ekle") : ["Konumum", "Elle girildi"].includes(name) ? t(name) : name;
  }
  function updateNextPrayer() {
    const el = $("#next-prayer");
    if (!el) return;
    const fajr = times.fajrEnd?.();
    for(const target of ['#fajr-end','#fajr-end-peek']) {
      const label=$(target);if(!label) continue;
      localizedText(label,()=>!fajr ? bilingual('Sabah bitişi için güncel güneş doğuş saatini getir veya elle ekle.','Refresh sunrise times or enter sunrise manually to see when Fajr ends.')
        : fajr.active ? bilingual(`Sabah vaktinin çıkmasına ${fajr.minutes} dk kaldı · Güneş ${fajr.time}`,`Fajr ends in ${fajr.minutes} min · Sunrise ${fajr.time}`)
        : bilingual(`Sabah bitişi · Güneş ${fajr.time}${fajr.ended?' · Vakit sona erdi.':''}`,`Fajr ends · Sunrise ${fajr.time}${fajr.ended?' · Time has ended.':''}`));
      label.classList.toggle('fajr-active',!!fajr?.active);
    }
    const next = times.next();
    const wall = times.wall();
    localizedText(el, () => {
      if (!next) return t(store.state.prayerDate !== wall.date
        ? "Güncel vakitleri getirerek kalan süreyi gör."
        : "Bugünün vakitleri tamamlandı. Yarın için vakit bekleniyor.");
      const hours = Math.floor(next.minutes / 60), minutes = next.minutes % 60;
      const duration = (hours ? hours + bilingual(" saat ", " h ") : "") +
        minutes + bilingual(" dk", " min");
      return (next.tomorrow ? bilingual("Yarın ", "Tomorrow ") : "") +
        t(next.name) + " · " + duration + bilingual(" kaldı", " remaining");
    });
    $("#peek-times")
      ?.querySelectorAll(".prayer")
      .forEach((card) =>
        card.classList.toggle(
          "next-up",
          !!next &&
            !next.tomorrow &&
            window.ikraOriginal(card.querySelector("b")?.textContent) ===
              next.name,
        ),
      );
  }
  function renderPrayer() {
    $("#cityfetch").disabled = times.loading;
    $("#city").value = store.state.prayerLocation;
    $("#method").value = store.state.method;
    localizedText($("#prayerplace"), locationText);
    $("#prayerstatus").textContent = times.status();
    let grid = $("#prayergrid");
    grid.replaceChildren();
    [names[0], "Güneş", ...names.slice(1)].forEach((n) => {
      let e = document.createElement("div"),
        b = document.createElement("b"),
        v = document.createElement("span");
      e.className = "prayer";
      b.textContent = n;
      v.textContent = store.state.prayerTimes[n] || "—";
      e.append(b, v);
      grid.append(e);
    });
    let fields = $("#prayerfields");
    fields.replaceChildren();
    [names[0], "Güneş", ...names.slice(1)].forEach((n) => {
      let l = document.createElement("label"),
        i = document.createElement("input");
      l.textContent = n;
      i.type = "time";
      i.value = store.state.prayerTimes[n] || "";
      i.dataset.prayer = n;
      i.className = "field";
      l.append(i);
      fields.append(l);
    });
    $("#prayerstart").classList.remove("hidden");
    $("#prayerstart").textContent = "Namaz";
    $("#prayerstart").classList.toggle("active", !!store.state.prayerView);
    $("#prayerstart").setAttribute(
      "aria-pressed",
      String(!!store.state.prayerView),
    );
    $("#prayerfinish").classList.toggle("hidden", !store.state.prayerTimer);
    $("#prayerselect").disabled = false;
    if (store.state.prayerTimer)
      $("#prayerselect").value = store.state.prayerTimer.name;
    renderPeek();
  }
  function renderPeek() {
    $("#peek-toggle").setAttribute(
      "aria-expanded",
      String(!!store.state.prayerPeek),
    );
    window.animatePanel($("#prayer-peek"), !!store.state.prayerPeek);
    localizedText($("#peek-location"), () => locationText() +
      (store.state.prayerDate && store.state.prayerDate !== datekey(Date.now())
        ? bilingual(" · " + store.state.prayerDate + " kaydı (güncel değil)",
          " · saved times from " + store.state.prayerDate + " (out of date)") : ""));
    let grid = $("#peek-times");
    grid.replaceChildren();
    [names[0], "Güneş", ...names.slice(1)].forEach((n) => {
      let box = document.createElement("div"),
        label = document.createElement("b"),
        time = document.createElement("span");
      box.className = "prayer";
      label.textContent = n;
      time.textContent = store.state.prayerTimes[n] || "—";
      box.append(label, time);
      grid.append(box);
    });

  }
  return { render: renderPrayer, updateNextPrayer };
}
