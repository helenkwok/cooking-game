// Every sound in Steam Lantern is made here at run time with the Web Audio API: no sound files.
// Knife taps, pot splashes, griddle sizzle, the pass bell, ticket chimes, and a soft pentatonic
// street-stall tune under the service that quickens in the rush.

const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16];

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let noise = null;
  let muted = false;
  let musicOn = false;
  let nextBeat = 0;
  let beat = 0;
  let tempo = 0.36;

  function ensure() {
    if (ctx !== null) return true;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.16;
    musicGain.connect(master);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    return true;
  }

  function tone(freq, start, length, { type = 'sine', gain = 0.3, bend = 0, out = master } = {}) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (bend !== 0) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq * bend), start + length);
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(gain, start + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(env).connect(out);
    osc.start(start);
    osc.stop(start + length + 0.02);
  }

  function hiss(start, length, { freq = 2000, q = 1, gain = 0.3, kind = 'bandpass' } = {}) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = kind;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, start);
    env.gain.exponentialRampToValueAtTime(0.0001, start + length);
    src.connect(filter).connect(env).connect(master);
    src.start(start, Math.random() * 0.5);
    src.stop(start + length + 0.02);
  }

  const sounds = {
    chop(stroke) {
      const t = ctx.currentTime;
      hiss(t, 0.05, { freq: 3200 + stroke * 120, q: 2.5, gain: 0.5 });
      tone(180 + stroke * 8, t, 0.06, { type: 'triangle', gain: 0.25, bend: 0.6 });
    },
    chopped() {
      const t = ctx.currentTime;
      tone(660, t, 0.09, { type: 'triangle', gain: 0.18 });
      tone(990, t + 0.06, 0.12, { type: 'triangle', gain: 0.16 });
    },
    pickup() {
      tone(520, ctx.currentTime, 0.07, { type: 'square', gain: 0.06, bend: 1.5 });
    },
    place() {
      tone(300, ctx.currentTime, 0.08, { type: 'triangle', gain: 0.2, bend: 0.7 });
    },
    plate() {
      const t = ctx.currentTime;
      tone(880, t, 0.12, { type: 'sine', gain: 0.18 });
      tone(1320, t + 0.03, 0.14, { type: 'sine', gain: 0.08 });
    },
    splash() {
      const t = ctx.currentTime;
      hiss(t, 0.3, { freq: 900, q: 0.8, gain: 0.35 });
      for (let i = 0; i < 4; i += 1) tone(300 + Math.random() * 300, t + 0.05 + i * 0.06, 0.06, { gain: 0.08, bend: 2 });
    },
    sizzle() {
      hiss(ctx.currentTime, 0.5, { freq: 6000, q: 0.6, gain: 0.25, kind: 'highpass' });
    },
    cooked() {
      const t = ctx.currentTime;
      tone(1046, t, 0.15, { gain: 0.14 });
      tone(1568, t + 0.08, 0.2, { gain: 0.1 });
    },
    perfect() {
      // A rising three-note sparkle for a PERFECT pull.
      const t = ctx.currentTime;
      [1318, 1661, 2093].forEach((f, i) => tone(f, t + i * 0.06, 0.18, { type: 'triangle', gain: 0.12 }));
    },
    burnt() {
      const t = ctx.currentTime;
      tone(140, t, 0.4, { type: 'sawtooth', gain: 0.12, bend: 0.5 });
      hiss(t, 0.5, { freq: 500, q: 0.5, gain: 0.25 });
    },
    serve(combo) {
      // The pass bell: a struck metal partial stack, higher for a longer combo.
      const t = ctx.currentTime;
      const base = 1180 * (1 + Math.min(combo, 6) * 0.03);
      [1, 2.76, 5.4].forEach((partial, i) => tone(base * partial, t, 1.1 - i * 0.3, { gain: 0.2 / (i + 1) }));
      tone(base * 1.5, t + 0.12, 0.6, { gain: 0.06 });
    },
    coin() {
      const t = ctx.currentTime;
      tone(1320, t, 0.06, { type: 'square', gain: 0.05 });
      tone(1760, t + 0.06, 0.12, { type: 'square', gain: 0.05 });
    },
    ticket() {
      const t = ctx.currentTime;
      tone(784, t, 0.12, { type: 'triangle', gain: 0.14 });
      tone(1175, t + 0.1, 0.18, { type: 'triangle', gain: 0.12 });
    },
    expire() {
      const t = ctx.currentTime;
      tone(220, t, 0.35, { type: 'triangle', gain: 0.3, bend: 0.55 });
      tone(165, t + 0.18, 0.45, { type: 'triangle', gain: 0.25, bend: 0.55 });
    },
    tick(last) {
      // The closing clock: a wooden tock each second, sharper on the final three.
      const t = ctx.currentTime;
      tone(last ? 1400 : 900, t, 0.05, { type: 'square', gain: last ? 0.09 : 0.05, bend: 0.7 });
    },
    refuse() {
      tone(150, ctx.currentTime, 0.12, { type: 'square', gain: 0.07 });
    },
    bin() {
      hiss(ctx.currentTime, 0.18, { freq: 400, q: 1, gain: 0.3 });
    },
    phase() {
      const t = ctx.currentTime;
      [0, 4, 7, 12].forEach((step, i) => tone(523 * 2 ** (step / 12), t + i * 0.09, 0.3, { type: 'triangle', gain: 0.14 }));
    },
    over() {
      const t = ctx.currentTime;
      [12, 7, 4, 0].forEach((step, i) => tone(523 * 2 ** (step / 12), t + i * 0.16, 0.5, { type: 'triangle', gain: 0.16 }));
    },
  };

  /** Queue the next bars of the stall tune; call every frame while music plays. */
  function scheduleMusic() {
    if (!musicOn || ctx === null) return;
    while (nextBeat < ctx.currentTime + 0.25) {
      const step = beat % 16;
      const bar = Math.floor(beat / 16) % 4;
      const roots = [0, 5, 7, 3];
      const root = 196 * 2 ** (roots[bar] / 12);
      if (step % 4 === 0) tone(root / 2, nextBeat, tempo * 1.8, { type: 'triangle', gain: 0.35, out: musicGain });
      if (step % 2 === 0 || (step % 3 === 0 && beat % 7 === 0)) {
        const note = PENTATONIC[(beat * 5 + bar * 3) % PENTATONIC.length];
        tone(root * 2 * 2 ** (note / 12), nextBeat, tempo * 0.9, { type: 'sine', gain: 0.22, out: musicGain });
      }
      if (step % 4 === 2) hiss(nextBeat, 0.04, { freq: 7000, q: 1, gain: 0.04 });
      nextBeat += tempo / 2;
      beat += 1;
    }
  }

  return {
    /** Browsers start audio only after a user gesture: call from a click or key handler. */
    unlock() {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
    },
    play(name, arg) {
      if (muted || ctx === null || ctx.state !== 'running' || !sounds[name]) return;
      sounds[name](arg);
    },
    startMusic() {
      if (ctx === null) return;
      musicOn = true;
      nextBeat = ctx.currentTime + 0.1;
    },
    stopMusic() {
      musicOn = false;
    },
    /** Faster tune as the night gets busier: 0 calm, 1 rush. */
    setIntensity(level) {
      tempo = 0.36 - 0.08 * level;
    },
    toggleMute() {
      muted = !muted;
      if (master !== null) master.gain.value = muted ? 0 : 0.55;
      return muted;
    },
    get muted() {
      return muted;
    },
    tick: scheduleMusic,
  };
}
