import { handleAction } from "../shared/actions.js";
import { $, $$ } from "../shared/dom.js";

export function bindTimer({ store, focus }) {
  $("#prayerstart").onclick = handleAction(() => store.update(d => { d.memoView = false; d.prayerHub = true; }));
  $("#start").onclick = handleAction(() => {
    try {
      focus.start();
    } catch (error) {
      window.ikraNotify(error.message);
      if (!store.state.subject) $("#panel-tasks")?.showModal();
    }
  });
  $("#reset").onclick = handleAction(() => focus.reset());
  $("#skip").onclick = handleAction(() => focus.skip());
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
  showBreaks(!store.state.clockView && !store.state.prayerView && !store.state.prayerHub && !store.state.memoView);
  document.addEventListener("focus-render", () => {
    showBreaks(!store.state.clockView && !store.state.prayerView && !store.state.prayerHub && !store.state.memoView);
  });
  $$("[data-mode]").forEach(
    (b) =>
      (b.onclick = handleAction(() => {
        focus.changeMode(b.dataset.mode);
      })),
  );
  return {};
}
