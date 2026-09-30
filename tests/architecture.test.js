import test from "node:test";
import assert from "node:assert/strict";
import { createStore, STORAGE_KEY } from "../js/services/store.js";
import { createAccess, AccessDeniedError } from "../js/services/access.js";
import { createFocusTimer } from "../js/services/focus-timer.js";
import { createPrayerTimer } from "../js/services/prayer-timer.js";
import { createPlanner } from "../js/services/planner.js";
import { createRecords } from "../js/services/records.js";
import { createBackup } from "../js/services/backup.js";
import { createPrayerTimes } from "../js/services/prayer-times.js";
import { fresh } from "../js/core/default-state.js";
function storage(seed) {
  const values = new Map(seed ? [[STORAGE_KEY, JSON.stringify(seed)]] : []);
  return {
    fail: false,
    getItem: (key) => values.get(key) || null,
    setItem(key, value) {
      if (this.fail) throw Error("QuotaExceeded");
      values.set(key, value);
    },
  };
}
function fixture(seed) {
  let time = Date.parse("2026-09-28T12:00:00Z");
  const disk = storage(seed),
    now = () => time;
  const store = createStore({ storage: disk, now }),
    access = createAccess({ now });
  const completions = [];
  const focus = createFocusTimer({
    store,
    access,
    now,
    onComplete: (e) => completions.push(e),
  });
  const prayer = createPrayerTimer({
    store,
    access,
    focus,
    now,
    onComplete: (e) => completions.push(e),
  });
  const planner = createPlanner({ store, access, focus });
  const records = createRecords({ store, access, now });
  const backup = createBackup({ store, access, focus, prayer, now });
  return {
    disk,
    store,
    access,
    focus,
    prayer,
    planner,
    records,
    backup,
    now,
    completions,
    advance(ms) {
      time += ms;
    },
  };
}
test("focus pause/resume and reload credit each second once", () => {
  const f = fixture();
  f.planner.addSubject("ANAT 100");
  f.focus.start();
  f.advance(30000);
  f.focus.pause();
  assert.equal(f.store.state.sessions[0].seconds, 30);
  assert.equal(f.store.state.timer.remaining, 2970);
  f.advance(60000);
  f.focus.start();
  f.advance(15000);
  const reloaded = createStore({ storage: f.disk, now: f.now });
  const timer = createFocusTimer({
    store: reloaded,
    access: f.access,
    now: f.now,
  });
  timer.pause();
  assert.equal(
    reloaded.state.sessions.reduce((sum, r) => sum + r.seconds, 0),
    45,
  );
});
test("deadline, auto break, long break, and mode changes do not duplicate study time", () => {
  const f = fixture();
  f.planner.addSubject("ANAT");
  f.focus.setDuration("focus", 1);
  f.store.update((d) => {
    d.auto = true;
    d.longEvery = 1;
  });
  f.focus.start();
  f.advance(90000);
  f.focus.settle();
  f.focus.settle();
  assert.equal(f.store.state.mode, "long");
  assert.equal(f.store.state.sessions[0].seconds, 60);
  assert.equal(f.completions.length, 1);
  f.advance(30000);
  f.focus.changeMode("focus");
  assert.equal(f.store.state.sessions.length, 1);
  assert.equal(f.store.state.timer.running, false);
});
test("switching subjects attributes elapsed segments to the correct course", () => {
  const f = fixture();
  f.planner.addSubject("ANAT");
  f.planner.ensureSubject("GLPH");
  f.focus.start();
  f.advance(10000);
  f.planner.select("GLPH");
  f.advance(5000);
  f.focus.pause();
  assert.deepEqual(
    f.store.state.sessions.map((s) => [s.subject, s.seconds]),
    [
      ["ANAT", 10],
      ["GLPH", 5],
    ],
  );
});
test("prayer pauses focus, resumes only remaining time, and records once at completion", () => {
  const f = fixture();
  f.planner.addSubject("ANAT");
  f.focus.start();
  f.advance(10000);
  f.prayer.enter();
  assert.equal(f.store.state.timer.running, false);
  assert.equal(f.store.state.sessions[0].seconds, 10);
  f.prayer.setDuration(1);
  f.prayer.begin("Sabah");
  f.advance(20000);
  f.prayer.pause();
  assert.equal(f.store.state.prayerTimer.remaining, 40);
  f.advance(30000);
  f.prayer.begin("Sabah");
  f.advance(50000);
  f.prayer.settle();
  f.prayer.settle();
  f.prayer.leave();
  assert.equal(f.store.state.prayers.length, 1);
  assert.equal(f.store.state.prayers[0].seconds, 60);
});
test("record deletion/undo preserves other concurrent additions and undo is idempotent", () => {
  const f = fixture();
  const a = f.records.addManual({
    subject: "ANAT",
    minutes: 30,
    date: "2026-09-20",
  });
  const undo = f.records.remove(a.id, "study");
  f.records.addManual({ subject: "GLPH", minutes: 15, date: "2026-09-21" });
  undo();
  undo();
  assert.equal(f.store.state.sessions.length, 2);
  assert.equal(
    f.store.state.sessions.reduce((s, r) => s + r.seconds, 0),
    2700,
  );
});
test("failed persistence leaves courses, records, and tasks unchanged", () => {
  const f = fixture();
  f.planner.addSubject("ANAT");
  const before = f.store.state;
  f.disk.fail = true;
  assert.throws(() =>
    f.records.addManual({ subject: "GLPH", minutes: 15, date: "2026-09-21" }),
  );
  assert.strictEqual(f.store.state, before);
  assert.throws(() => f.planner.addTask("Read", ""));
  assert.strictEqual(f.store.state, before);
  assert.throws(() => {
    f.store.state.subject = "mutated";
  }, TypeError);
});
test("legacy backup and running focus restore without granting imported Pro flags", () => {
  const f = fixture();
  f.planner.addSubject("ANAT");
  f.focus.start();
  f.advance(10000);
  const payload = f.backup.export();
  payload.data.isPro = true;
  payload.data.plan = "pro";
  payload.data.entitlements = { plan: "pro" };
  f.backup.restore(payload);
  assert.equal(f.store.state.sessions[0].seconds, 10);
  assert.equal(f.store.state.timer.running, false);
  assert.equal(f.access.plan, "free");
  assert.equal(f.store.state.isPro, undefined);
  assert.ok(f.disk.getItem(STORAGE_KEY + "-before-import"));
});
test("transient ticks do not clone history or persist every second", () => {
  const f = fixture();
  f.planner.addSubject("ANAT");
  f.focus.start();
  const records = f.store.state.sessions,
    saved = f.disk.getItem(STORAGE_KEY);
  f.advance(1000);
  f.focus.settle();
  assert.strictEqual(f.store.state.sessions, records);
  assert.equal(f.disk.getItem(STORAGE_KEY), saved);
  assert.equal(f.store.state.timer.remaining, 2999);
});
test("Pro access denies unknown features, expires, and revokes on provider error", async () => {
  let time = 1000,
    response = { plan: "pro", expiresAt: 2000 };
  const provider = {
    async getEntitlements() {
      if (response instanceof Error) throw response;
      return response;
    },
  };
  const access = createAccess({ provider, now: () => time });
  assert.equal(access.can("timer"), true);
  assert.equal(access.can("custom-presets"), false);
  assert.throws(() => access.require("unknown"), AccessDeniedError);
  await access.refresh();
  assert.equal(access.can("custom-presets"), true);
  time = 2000;
  assert.equal(access.can("custom-presets"), false);
  response = Error("offline");
  await assert.rejects(access.refresh());
  assert.equal(access.plan, "free");
});
test("feature rules are enforced at service actions, independently of UI buttons", () => {
  const f = fixture();
  const access = createAccess({
    catalog: {
      timer: { minimumPlan: "pro" },
      planner: { minimumPlan: "pro" },
      history: { minimumPlan: "pro" },
      backup: { minimumPlan: "pro" },
    },
  });
  const focus = createFocusTimer({ store: f.store, access });
  const records = createRecords({ store: f.store, access });
  assert.throws(() => focus.start(), AccessDeniedError);
  assert.throws(
    () =>
      records.addManual({ subject: "ANAT", minutes: 10, date: "2026-09-20" }),
    AccessDeniedError,
  );
  assert.equal(f.store.state.sessions.length, 0);
});
test("a superseded entitlement response cannot undo a newer restore", async () => {
  let resolve;
  const access = createAccess({
    provider: {
      getEntitlements: () => new Promise((r) => (resolve = r)),
      restore: async () => ({ plan: "free", expiresAt: null }),
    },
  });
  const pending = access.refresh();
  await access.restore();
  resolve({ plan: "pro", expiresAt: null });
  await pending;
  assert.equal(access.plan, "free");
});
test("old prayer requests cannot overwrite a newer manual location or restored data", async () => {
  const f = fixture();
  let resolve;
  const api = { load: () => new Promise((r) => (resolve = r)) };
  const times = createPrayerTimes({
    store: f.store,
    access: f.access,
    api,
    now: f.now,
  });
  const pending = times.fetchForSource({
    type: "address",
    address: "Montreal",
  });
  times.setManual("Sabah", "05:30", "Ottawa");
  resolve({ times: { Sabah: "06:00" }, timezone: "America/Toronto" });
  await pending;
  assert.equal(f.store.state.prayerLocation, "Ottawa");
  assert.equal(f.store.state.prayerTimes.Sabah, "05:30");
  assert.equal(times.loading, false);
});

 test('first manual session selects its course for the next focus session',()=>{
 const f=fixture();f.records.addManual({subject:'ANAT',minutes:30,date:'2026-09-20'});
 assert.equal(f.store.state.subject,'ANAT');f.focus.start();assert.equal(f.store.state.timer.running,true);
 });

