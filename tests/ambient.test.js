import test from 'node:test';
import assert from 'node:assert/strict';
import { createAmbientAudio } from '../js/services/ambient-audio.js';
function fixture() {
  const sources = [], gains = [];
  const param = () => ({ value: 0, setTargetAtTime(value) { this.value = value; } });
  const node = () => ({ connect(other) { return other; }, disconnect() { this.disconnected = true; } });
  const context = {
    sampleRate: 100, currentTime: 0, state: 'suspended', destination: {},
    async resume() { this.state = 'running'; },
    async close() { this.state = 'closed'; },
    createGain() { const n = { ...node(), gain: param() }; gains.push(n); return n; },
    createBuffer(channels, length) { return { getChannelData: () => new Float32Array(length) }; },
    createBiquadFilter() { return { ...node(), frequency: param(), Q: param() }; },
    createBufferSource() { const n = { ...node(), start() { this.started = true; }, stop() { this.stopped = true; this.onended(); } }; sources.push(n); return n; },
  };
  let creations = 0;
  const engine = createAmbientAudio({ createContext() { creations++; return context; } });
  return { engine, context, sources, gains, creations: () => creations };
}
test('ambient audio is opt-in, mixes independently, clamps volume and disposes', async () => {
  const f = fixture();
  assert.equal(f.creations(), 0);
  await f.engine.start('rain', .4);
  await f.engine.start('waves', .2);
  assert.equal(f.creations(), 1);
  assert.ok(f.engine.isActive('rain') && f.engine.isActive('waves'));
  f.engine.setVolume('rain', 3);
  assert.equal(f.gains[1].gain.value, 1);
  f.engine.stop('rain');
  assert.equal(f.engine.isActive('rain'), false);
  assert.equal(f.engine.isActive('waves'), true);
  assert.ok(f.sources[0].stopped && f.sources[0].disconnected);
  f.engine.stopAll();
  assert.equal(f.engine.isActive('waves'), false);
  f.engine.dispose();
  assert.equal(f.context.state, 'closed');
});
test('stop all cancels starts awaiting browser audio permission', async () => {
  const f = fixture(); let resume;
  f.context.resume = () => new Promise(resolve => { resume = () => { f.context.state = 'running'; resolve(); }; });
  const pending = f.engine.start('wind', .5);
  assert.equal(f.engine.isSelected('wind'), true);
  f.engine.stopAll(); resume(); await pending;
  assert.equal(f.sources.length, 0);
  assert.equal(f.engine.isSelected('wind'), false);
});
test('rejected audio start clears state and can be retried', async () => {
  const f = fixture();
  f.context.resume = async () => { throw Error('blocked'); };
  await assert.rejects(f.engine.start('brown', .3));
  assert.equal(f.engine.isSelected('brown'), false);
  f.context.resume = async () => { f.context.state = 'running'; };
  await f.engine.start('brown', .3);
  assert.equal(f.engine.isActive('brown'), true);
  f.engine.dispose();
});
