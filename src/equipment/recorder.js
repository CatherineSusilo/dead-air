import { audio } from '../audio/engine.js';
import { bus } from '../config.js';
import { radio } from '../audio/radio.js';
import { tapeHiss, phoneBeep } from '../audio/sfx.js';
import { speak, whisper, playLine } from '../audio/voice.js';

// Cassette recorder. Recording captures whatever the tuner is locked onto —
// the "content" is scripted by the director (each live transmission registers
// a capturable line). Playback re-voices the line AND its hidden layer.

const MAX_TAPES = 6;

export class Recorder {
  constructor(refs, hud) {
    this.refs = refs;
    this.hud = hud;
    this.tapes = [];
    this.recording = false;
    this.playing = false;
    this.recTime = 0;
    this._hiss = null;
    this._currentLine = null;  // set by director when a transmission airs
    this._spin = 0;
  }

  // director calls this whenever a line airs on the radio
  captureContext(line) { this._currentLine = line; }

  toggleRecord() {
    if (this.recording) return this.stopRecord();
    if (this.playing) this.stopPlayback();
    if (this.tapes.length >= MAX_TAPES) {
      this.hud.flashRec('TAPE FULL');
      return;
    }
    this.recording = true;
    this.recTime = 0;
    this._hiss = tapeHiss();
    this.refs.recLed.material.color.set(0xff3020);
    this.hud.setRec('REC', '00:00');
    bus.emit('attention', 'RECORD');
    bus.emit('recordStart');
  }

  stopRecord() {
    if (!this.recording) return;
    this.recording = false;
    this._hiss?.stop();
    this.refs.recLed.material.color.set(0x220505);
    const probe = radio.probe();
    const line = this._currentLine;
    const usable = this.recTime >= 2.0;
    if (usable && (probe.clarity > 0.5 || line)) {
      const n = this.tapes.length + 1;
      const tape = {
        id: n,
        signal: probe.signal || (line ? line.signal : null) || 'unknown',
        label: `TAPE 0${n} — ${Math.round(this.recTime)}s`,
        line: line?.text || null,
        timbre: line?.timbre || 'A',
        ttsId: line?.ttsId || null,
        hidden: !!line,
        duration: this.recTime,
      };
      this.tapes.push(tape);
      this.hud.addTape(tape);
      this.hud.setRec('STOP', `${this.tapes.length} TAPES`);
      bus.emit('tapeRecorded', tape);
    } else {
      this.hud.setRec('STOP', 'NO SIGNAL');
      bus.emit('tapeBad');
    }
    this._currentLine = null;
  }

  playLast() {
    if (this.playing || this.recording) return;
    const tape = this.tapes[this.tapes.length - 1];
    if (!tape) { this.hud.flashRec('NO TAPE'); return; }
    this.playing = tape;
    this._hiss = tapeHiss();
    this.hud.setRec('PLAY', tape.label);
    bus.emit('attention', 'PLAYBACK');
    bus.emit('playback', tape);

    (async () => {
      let base = 0;
      if (tape.phone) phoneBeep(); // answering-machine style lead-in
      const lead = tape.phone ? 0.8 : 0;
      const dur = tape.ttsId
        ? await playLine(tape.ttsId, { timbre: tape.timbre, gain: 0.7, when: lead })
        : 0;
      base = lead + (dur || speak(tape.line || '...', {
        timbre: tape.timbre, gain: tape.line ? 0.5 : 0.15, rate: 0.92, when: lead,
      }));
      const total = Math.max(base, tape.duration * 0.6);
      // hidden layer — the part you couldn't hear live
      if (tape.hidden) {
        setTimeout(() => {
          if (!this.playing) return;
          whisper(tape.hiddenLine || tape.line || 'it hears the tape too', { gain: 0.22, pan: -0.2, rate: 0.55 });
        }, Math.max(400, base * 450));
      }
      this._playTimer = setTimeout(() => this.stopPlayback(), total * 1000 + 600);
    })();
  }

  stopPlayback() {
    if (!this.playing) return;
    this.playing = null;
    clearTimeout(this._playTimer);
    this._hiss?.stop();
    this.hud.setRec('STOP', `${this.tapes.length} TAPES`);
    bus.emit('playbackEnd');
  }

  update(dt) {
    if (this.recording) {
      this.recTime += dt;
      const s = Math.floor(this.recTime);
      this.hud.setRec('REC', `00:${String(s).padStart(2, '0')}`);
      if (this.recTime > 20) this.stopRecord();
    }
    if (this.recording || this.playing) {
      this._spin += dt * (this.recording ? 4 : 2.5);
      this.refs.reelL.rotation.y = this._spin;
      this.refs.reelR.rotation.y = this._spin * 0.8;
    }
  }
}
