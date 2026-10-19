import { newId } from "../shared/format.js";
export const isStopwatch = (state) => state.mode === "focus" && state.focusStyle === "stopwatch";
export function timerSeconds(state, now) {
  const t = state.timer;
  if (!t.running) return t.remaining;
  return isStopwatch(state)
    ? (t.elapsedBase || 0) + Math.max(0, (now - t.elapsedStartedAt) / 1000)
    : Math.max(0, (t.endAt - now) / 1000);
}
// State transitions without DOM, storage or network: seconds are credited once, only up to the deadline.
export function creditFocus(state, now, complete = false) {
  const t = state.timer;
  if (state.mode !== "focus" || !t.running || !Number.isFinite(t.startedAt))
    return;
  const end = Math.min(now, Number.isFinite(t.endAt) ? t.endAt : now);
  const seconds = Math.max(0, (end - t.startedAt) / 1000);
  if (seconds > 0) {
    state.pendingFocus ||= [];
    t.focusSessionId ||= state.pendingFocus[0]?.focusSessionId || newId();
    state.pendingFocus.push({
      id: newId(),
      at: new Date(end).toISOString(),
      subject: state.subject,
      seconds,
      complete,
      focusSessionId: t.focusSessionId,
    });
    t.startedAt = end;
    t.credited = 0;
  }
  if (complete) finishFocus(state, end);
}
// Pauses/checkpoints stay private until the user finishes or the countdown ends.
// A course switch retains accurate attribution; each course gets one total.
export function finishFocus(state, now) {
  const groups = new Map();
  for (const part of state.pendingFocus || []) {
    const row = groups.get(part.subject);
    if (row) { row.seconds += part.seconds; row.segments.push({at: part.at, seconds: part.seconds}); }
    else groups.set(part.subject, { ...part, at: new Date(now).toISOString(), complete: true, segments: [{at: part.at, seconds: part.seconds}] });
  }
  state.sessions.push(...groups.values());
  state.pendingFocus = [];
  return groups.size > 0;
}
export function resetFocus(state, now) {
  creditFocus(state, now);
  state.timer = {
    running: false,
    remaining: state.mode === "clock" || isStopwatch(state) ? 0 : state.durations[state.mode] * 60,
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
    remaining: isStopwatch(state) ? 0 : state.durations[state.mode] * 60,
    endAt: null,
    startedAt: null,
    credited: 0,
  };
  if (state.auto) {
    state.timer.endAt = isStopwatch(state) ? null : now + state.timer.remaining * 1000;
    state.timer.elapsedBase = 0;
    state.timer.elapsedStartedAt = now;
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
