import { ATTENTION, SOURCES, bus } from '../config.js';
import { audio } from '../audio/engine.js';
import { speak, whisper } from '../audio/voice.js';
import * as sfx from '../audio/sfx.js';
import { SYS, A, B, X } from './script.js';

const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

const HIDDEN_LINES = [
  'i was here the whole time',
  'it breathes when you breathe',
  'stop recording. it hears the tape too',
  'that voice is not mine anymore',
];

export class Director {
  constructor({ hud, tuner, mic, recorder, refs, lighting, postfx, ambience }) {
    this.hud = hud;
    this.tuner = tuner;
    this.mic = mic;
    this.recorder = recorder;
    this.refs = refs;
    this.lighting = lighting;
    this.postfx = postfx;
    this.ambience = ambience;

    this.attention = 0;
    this.level = 0;
    this.beat = 'boot';
    this.over = false;
    this.shake = 0;

    this._timers = [];
    this._loops = [];
    this._flags = {};
    this._quietTime = 0;
    this._glitch = 0;

    bus.on('attention', (reason) => this.add(ATTENTION[reason] ?? 0, reason));
    bus.on('playback', (tape) => this._onPlayback(tape));
    bus.on('transmit', () => this._onTransmit());
  }

  // ---------- attention ----------
  add(n, reason) {
    if (this.over) return;
    this.attention = Math.min(ATTENTION.MAX, this.attention + n);
    this._checkLevels();
  }

  _checkLevels() {
    const a = this.attention;
    const L = ATTENTION;
    const lvl = a >= L.L4 ? 4 : a >= L.L3 ? 3 : a >= L.L2 ? 2 : a >= L.L1 ? 1 : 0;
    if (lvl > this.level) {
      this.level = lvl;
      this._enterLevel(lvl);
    } else if (lvl < this.level - 1 && this.level < 4) {
      this.level = lvl; // de-escalate; one-shots can re-fire
    }
    if (this.beat === 'free' && this.level >= 4 && !this._flags.finale) {
      this._flags.finale = true;
      this._finale();
    }
  }

  _enterLevel(lvl) {
    if (this.beat !== 'free') return;
    if (lvl === 1 && !this._flags.l1) {
      this._flags.l1 = true;
      this.hud.print('sys', '> ADVISORY: ACOUSTIC ACTIVITY DETECTED ON YOUR LEVEL');
      this._loopAt(4 + Math.random() * 4, () => {
        sfx.metalClang((Math.random() - 0.5) * 140, 2.5, 0, 0.25);
        this._glitchPulse(0.12);
      });
    }
    if (lvl === 2) {
      this._flags.l2 = true;
      this.hud.print('sys', '> ADVISORY: MOVEMENT DETECTED — CORRIDOR B');
      this._loopAt(12, () => {
        sfx.footstepWalk(-70, 60, 2.2, 8, 0.7);
      });
      this._spawnBreather('door', SOURCES.door.world);
      if (this._flags.saidWarn) return;
      this._flags.saidWarn = true;
      this._say('src-b', B.warnRec, 'B').then(() =>
        this._say('src-b', B.learned, 'B'));
    }
    if (lvl === 3) {
      this._flags.l3 = true;
      sfx.knock(SOURCES.door.bearing, 1.2, 0.5, 3);
      this._figureAtWindow(5);
      this.hud.print('sys', '> WARNING: PERIMETER SENSOR TRIP — DOOR 7');
      this._say('src-b', B.outside, 'B');
      this._loopAt(16, () => sfx.knock(SOURCES.door.bearing, 1.2, 0, 2 + (Math.random() * 2 | 0)));
    }
  }

  // ---------- helpers ----------
  async _say(cls, text, timbre = 'A') {
    if (this.over) return;
    const signal = timbre === 'A' ? 'control' : timbre === 'B' ? 'stranger' : 'unknown';
    this.recorder.captureContext({ text, timbre, signal });
    const p = this.hud.print(cls, `> ${text}`);
    speak(text, { timbre, gain: 0.85 });
    return p;
  }

  _after(t, fn) { this._timers.push({ t, fn }); }
  _loopAt(interval, fn) { this._loops.push({ t: interval * (0.5 + Math.random() * 0.5), interval, fn }); }

  _glitchPulse(v) {
    this._glitch = Math.max(this._glitch, v);
  }

  _figureAtWindow(seconds) {
    const f = this.refs.figure;
    f.position.set(1.15, 0.28, -2.868);
    f.rotation.y = 0;
    f.visible = true;
    this._after(seconds, () => { f.visible = false; });
  }