test("clock view preserves a running session across return and reload, then credits completion once", () => {
  const f = fixture();
  f.planner.addSubject("ANAT");
  f.focus.setDuration("focus", 1);
  f.focus.start();
  const deadline = f.store.state.timer.endAt;
  f.advance(10000);
  f.focus.changeMode("clock");
  f.advance(20000);
  f.focus.settle();
  assert.equal(f.store.state.timer.running, true);
  assert.equal(f.store.state.timer.remaining, 30);
  assert.equal(f.store.state.timer.endAt, deadline);
  f.focus.changeMode("focus");
  assert.equal(f.store.state.clockView, false);
  assert.equal(f.store.state.timer.endAt, deadline);
  assert.equal(f.store.state.timer.running, true);
  f.focus.changeMode("clock");
  const reloaded = createStore({ storage: f.disk, now: f.now });
  const events = [];
  const timer = createFocusTimer({ store: reloaded, access: f.access, now: f.now, onComplete: e => events.push(e) });
  f.advance(30000);
  timer.settle();
  timer.settle();
  assert.equal(reloaded.state.clockView, true);
  assert.equal(reloaded.state.mode, "break");
  assert.equal(reloaded.state.sessions.reduce((sum, s) => sum + s.seconds, 0), 60);
  assert.equal(events.length, 1);
  timer.changeMode("break");
  assert.equal(reloaded.state.timer.remaining, 600);
});

