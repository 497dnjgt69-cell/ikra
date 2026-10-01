import test from 'node:test';
import assert from 'node:assert/strict';
import { focusStreak } from '../js/core/focus-streak.js';
import { creditFocus, settleFocus, resetFocus } from '../js/domain/focus-timer.js';
import { fresh } from '../js/core/default-state.js';
const at = (day, hour = 12) => new Date(2026, 8, day, hour);
const row = (day, seconds = 900, complete = true) => ({ at: at(day).toISOString(), seconds, complete });

test('requires a single completed 15 minute session; no summing unrelated short sessions', () => {
  assert.deepEqual(focusStreak([row(30, 899), row(30, 600), row(30, 3600, false)], at(30, 23)), { current: 0, longest: 0, today: false });
  assert.deepEqual(focusStreak([row(30), row(30)], at(30, 23)), { current: 1, longest: 1, today: true });
});
test('today, yesterday grace, broken streak, historical longest, future and invalid records', () => {
  const rows = [row(20), row(21), row(22), row(28), row(29), row(31), { at: 'invalid', seconds: 900, complete: true }];
  assert.deepEqual(focusStreak(rows, at(30)), { current: 2, longest: 3, today: false });
  assert.deepEqual(focusStreak(rows.slice(0, 3), at(30)), { current: 0, longest: 3, today: false });
  assert.equal(focusStreak([...rows, row(30)], at(30)).current, 3);
  assert.deepEqual(focusStreak([], at(30)), { current: 0, longest: 0, today: false });
});
test('completion day owns cross-midnight session; DST and year boundaries stay consecutive', () => {
  const rows = [
    { at: new Date(2026, 0, 1, 0, 5).toISOString(), seconds: 1200, complete: true },
    { at: new Date(2025, 11, 31, 20).toISOString(), seconds: 900, complete: true },
  ];
  assert.equal(focusStreak(rows, new Date(2026, 0, 1, 1)).current, 2);
  const dst = [7, 8, 9].map(day => ({ at: new Date(2026, 2, day, 12).toISOString(), seconds: 900, complete: true }));
  assert.equal(focusStreak(dst, new Date(2026, 2, 9, 13)).current, 3);
});
test('paused timer segments count as one completed session; reset never combines separate sessions', () => {
  const s = fresh(), start = +at(30, 10);
  s.timer = { running: true, startedAt: start, endAt: start + 900000, remaining: 900 };
  creditFocus(s, start + 600000);
  s.timer.startedAt = start + 1200000;
  s.timer.endAt = start + 1500000;
  settleFocus(s, s.timer.endAt);
  assert.equal(s.sessions[0].seconds, 600);
  assert.equal(s.sessions[1].seconds, 300);
  assert.equal(focusStreak(s.sessions, at(30)).current, 1);
  assert.equal(focusStreak(s.sessions.slice(1), at(30)).current, 0);
  s.mode = 'focus';
  s.timer = { running: true, startedAt: start, endAt: start + 900000, remaining: 900 };
  creditFocus(s, start + 600000);
  const oldId = s.timer.focusSessionId;
  resetFocus(s, start + 600000);
  assert.notEqual(s.timer.focusSessionId, oldId);
});
