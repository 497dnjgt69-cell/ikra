import { handleAction } from "../shared/actions.js";
import { $, $$ } from "../shared/dom.js";

export function bindTimer({ store, focus, prayer, render }) {
  let prayerTransitioning = false;
  async function transitionPrayer(change) {
    if (prayerTransitioning) return;
    prayerTransitioning = true;
    const hero = $(".hero"),
      reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    await hero
      .animate(
        [
          { opacity: 1, transform: "translateY(0)" },
          { opacity: 0.15, transform: "translateY(5px)" },
        ],
        { duration: reduced ? 0 : 140, easing: "ease-in", fill: "forwards" },
      )
      .finished.catch(() => {});
    change();
    render();
    hero.getAnimations().forEach((a) => a.cancel());
    await hero
      .animate(
        [
          { opacity: 0.15, transform: "translateY(5px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: reduced ? 0 : 260, easing: "cubic-bezier(.22,1,.36,1)" },
      )
      .finished.catch(() => {});
    prayerTransitioning = false;
  }
  const beginPrayer = () => prayer.begin($("#prayerselect").value);
  const leavePrayer = () => {
    if (prayerTransitioning) return;
    const finished = prayer.leave();
    if (finished)
      window.ikraNotify(
        finished.name +
          " · " +
          Math.round(finished.seconds / 60) +
          " dakika kaydedildi.",
        { completion: true, title: "Namaz oturumu kaydedildi" },
      );
  };
  $("#prayerstart").onclick = handleAction(() => {
    if (store.state.prayerView || prayerTransitioning) return;
    transitionPrayer(() => prayer.enter());
  });
  $("#prayerselect").onchange = handleAction((e) =>
    prayer.select(e.target.value),
  );
  $("#prayerfinish").onclick = handleAction(leavePrayer);
  document.addEventListener("prayer-begin", beginPrayer);
  document.addEventListener("prayer-leave", leavePrayer);
  $("#prayermin").onchange = handleAction((e) => {
    if (!prayer.setDuration(Number(e.target.value)))
      e.target.value = store.state.prayerDuration;
  });
  $("#start").onclick = handleAction(() => {
    if (store.state.prayerView) return beginPrayer();
    try {
      focus.start();
    } catch (error) {
      window.ikraNotify(error.message);
      if (!store.state.subject) $("#panel-tasks")?.showModal();
    }
  });
  $("#reset").onclick = handleAction(() =>
    store.state.prayerView
      ? prayer.reset($("#prayerselect").value)
      : focus.reset(),
  );
  $("#skip").onclick = handleAction(() =>
    store.state.prayerView ? leavePrayer() : focus.skip(),
  );
  $$("[data-mode]").forEach(
    (b) =>
      (b.onclick = handleAction(() => {
        if (store.state.prayerView) prayer.leave();
        focus.changeMode(b.dataset.mode);
      })),
  );
  return {};
}
