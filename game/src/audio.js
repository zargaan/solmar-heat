// All sound is synthesized with WebAudio — no audio files, no network.
// The context is created lazily on the first user gesture so browsers allow it.
export function createAudio() {
  let ctx = null;
  let silenced = false;
  let engineOsc = null;
  let engineGain = null;

  const ensureCtx = () => {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        engineOsc = ctx.createOscillator();
        engineGain = ctx.createGain();
        engineOsc.type = 'sawtooth';
        engineOsc.frequency.value = 50;
        engineGain.gain.value = 0;
        engineOsc.connect(engineGain);
        engineGain.connect(ctx.destination);
        engineOsc.start();
      } catch {
        ctx = null;
      }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  };

  const tone = (freq, dur, type = 'square', vol = 0.08) => {
    if (silenced || !ensureCtx()) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = vol;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.stop(ctx.currentTime + dur);
  };

  const burst = (dur, vol = 0.15) => {
    if (silenced || !ensureCtx()) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    src.buffer = buf;
    gain.gain.value = vol;
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  };

  return {
    unlock: ensureCtx,
    toggleMute() {
      silenced = !silenced;
      return silenced;
    },
    engine(speed01) {
      if (engineGain && ctx) engineGain.gain.value = silenced ? 0 : 0.02 + speed01 * 0.05;
      if (engineOsc && ctx) engineOsc.frequency.value = 50 + speed01 * 140;
    },
    shoot() { burst(0.12, 0.2); },
    siren() {
      tone(700, 0.18, 'sine', 0.05);
      setTimeout(() => tone(950, 0.18, 'sine', 0.05), 180);
    },
    pickup() {
      tone(880, 0.1);
      setTimeout(() => tone(1320, 0.15), 90);
    },
    mission() {
      [523, 659, 784, 1046].forEach((freq, i) => setTimeout(() => tone(freq, 0.18, 'triangle', 0.1), i * 120));
    },
    hurt() { tone(160, 0.2, 'sawtooth', 0.12); },
  };
}
