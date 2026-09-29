// Procedural soundscapes: no remote media, downloads or third-party recordings.
export const SOUND_IDS = ["rain", "wind", "waves", "brown"];
const clamp = (value) => Math.max(0, Math.min(1, Number(value) || 0));
export function createAmbientAudio({ createContext = () => {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) throw new Error("Audio unavailable");
  return new AC();
}, onChange = () => {} } = {}) {
  let context, master, disposed = false;
  const voices = new Map(), pending = new Map();
  function stop(id) {
    pending.delete(id);
    const voice = voices.get(id);
    if (voice) {
      voices.delete(id);
      voice.gain.gain.setTargetAtTime(0, context.currentTime, 0.04);
      voice.source.stop(context.currentTime + 0.25);
    }
    onChange();
  }
  async function start(id, volume) {
    if (disposed || !SOUND_IDS.includes(id)) return;
    stop(id);
    const token = {};
    pending.set(id, token);
    try {
      context ||= createContext();
      if (!master) {
        master = context.createGain();
        master.gain.value = 0.65;
        master.connect(context.destination);
        context.onstatechange = onChange;
      }
      await context.resume();
      if (disposed || pending.get(id) !== token) return;
      if (context.state !== "running") throw new Error("Audio interrupted");
      // Periodic envelope and short seam crossfade keep the loop smooth.
      const length = Math.floor(context.sampleRate * 12);
      const buffer = context.createBuffer(2, length, context.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const samples = buffer.getChannelData(channel);
        let brown = 0;
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1;
          brown = (brown + white * 0.02) / 1.02;
          const phase = i / length * Math.PI * 2;
          samples[i] = id === "brown" ? brown * 3.5
            : id === "rain" ? white * 0.25
            : id === "wind" ? brown * (1.5 + 0.7 * Math.sin(phase))
            : (white * 0.12 + brown) * (0.55 + 0.45 * Math.sin(phase));
        }
        const seam = Math.floor(context.sampleRate * 0.04);
        for (let i = 0; i < seam; i++) {
          const mix = i / seam;
          samples[length - seam + i] = samples[length - seam + i] * (1 - mix) + samples[i] * mix;
        }
      }
      const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
      source.buffer = buffer;
      source.loop = true;
      source.loopStart = 0.04;
      filter.type = "lowpass";
      filter.frequency.value = { rain: 4500, wind: 650, waves: 1800, brown: 550 }[id];
      filter.Q.value = 0.3;
      gain.gain.value = 0;
      source.connect(filter).connect(gain).connect(master);
      source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
      voices.set(id, { source, gain });
      pending.delete(id);
      gain.gain.setTargetAtTime(clamp(volume), context.currentTime, 0.15);
      source.start();
      onChange();
    } catch (error) {
      if (pending.get(id) !== token) return;
      pending.delete(id);
      stop(id);
      throw error;
    }
  }
  function stopAll() { SOUND_IDS.forEach(stop); }
  return {
    start, stop, stopAll,
    isActive: (id) => voices.has(id) && context?.state === "running",
    isSelected: (id) => voices.has(id) || pending.has(id),
    setVolume(id, value) { voices.get(id)?.gain.gain.setTargetAtTime(clamp(value), context.currentTime, 0.05); },
    setMaster(value) { if (master) master.gain.gain.setTargetAtTime(clamp(value), context.currentTime, 0.05); },
    dispose() { disposed = true; stopAll(); if (context) { context.onstatechange = null; void context.close().catch(() => {}); } },
  };
}