  _spawnBreather(id, world) {
    if (this.mic.emitters.has(id)) return;
    const em = this.mic.spawnEmitter(id, world, { roomLevel: 0.10, micLevel: 1.1 });
    this._loopAt(2.6, () => sfx.emitBreathPulse(em.input, 0.4));
  }

  // ---------- main flow ----------
  async start() {
    for (const line of SYS.boot) {
      await this.hud.print('sys', `> ${line}`);
      await sleep(0.6);
    }
    await sleep(1);
    await this._say('src-a', A.greeting, 'A');
    await sleep(1.5);
    this.beat = 'tune';
    this.hud.setObjective('TUNE RECEIVER TO 87.4 MHZ  [A / D]');
    await this._say('src-a', A.tuneFirst, 'A');
  }

  // called by main when tuner lock state changes
  onLock(signalId, clarity) {
    if (this.over || clarity < 0.55) return;
    this.add(ATTENTION.LOCK, 'LOCK');

    if (this.beat === 'tune' && (signalId === 'control' || signalId === 'stranger')) {
      this._flags.lockT = (this._flags.lockT || 0) + 1;
      if (this._flags.lockT >= 1) {
        this.beat = 'firstcontact';
        this._firstContact();
      }
    }
    if (signalId === 'whisper' && !this._flags.whisperFound) {
      this._flags.whisperFound = true;
      this.hud.print('src-x', '> (a voice, barely under the static)');
      whisper(X.whisper3, { gain: 0.3, rate: 0.6 });
      this.add(6, 'CREEP');
    }
  }

  async _firstContact() {
    await sleep(1);
    await this._say('src-a', A.lockOk, 'A');
    await sleep(2);
    await this._say('src-b', B.first, 'B');
    await this._say('src-b', B.warn1, 'B');
    await sleep(1);
    this.hud.print('sys', '> CARRIER ANOMALY ON 87.4 — SOURCE UNRESOLVED');
    await sleep(2);
    this.beat = 'locate';
    this.hud.setObjective('LOCATE THE SOUND  —  ROTATE MIC [Q / E]');
    await this._say('src-a', A.micTask, 'A');
    // the "anomalous resonance" — a clank loop in the vent
    const em = this.mic.spawnEmitter('vent', SOURCES.vent.world, { roomLevel: 0.14, micLevel: 1.2 });
    this._ventLoop = { em, t: 0 };
    this._flags.aimedTime = 0;
  }

  async _onPlayback(tape) {
    if (this.over) return;
    tape.hiddenLine = tape.line ? tape.line : HIDDEN_LINES[(Math.random() * HIDDEN_LINES.length) | 0];
    tape.hidden = true;
    this._flags.playedOnce = true;
    this._after(1.5, () => this.hud.markTapeHidden(tape));
    if (this.beat === 'record' && !this._flags.recDone) {
      this._flags.recDone = true;
      this._after(4, () => this._recDone());
    }
  }

  async _recDone() {
    await this._say('src-a', A.recDone, 'A');
    await sleep(1);
    await this._say('src-b', B.warnRec, 'B');
    this.beat = 'free';
    this.hud.setObjective('MONITOR FREQUENCIES. KEEP NOISE DOWN.');
    this._say('src-a', A.pestWarn, 'A');
    // re-fire any escalation levels crossed during earlier beats
    if (this.level > 0) this._enterLevel(this.level);
  }

  _onTransmit() {
    if (this.over) return;
    sfx.transmitBeep();
    this.add(ATTENTION.TRANSMIT, 'TRANSMIT');
    if (this.level >= 3 && Math.random() < 0.5 && !this._flags.txReply) {
      this._flags.txReply = true;
      this._after(2.2, () => {
        sfx.knock(SOURCES.door.bearing, 1.0, 0, 3);
        this._after(6, () => { this._flags.txReply = false; });
      });
    }
  }

