// Read current settings lazily because backup restore replaces application state.
export function createAudio(getSettings) {
  let audioCtx;
  function playSound(kind = "tap") {
    const d = getSettings();
    if (!d.sound || d.soundVolume <= 0) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = audioCtx || new AC();
      if (audioCtx.state === "suspended") audioCtx.resume();
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

  return playSound;
}
