import { creditFocus, resetFocus, settleFocus } from "../domain/focus-timer.js";
import { FEATURES } from "../config/features.js";
export function createFocusTimer({
  store,
  access,
  now = Date.now,
  onComplete = () => {},
}) {
  function settle() {
    if (!store.state.timer.running) return;
    const time = now(),
      finished = time >= store.state.timer.endAt;
    if (!finished) {
      store.previewTimer("timer", (timer) => {
        timer.remaining = Math.max(0, (timer.endAt - time) / 1000);
      });
      return;
    }
    const event = store.update((d) => settleFocus(d, time), {
      persist: finished,
      notify: finished,
    });
    if (event) onComplete(event);
  }
  function pause() {
    settle();
    if (!store.state.timer.running) return;
    store.update((d) => {
      creditFocus(d, now());
      d.timer.remaining = Math.max(0, (d.timer.endAt - now()) / 1000);
      Object.assign(d.timer, {
        running: false,
        endAt: null,
        startedAt: null,
        credited: 0,
      });
    });
  }
  function start() {
    access.require(FEATURES.TIMER);
    if (!store.state.subject)
      throw new Error("Önce Planım bölümünden bir ders ekle.");
    if (store.state.mode === "clock" || store.state.prayerTimer) return;
    settle();
    if (store.state.timer.running) return pause();
    store.update((d) => {
      const time = now(),
        t = d.timer;
      if (t.remaining <= 0) t.remaining = d.durations[d.mode] * 60;
      Object.assign(t, {
        running: true,
        endAt: time + t.remaining * 1000,
        startedAt: time,
        credited: 0,
      });
    });
  }
  return Object.freeze({
    start,
    pause,
    settle,
    reset() {
      store.update((d) => resetFocus(d, now()));
    },
    credit(time = now()) {
      if (store.state.timer.running) store.update((d) => creditFocus(d, time));
    },
    changeMode(mode) {
      access.require(FEATURES.TIMER);
      if (!["focus", "break", "long", "clock"].includes(mode)) return;
      store.update((d) => {
        creditFocus(d, now());
        d.timer.running = false;
        d.mode = mode;
        resetFocus(d, now());
      });
    },
    skip() {
      access.require(FEATURES.TIMER);
      store.update((d) => {
        creditFocus(d, now());
        const mode = d.mode;
        d.timer.running = false;
        if (mode === "focus") d.round++;
        d.mode =
          mode === "focus"
            ? d.longEvery > 0 && d.round % d.longEvery === 0
              ? "long"
              : "break"
            : "focus";
        resetFocus(d, now());
      });
    },
    setDuration(mode, minutes) {
      access.require(FEATURES.TIMER);
      if (
        !["focus", "break", "long"].includes(mode) ||
        !Number.isInteger(minutes) ||
        minutes < 1 ||
        minutes > (mode === "focus" ? 240 : 120)
      )
        return false;
      pause();
      store.update((d) => {
        d.durations[mode] = minutes;
        if (d.mode === mode) d.timer.remaining = minutes * 60;
      });
      return true;
    },
  });
}
