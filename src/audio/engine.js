// Core audio engine. Everything is synthesized — no audio assets.

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.radioBus = null;   // headphone/radio content (static, voices)
    this.roomBus = null;    // sounds physically in/around the room
    this.micBus = null;     // directional mic monitor (a copy of emitters)
    this.reverb = null;
    this.noiseBuf = null;
    this._started = false;
  }

  start() {
    if (this._started) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 6;
    this.master.connect(comp).connect(ctx.destination);

    this.radioBus = ctx.createGain(); // dry-ish, slight room
    this.radioBus.gain.value = 1;
    this.roomBus = ctx.createGain();
    this.roomBus.gain.value = 1;
    this.micBus = ctx.createGain();   // mic monitor feed, band-limited feel
    this.micBus.gain.value = 1;

    // cheap generated-impulse reverb for concrete room
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(1.6, 2.2);
    this.revGain = ctx.createGain();
    this.revGain.gain.value = 0.28;
    this.reverb.connect(this.revGain).connect(this.master);

    this.radioBus.connect(this.master);
    this.roomBus.connect(this.master);
    const micFilter = ctx.createBiquadFilter(); // mic sounds slightly canned
    micFilter.type = 'bandpass';
    micFilter.frequency.value = 900;
    micFilter.Q.value = 0.5;
    this.micBus.connect(micFilter).connect(this.master);

    // send taps to reverb
    this.roomBus.connect(this.reverb);

    this.noiseBuf = this._noise(2);
    this._started = true;
  }

  _noise(seconds) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  _impulse(seconds, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  noiseSource(loop = true) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = loop;
    return s;
  }

  // Panner for a bearing in degrees (0 = ahead of player, ±90 sides, 180 behind).
  panner(bearingDeg, distance = 1) {
    const pan = this.ctx.createStereoPanner();
    pan.pan.value = Math.sin((bearingDeg * Math.PI) / 180) *
      (Math.abs(bearingDeg) > 90 ? -1 : 1) * 0.9;
    const g = this.ctx.createGain();
    g.gain.value = 1 / (1 + distance * 0.6);
    pan.connect(g);
    return { input: pan, output: g };
  }

  now() { return this.ctx ? this.ctx.currentTime : 0; }
  resume() { if (this.ctx?.state === 'suspended') this.ctx.resume(); }
}

export const audio = new AudioEngine();
