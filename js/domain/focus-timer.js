import { newId } from "../shared/format.js";
// State transitions without DOM, storage or network: seconds are credited once, only up to the deadline.
export function creditFocus(state, now, complete = false) {
  const t = state.timer;
  if (state.mode !== "focus" || !t.running || !Number.isFinite(t.startedAt))
    return;
  const end = Math.min(now, Number.isFinite(t.endAt) ? t.endAt : now);
  const seconds = Math.max(0, (end - t.startedAt) / 1000);
  if (seconds > 0) {
    state.sessions.push({
      id: newId(),
      at: new Date(end).toISOString(),
      subject: state.subject,
      seconds,
      complete,
    });
    t.startedAt = end;
    t.credited = 0;
  }
}
export function resetFocus(state, now) {
  creditFocus(state, now);
  state.timer = {
    running: false,
    remaining: state.mode === "clock" ? 0 : state.durations[state.mode] * 60,
    endAt: null,
    startedAt: null,
    credited: 0,
  };
}
export function settleFocus(state, now) {
  const t = state.timer;
  if (!t.running || !Number.isFinite(t.endAt)) return null;
  if (now < t.endAt) {
    t.remaining = (t.endAt - now) / 1000;
    return null;
  }
  const mode = state.mode;
  creditFocus(state, t.endAt, true);
  if (mode === "focus") {
    state.round++;
    state.mode =
      state.longEvery > 0 && state.round % state.longEvery === 0
        ? "long"
        : "break";
  } else state.mode = "focus";
  state.timer = {
    running: state.auto,
    remaining: state.durations[state.mode] * 60,
    endAt: null,
    startedAt: null,
    credited: 0,
  };
  if (state.auto) {
    state.timer.endAt = now + state.timer.remaining * 1000;
    state.timer.startedAt = now;
  }
  return {
    mode,
    subject: state.subject,
    minutes: state.durations.focus,
    auto: state.auto,
    count: state.sessions.filter((s) => s.complete).length,
  };
}
