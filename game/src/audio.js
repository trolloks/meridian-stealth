// All sound is synthesised on the fly with WebAudio: a low museum hum, footsteps,
// the soft ping when a guard starts to notice, the klaxon, relic chimes and the
// heartbeat that quickens as exposure climbs. No audio files, nothing to load.

export class AudioEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.ambientGain = null;
    this.heartbeatTimer = 0;
    this.heartbeatRate = 0;
    this.enabled = false;
  }

  start() {
    if (this.enabled) return;
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    this.context = new Context();
    this.master = this.context.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.context.destination);
    this.enabled = true;
    this.startAmbient();
  }

  resume() {
    if (this.context && this.context.state === 'suspended') this.context.resume();
  }

  startAmbient() {
    const context = this.context;
    const gain = context.createGain();
    gain.gain.value = 0.045;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    filter.Q.value = 0.7;
    const first = context.createOscillator();
    first.type = 'sawtooth';
    first.frequency.value = 43.65;
    const second = context.createOscillator();
    second.type = 'sine';
    second.frequency.value = 65.4;
    second.detune.value = 7;
    first.connect(filter);
    second.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    first.start();
    second.start();
    this.ambientGain = gain;
    const lfo = context.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoGain = context.createGain();
    lfoGain.gain.value = 0.018;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();
  }

  tone(frequency, duration, options = {}) {
    if (!this.enabled) return;
    const context = this.context;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = options.type ?? 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    if (options.slide) oscillator.frequency.exponentialRampToValueAtTime(options.slide, now + duration);
    const volume = options.volume ?? 0.12;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + (options.attack ?? 0.01));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  noise(duration, volume = 0.1, cutoff = 900) {
    if (!this.enabled) return;
    const context = this.context;
    const frames = Math.floor(context.sampleRate * duration);
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < frames; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / frames);
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = context.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start();
  }

  footstep(crouching) {
    this.noise(0.07, crouching ? 0.018 : 0.05, crouching ? 320 : 620);
  }

  guardStep(volume) {
    this.noise(0.09, 0.02 * volume, 260);
  }

  suspect() {
    this.tone(620, 0.12, { type: 'triangle', volume: 0.06, slide: 760 });
  }

  alarm() {
    if (!this.enabled) return;
    const context = this.context;
    for (let index = 0; index < 3; index += 1) {
      const start = context.currentTime + index * 0.32;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(520, start);
      oscillator.frequency.linearRampToValueAtTime(760, start + 0.14);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.09, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.start(start);
      oscillator.stop(start + 0.3);
    }
  }

  pickup(main) {
    const notes = main ? [523.25, 659.25, 783.99, 1046.5] : [659.25, 830.61, 987.77];
    notes.forEach((frequency, index) => {
      setTimeout(() => this.tone(frequency, 0.4, { type: 'sine', volume: 0.09, attack: 0.005 }), index * 70);
    });
  }

  unlock() {
    [392, 523.25, 659.25].forEach((frequency, index) => {
      setTimeout(() => this.tone(frequency, 0.6, { type: 'triangle', volume: 0.07 }), index * 90);
    });
  }

  caught() {
    this.tone(330, 0.5, { type: 'sawtooth', volume: 0.11, slide: 70 });
    setTimeout(() => this.tone(220, 0.7, { type: 'sawtooth', volume: 0.08, slide: 55 }), 120);
  }

  ui() {
    this.tone(880, 0.05, { type: 'square', volume: 0.03 });
  }

  lure() {
    this.noise(0.12, 0.035, 1400);
  }

  lurePing() {
    this.tone(1180, 0.22, { type: 'triangle', volume: 0.07, slide: 1560 });
    setTimeout(() => this.tone(880, 0.18, { type: 'sine', volume: 0.05 }), 80);
  }

  heartbeat(dt, intensity) {
    this.heartbeatRate = intensity;
    if (intensity <= 0.05) return;
    this.heartbeatTimer -= dt;
    if (this.heartbeatTimer > 0) return;
    this.heartbeatTimer = 1.15 - intensity * 0.72;
    const volume = 0.05 + intensity * 0.1;
    this.tone(52, 0.16, { type: 'sine', volume, slide: 40 });
    setTimeout(() => this.tone(46, 0.12, { type: 'sine', volume: volume * 0.7, slide: 38 }), 120);
  }
}
