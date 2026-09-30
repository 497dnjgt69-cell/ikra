import test from 'node:test';
import assert from 'node:assert/strict';
import { focusDistribution, prayerWeek } from '../js/core/activity-insights.js';
import { datekey } from '../js/shared/format.js';
import { fresh } from '../js/core/default-state.js';
import { normalizeBackup } from '../js/core/backup-validation.js';
import { isDateKey } from '../js/shared/format.js';
import { prayerNames as names } from '../js/domain/prayer-timer.js';

test('focus distribution splits hours, midnight and period boundaries; excludes unknown manual times', () => {
  const start = new Date(2026, 8, 28), end = new Date(2026, 9, 5);
  const r = focusDistribution([
    { at: new Date(2026, 8, 28, 11, 30).toISOString(), seconds: 5400 },
    { at: new Date(2026, 8, 29, 0, 30).toISOString(), seconds: 3600 },
    { at: new Date(2026, 8, 28, 0, 15).toISOString(), seconds: 1800 },
    { at: new Date(2026, 9, 5, 0, 15).toISOString(), seconds: 1800 },
    { at: new Date(2026, 8, 29, 12).toISOString(), seconds: 7200, manual: true },
  ], start, end);
  assert.equal(r.cells[0][10], 3600);
  assert.equal(r.cells[0][11], 1800);
  assert.equal(r.cells[0][23], 1800);
  assert.equal(r.cells[1][0], 1800);
  assert.equal(r.cells[0][0], 900);
  assert.equal(r.cells[6][23], 900);
  assert.equal(r.total, 10800);
  assert.equal(r.excluded, 7200);
  assert.deepEqual(r.peakHours, [10]);
});

test('prayer tracking deduplicates records, respects corrections and never counts future days', () => {
  const day = new Date(2026, 8, 28, 12), key = datekey(day);
  const records = names.map(name => ({ name, at: day.toISOString(), seconds: 300 }));
  records.push(records[0]);
  let r = prayerWeek(records, {}, day, day);
  assert.equal(r.total, 5); assert.equal(r.fullDays, 1); assert.equal(r.counts.Sabah, 1);
  r = prayerWeek(records, { [key]: { Sabah: false }, '2026-09-29': { Sabah: true } }, day, day);
  assert.equal(r.total, 4); assert.equal(r.fullDays, 0); assert.equal(r.days[1].future, true);
  const state = fresh(); state.prayerChecks = { [key]: { Sabah: false, Öğle: true } };
  const restored = normalizeBackup(state, { fresh, isDateKey, names });
  assert.deepEqual(restored.prayerChecks, state.prayerChecks);
  assert.throws(() => normalizeBackup({ ...state, prayerChecks: { 'bad-date': { Sabah: true } } }, { fresh, isDateKey, names }));
});
