// Tiny synthesized soundboard: no audio files, everything is WebAudio
// oscillators, so the game stays offline and self-contained.
export function createSoundboard() {
  let ctx = null;
  let muted = false;
  let sizzleTimer = null;

  function ensure() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, when = 0) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noiseBurst(dur, vol, freq) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const gain = c.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(c.destination);
    src.start();
  }

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    get muted() { return muted; },
    grab() { tone(520, 0.08, 'triangle', 0.12); },
    chop() { noiseBurst(0.07, 0.25, 1800); tone(180, 0.06, 'square', 0.08); },
    chopped() { tone(660, 0.1, 'triangle', 0.14); tone(880, 0.12, 'triangle', 0.12, 0.08); },
    dropIn() { noiseBurst(0.12, 0.18, 700); tone(300, 0.1, 'sine', 0.1); },
    ding() { tone(1046, 0.35, 'sine', 0.16); tone(1568, 0.4, 'sine', 0.1, 0.05); },
    coin() { tone(988, 0.09, 'square', 0.08); tone(1319, 0.14, 'square', 0.08, 0.08); },
    wrong() { tone(220, 0.18, 'sawtooth', 0.09); tone(175, 0.22, 'sawtooth', 0.08, 0.1); },
    burn() { noiseBurst(0.4, 0.2, 300); tone(140, 0.4, 'sawtooth', 0.1); },
    tick() { tone(1200, 0.05, 'square', 0.06); },
    startSizzle() {
      if (sizzleTimer) return;
      sizzleTimer = setInterval(() => noiseBurst(0.18, 0.05, 3200), 200);
    },
    stopSizzle() {
      if (sizzleTimer) { clearInterval(sizzleTimer); sizzleTimer = null; }
    },
  };
}