  async _finale() {
    this.beat = 'finale';
    this.hud.setObjective('STAY QUIET.');
    // breathing right behind the chair
    const em = this.mic.spawnEmitter('behind', SOURCES.behind.world, { roomLevel: 0.35, micLevel: 1.4 });
    this._loopAt(1.7, () => sfx.emitBreathPulse(em.input, 0.55));

    this.hud.print('sys', '> CARRIER ON 87.4 CLIMBING — SIGNAL SOURCE: INSIDE FACILITY');
    whisper(X.whisper3, { gain: 0.4, pan: 0.4, rate: 0.5 });
    await sleep(2);
    this.ambience?.setLevel(0.25, 2);
    this.lighting.kill();
    this.hud.print('sys', '> LIGHTING BUS FAILURE');
    for (let i = 0; i < 3; i++) sfx.emitThump(audio.roomBus, 0.5, 70 + i * 12) || await sleep(0.9);
    await sleep(2.5);
    this.lighting.redAlert(true);
    this.lighting.revive(0.08);
    await this._say('src-x', A.mimic, 'X');
    await sleep(1.5);
    await this._say('src-x', X.mimicB, 'X');
    sfx.doorCreak(SOURCES.door.bearing);
    await sleep(2);
    this._figureAtWindow(4);
    sfx.knock(SOURCES.door.bearing, 0.8, 0, 4);
    await sleep(3.5);
    this.shake = 1;
    sfx.slam(SOURCES.door.bearing);
    this._glitchPulse(0.7);
    this.hud.scareFlash(1);
    whisper(X.whisper2, { gain: 0.5, pan: 0.9, rate: 0.5 });
    whisper(X.whisper1, { gain: 0.4, pan: -0.9, rate: 0.5, when: 1.2 });
    await sleep(3.2);
    bus.emit('gameover', 'dead');
  }

  _checkQuiet(dt) {
    if (this.over || this.beat !== 'free' || this.level < 2 || this._flags.finale) return;
    if (this.attention < 14) {
      this._quietTime += dt;
      if (this._quietTime > 40 && !this._flags.survived) {
        this._flags.survived = true;
        this.over = true;
        bus.emit('gameover', 'survived');
      }
    } else {
      this._quietTime = 0;
    }
  }

  update(dt, probe) {
    if (this.over) return;

    // player may already be parked on the band when the directive arrives —
    // accept a held lock, not just a fresh lock event
    if (this.beat === 'tune' && probe && probe.clarity > 0.55 &&
        (probe.signal === 'control' || probe.signal === 'stranger')) {
      this.beat = 'firstcontact';
      this._firstContact();
    }

    // attention decay
    this.attention = Math.max(0, this.attention - ATTENTION.DECAY_PER_SEC * dt);
    this.lighting.setStress(Math.min(1, this.attention / 90) * 0.85);

    // glitch decay
    this._glitch = Math.max(0, this._glitch - dt * 1.4);
    this.postfx.setGlitch(this._glitch + Math.min(0.15, this.attention / 900));
    this.shake = Math.max(0, this.shake - dt * 0.8);

    // timers
    for (let i = this._timers.length - 1; i >= 0; i--) {
      const tm = this._timers[i];
      tm.t -= dt;
      if (tm.t <= 0) { this._timers.splice(i, 1); tm.fn(); }
    }
    for (const lp of this._loops) {
      lp.t -= dt;
      if (lp.t <= 0) { lp.t = lp.interval * (0.7 + Math.random() * 0.6); lp.fn(); }
    }

    // locate beat — check mic aim on the vent
    if (this.beat === 'locate' && this._ventLoop) {
      const { em } = this._ventLoop;
      this._ventLoop.t -= dt;
      if (this._ventLoop.t <= 0) {
        this._ventLoop.t = 0.8 + Math.random() * 0.7;
        sfx.emitClank(em.input, 0.5);
      }
      if (em.aim > 0.7) {
        this._flags.aimedTime += dt;
        if (this._flags.aimedTime > 1.2) {
          this.mic.removeEmitter('vent');
          this._ventLoop = null;
          this.beat = 'located';
          this._afterLocate();
        }
      } else {
        this._flags.aimedTime = 0;
      }
    }

    // gentle nag if the player stalls on the recording task
    if (this.beat === 'record') {
      this._flags.recNag = (this._flags.recNag || 0) + dt;
      if (this._flags.recNag > 90) {
        this._flags.recNag = 0;
        this._say('src-a', A.recTask, 'A');
      }
    }

    this._checkQuiet(dt);
  }

  async _afterLocate() {
    await this._say('src-a', A.micDone, 'A');
    await sleep(1.5);
    await this._say('src-b', B.warnMic, 'B');
    await sleep(1);
    this.beat = 'record';
    this.hud.setObjective('RECORD TRAFFIC [R]  THEN  PLAY BACK [P]');
    await this._say('src-a', A.recTask, 'A');
    // player may have jumped the gun and already played a tape
    if (this._flags.playedOnce && !this._flags.recDone) {
      this._flags.recDone = true;
      this._after(3, () => this._recDone());
      return;
    }
    // air something worth taping — an odd scheduled broadcast
    this._after(6, () => {
      if (this.beat === 'record') this._say('src-b', B.warnRec, 'B');
    });
  }
}
