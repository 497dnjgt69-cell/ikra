import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh } from '../js/core/default-state.js';
import { backupSnapshot } from '../js/core/backup-snapshot.js';
import { aggregateStats } from '../js/core/statistics.js';
import { normalizeBackup } from '../js/core/backup-validation.js';

test('backup credits only elapsed focus time without mutating live state', () => {
  const state = fresh();
  state.timer = { running: true, startedAt: 1000, endAt: 61000, remaining: 60 };
  const original = structuredClone(state);
  const backup = backupSnapshot(state, 31000);
  assert.equal(backup.sessions[0].seconds, 30);
  assert.equal(backup.timer.remaining, 30);
  assert.equal(backup.timer.running, false);
  assert.deepEqual(state, original);
  assert.equal(backupSnapshot(state, 91000).sessions[0].seconds, 60);
});

test('stats preserve seconds and exclude the next period boundary', () => {
  const records = [
    {at: new Date(2026,8,28,10).toISOString(), subject:'Anatomy',seconds:90,complete:true},
    {at: new Date(2026,8,29,10).toISOString(), subject:'Anatomy',seconds:30,complete:false},
    {at: new Date(2026,9,5).toISOString(), subject:'Anatomy',seconds:600,complete:true},
  ];
  const result = aggregateStats(records,'week',new Date(2026,8,29));
  assert.equal(result.total,120);
  assert.equal(result.subjects.Anatomy,120);
  assert.equal(result.days,2);
  assert.equal(result.completed,1);
});

test('existing backup format restores courses and history; rejects invalid records', () => {
  const deps={fresh,names:['Sabah','Öğle','İkindi','Akşam','Yatsı'],isDateKey: x=>/^\d{4}-\d{2}-\d{2}$/.test(x)};
  const state=fresh();state.subjects=['Anatomy'];state.subject='Anatomy';state.sessions=[{subject:'Anatomy',seconds:300,at:'2026-09-28T12:00:00Z'}];
  const restored=normalizeBackup({format:'mahir-focus-v1',data:state},deps);
  assert.deepEqual(restored.subjects,state.subjects);
  assert.equal(restored.sessions[0].seconds,300);
  assert.throws(()=>normalizeBackup({...state,sessions:[{seconds:-1}]},deps));
});
