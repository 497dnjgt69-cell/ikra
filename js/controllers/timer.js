import { t, bilingual } from "../i18n/bindings.js";
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
  const leavePrayer=()=>{if(!prayerTransitioning)prayer.leave();};
  const finishPrayer=()=>{const done=prayer.finish();if(done)window.ikraNotify(()=>t(done.name)+bilingual(" kılındı olarak kaydedildi."," marked as completed."));};
  $("#prayerstart").onclick = handleAction(() => {
    if (store.state.prayerView || prayerTransitioning) return;
    transitionPrayer(() => {$("#prayerselect").value="";prayer.enter();});
  });
  $("#prayerselect").onchange = handleAction((e) =>
    prayer.select(e.target.value),
  );
  $("#prayerfinish").onclick = handleAction(finishPrayer);
  document.addEventListener("prayer-begin", handleAction(beginPrayer));
  document.addEventListener("prayer-pause", handleAction(()=>prayer.pause()));
  document.addEventListener("prayer-resume", handleAction(()=>prayer.resume()));
  document.addEventListener("prayer-exit-focus", handleAction(()=>prayer.exitFocus()));
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
  const modes = $("#modes"), focusButton = $('[data-mode="focus"]');
  const breaks = document.createElement("div");
  breaks.id = "mode-breaks";
  focusButton.after(breaks);
  breaks.append($('[data-mode="break"]'), $('[data-mode="long"]'));
  focusButton.setAttribute("aria-controls", "mode-breaks");
  function showBreaks(open) {
    modes.classList.toggle("breaks-open", open);
    focusButton.setAttribute("aria-expanded", String(open));
    breaks.inert = !open;
    breaks.setAttribute("aria-hidden", String(!open));
  }
  showBreaks(!store.state.clockView && !store.state.prayerView);
  document.addEventListener("focus-render", () => {
    showBreaks(!store.state.clockView && !store.state.prayerView);
  });
  $$("[data-mode]").forEach(
    (b) =>
      (b.onclick = handleAction(() => {
        if (store.state.prayerView) prayer.leave();
        focus.changeMode(b.dataset.mode);
      })),
  );
  return {};
}
