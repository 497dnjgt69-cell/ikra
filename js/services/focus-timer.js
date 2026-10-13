import { creditFocus, resetFocus, settleFocus, isStopwatch, timerSeconds } from "../domain/focus-timer.js";
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
      finished = !isStopwatch(store.state) && time >= store.state.timer.endAt;
    if (!finished) {
      store.previewTimer("timer", (timer) => {
        timer.remaining = timerSeconds(store.state, time);
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
      d.timer.remaining = timerSeconds(d, now());
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
    if (store.state.clockView || store.state.prayerTimer) return;
    settle();
    if (store.state.timer.running) return pause();
    store.update((d) => {
      const time = now(),
        t = d.timer;
      if (!isStopwatch(d) && t.remaining <= 0) {
        t.remaining = d.durations[d.mode] * 60;
        delete t.focusSessionId;
      }
      Object.assign(t, {
        running: true,
        endAt: isStopwatch(d) ? null : time + t.remaining * 1000,
        elapsedBase: t.remaining,
        elapsedStartedAt: time,
        startedAt: time,
        credited: 0,
      });
    });
  }
  return Object.freeze({
    start,
    pause,
    setStyle(style) {
      access.require(FEATURES.TIMER);
      if (!["countdown", "stopwatch"].includes(style) || style === store.state.focusStyle) return;
      pause();
      store.update(d => {
        d.focusStyle = style;
        if (d.mode === "focus") resetFocus(d, now());
      });
    },
    finish() {
      access.require(FEATURES.TIMER);
      if (!isStopwatch(store.state)) return;
      pause();
      store.update(d => {
        const id = d.timer.focusSessionId;
        const last = id && d.sessions.findLast(s => s.focusSessionId === id);
        if (last) { last.complete = true; d.round++; }
        resetFocus(d, now());
      });
    },
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
      settle();
      store.update((d) => {
        d.prayerHub = false;
        d.memoView = false;
        if (mode === "clock") {
          d.clockView = true;
          return;
        }
        const returning = (d.clockView || store.state.prayerHub || store.state.memoView) && d.mode === mode;
        d.clockView = false;
        if (returning) return;
        creditFocus(d, now());
        d.timer.running = false;
        d.mode = mode;
        resetFocus(d, now());
      });
    },
    skip() {
      if (isStopwatch(store.state)) return;
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
        if (d.mode === mode && !isStopwatch(d)) {
          d.timer.remaining = minutes * 60;
          delete d.timer.focusSessionId;
        }
      });
      return true;
    },
  });
}
