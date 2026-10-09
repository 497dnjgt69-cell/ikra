import { handleAction } from "../shared/actions.js";
import { $ } from "../shared/dom.js";

export function bindSettings({ store, settings, focus, render, playSound }) {
  for (let k of ["focus", "break", "long"])
    $("#" + k + "min").onchange = handleAction((e) => {
      let n = +e.target.value;
      if (!Number.isInteger(n) || n < 1 || n > (k === "focus" ? 240 : 120)) {
        render();
        return;
      }
      focus.setDuration(k, n);
      render();
    });
  $("#autonext").onchange = handleAction((e) => {
    settings.setAuto(e.target.checked);
  });
  $("#fullscreen").onclick = handleAction(() =>
    document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen?.(),
  );
  $("#longevery").onchange = handleAction((e) => {
    let n = Number(e.target.value);
    if (!Number.isInteger(n) || n < 0 || n > 24) {
      e.target.value = store.state.longEvery;
      return;
    }
    settings.setLongEvery(n);
  });
  $("#soundenabled").onchange = handleAction((e) => {
    settings.setSound(e.target.checked);
    if (store.state.sound) playSound("tap");
  });
  $("#soundvolume").oninput = handleAction((e) => {
    settings.setVolume(Number(e.target.value) / 100);
  });
  $("#soundtest").onclick = handleAction(() => playSound(["neumorphism", "nature"].includes(store.state.theme) ? "tap" : "finish"));
  const clickSound = (e) => {
    let b = e.target.closest("button");
    if (!b || b.disabled || b.getAttribute("aria-disabled") === "true" || b.id === "soundtest" || b.closest("#manual-session-form")) return;
    if (b.id === "focus-toggle") playSound(["neumorphism", "nature"].includes(store.state.theme) ? "tap" : "wind");
    else if (b.id === "start")
      playSound(
        (
          store.state.prayerView
            ? store.state.prayerTimer?.running
            : store.state.timer.running
        )
          ? "start"
          : "pause",
      );
    else if (b.id === "prayerfinish") playSound("finish");
    else playSound("tap");
  };
  document.addEventListener("click", clickSound);
  const widgetPosition = (e) => {
    settings.setWidget(e.detail);
  };
  document.addEventListener("widget-position", widgetPosition);
  $("#theme").onchange = handleAction((e) => settings.setTheme(e.target.value));
  return {dispose() { document.removeEventListener("click", clickSound); document.removeEventListener("widget-position", widgetPosition); }};
}
