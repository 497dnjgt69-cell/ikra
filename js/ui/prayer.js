import { $ } from "../shared/dom.js";
import { datekey } from "../shared/format.js";
import { prayerNames as names } from "../domain/prayer-timer.js";
export function createPrayerView({ store, times }) {
  function updateNextPrayer() {
    const el = $("#next-prayer");
    if (!el) return;
    const next = times.next();
    const wall = times.wall();
    let text = next
      ? (next.tomorrow ? "Yarın " : "") +
        next.name +
        " · " +
        next.minutes +
        " dk kaldı"
      : store.state.prayerDate !== wall.date
        ? "Güncel vakitleri getirerek kalan süreyi gör."
        : "Bugünün vakitleri tamamlandı. Yarın için vakit bekleniyor.";
    if (el.textContent !== text) el.textContent = text;
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
    let expired = store.state.prayerDate !== datekey(Date.now());
    $("#city").value = store.state.prayerLocation;
    $("#method").value = store.state.method;
    $("#prayerplace").textContent = store.state.prayerLocation || "Konum ekle";
    $("#prayerstatus").textContent = times.status();
    let grid = $("#prayergrid");
    grid.replaceChildren();
    names.forEach((n) => {
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
    names.forEach((n) => {
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
    $("#peek-location").textContent =
      store.state.prayerLocation || "Konum ekle";
    let grid = $("#peek-times");
    grid.replaceChildren();
    let current = store.state.prayerDate === datekey(Date.now());
    names.forEach((n) => {
      let box = document.createElement("div"),
        label = document.createElement("b"),
        time = document.createElement("span");
      box.className = "prayer";
      label.textContent = n;
      time.textContent = store.state.prayerTimes[n] || "—";
      box.append(label, time);
      grid.append(box);
    });
    if (!current && store.state.prayerDate)
      $("#peek-location").textContent +=
        " · " + store.state.prayerDate + " kaydı (güncel değil)";
  }
  return { render: renderPrayer, updateNextPrayer };
}