test("clock view preserves paused timers and auto break completion", () => {
  const f = fixture();
  f.planner.addSubject("ANAT");
  f.focus.start();
  f.advance(10000);
  f.focus.pause();
  f.focus.changeMode("clock");
  f.advance(10000);
  f.focus.changeMode("focus");
  assert.equal(f.store.state.timer.remaining, 2990);
  assert.equal(f.store.state.timer.running, false);
  f.focus.changeMode("break");
  f.focus.setDuration("break", 1);
  f.store.update(d => { d.auto = true; });
  f.focus.start();
  f.focus.changeMode("clock");
  f.advance(60000);
  f.focus.settle();
  assert.equal(f.store.state.mode, "focus");
  assert.equal(f.store.state.clockView, true);
  assert.equal(f.store.state.timer.running, true);
  assert.equal(f.store.state.sessions.reduce((sum, s) => sum + s.seconds, 0), 10);
});

test("prayer start notification fires once, honors location timezone, and skips stale catch-up", () => {
  const f = fixture();
  f.store.update(d => {
    d.prayerDate = "2026-09-28";
    d.prayerTimeZone = "America/Toronto";
    d.prayerTimes = { Sabah: "08:01", Öğle: "08:02", İkindi: "08:03" };
  });
  const events = [];
  const times = createPrayerTimes({ store: f.store, access: f.access, api: {}, now: f.now, onPrayerStart: e => events.push(e) });
  times.checkStarted();
  assert.equal(events.length, 0);
  f.advance(60000);
  times.checkStarted();
  times.checkStarted();
  assert.equal(events.length, 1);
  assert.equal(events[0].name, "Sabah");
  f.advance(-1000);
  times.checkStarted();
  f.advance(1000);
  times.checkStarted();
  assert.equal(events.length, 1);
  f.advance(180000);
  times.checkStarted();
  assert.equal(events.length, 1);
  f.store.update(d => { d.prayerDate = "2026-09-27"; d.prayerTimes = { Yatsı: "08:05" }; });
  f.advance(60000);
  times.checkStarted();
  assert.equal(events.length, 1);
});
