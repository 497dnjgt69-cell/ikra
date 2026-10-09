// Read current settings lazily because backup restore replaces application state.
export function createAudio(getSettings) {
  let audioCtx, marbleBuffer, leafBuffer, lastMarble = -Infinity;
  function playSound(kind = "tap") {
    const d = getSettings();
    if (!d.sound || d.soundVolume <= 0) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = audioCtx || new AC();
      if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
      if (d.theme === "neumorphism" && ["tap", "start", "pause"].includes(kind)) {
        const now = audioCtx.currentTime;
        if (now - lastMarble < 0.035) return;
        lastMarble = now;
        if (!marbleBuffer) {
          const duration = 0.16, rate = audioCtx.sampleRate;
          marbleBuffer = audioCtx.createBuffer(1, Math.ceil(rate * duration), rate);
          const samples = marbleBuffer.getChannelData(0);
          let seed = 73;
          for (let i = 0; i < samples.length; i++) {
            const t = i / rate;
            seed = (1664525 * seed + 1013904223) >>> 0;
            const impact = (seed / 4294967296 * 2 - 1) * Math.exp(-t * 650) * 0.08;
            const body = Math.sin(2 * Math.PI * 310 * t) * Math.exp(-t * 42) * 0.62;
            const ring = Math.sin(2 * Math.PI * 740 * t) * Math.exp(-t * 85) * 0.10;
            samples[i] = (impact + body + ring) * Math.min(1, t / 0.0015);
          }
        }
        const source = audioCtx.createBufferSource(), gain = audioCtx.createGain();
        source.buffer = marbleBuffer;
        source.playbackRate.value = kind === "pause" ? 0.88 : kind === "start" ? 1.08 : 1;
        gain.gain.value = d.soundVolume * 0.32;
        source.connect(gain).connect(audioCtx.destination);
        source.onended = () => { source.disconnect(); gain.disconnect(); };
        source.start();
        return;
      }
      if (d.theme === "nature" && ["tap", "start", "pause"].includes(kind)) {
        const now = audioCtx.currentTime;
        if (now - lastMarble < 0.055) return;
        lastMarble = now;
        if (!leafBuffer) {
          const duration = 0.24, rate = audioCtx.sampleRate;
          leafBuffer = audioCtx.createBuffer(1, Math.ceil(rate * duration), rate);
          const samples = leafBuffer.getChannelData(0);
          let seed = 137, low = 0, smooth = 0;
          // Soft band-limited noise in overlapping grains evokes brushing leaves.
          const lowAlpha = 1 - Math.exp(-2 * Math.PI * 450 / rate);
          const highAlpha = 1 - Math.exp(-2 * Math.PI * 4300 / rate);
          for (let i = 0; i < samples.length; i++) {
            const t = i / rate;
            seed = (1664525 * seed + 1013904223) >>> 0;
            const noise = seed / 4294967296 * 2 - 1;
            low += lowAlpha * (noise - low);
            smooth += highAlpha * (noise - low - smooth);
            const grains = Math.exp(-(((t - 0.045) / 0.022) ** 2)) +
              0.65 * Math.exp(-(((t - 0.105) / 0.032) ** 2)) +
              0.3 * Math.exp(-(((t - 0.165) / 0.024) ** 2));
            const edge = Math.min(1, t / 0.012, (duration - t) / 0.025);
            samples[i] = smooth * grains * edge * 0.7;
          }
        }
        const source = audioCtx.createBufferSource(), gain = audioCtx.createGain();
        source.buffer = leafBuffer;
        source.playbackRate.value = kind === "pause" ? 0.9 : kind === "start" ? 1.06 : 1;
        gain.gain.value = d.soundVolume * 0.38;
        source.connect(gain).connect(audioCtx.destination);
        source.onended = () => { source.disconnect(); gain.disconnect(); };
        source.start();
        return;
      }
      if (kind === "wind") {
        const seconds = 1.6,
          buffer = audioCtx.createBuffer(
            1,
            Math.ceil(audioCtx.sampleRate * seconds),
            audioCtx.sampleRate,
          ),
          samples = buffer.getChannelData(0);
        let smooth = 0;
        for (let i = 0; i < samples.length; i++) {
          smooth = (smooth + Math.random() * 0.12 - 0.06) / 1.025;
          samples[i] = smooth * 1.5;
        }
        const source = audioCtx.createBufferSource(),
          filter = audioCtx.createBiquadFilter(),
          gain = audioCtx.createGain(),
          now = audioCtx.currentTime;
        source.buffer = buffer;
        filter.type = "lowpass";
        filter.Q.value = 0.2;
        filter.frequency.setValueAtTime(190, now);
        filter.frequency.exponentialRampToValueAtTime(470, now + 0.7);
        filter.frequency.exponentialRampToValueAtTime(150, now + seconds);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(d.soundVolume * 0.18, now + 0.65);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
        source.connect(filter).connect(gain).connect(audioCtx.destination);
        source.start();
        source.onended = () => {
          source.disconnect();
          filter.disconnect();
          gain.disconnect();
        };
        return;
      }
      const patterns = {
        tap: [600],
        start: [440, 660],
        pause: [520, 390],
        finish: [523.25, 659.25, 783.99],
      };
      const notes = patterns[kind] || patterns.tap;
      let now = audioCtx.currentTime;
      notes.forEach((freq, i) => {
        let o = audioCtx.createOscillator(),
          g = audioCtx.createGain(),
          t = now + i * 0.09;
        o.type = "sine";
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(d.soundVolume * 0.11, t + 0.009);
        g.gain.exponentialRampToValueAtTime(
          0.0001,
          t + (kind === "finish" ? 0.48 : 0.15),
        );
        o.connect(g);
        g.connect(audioCtx.destination);
        o.start(t);
        o.stop(t + 0.55);
        o.onended = () => {
          o.disconnect();
          g.disconnect();
        };
      });
    } catch {}
  }

  playSound.dispose = () => { audioCtx?.close().catch(() => {}); audioCtx = null; marbleBuffer = null; leafBuffer = null; lastMarble = -Infinity; };
  return playSound;
}
