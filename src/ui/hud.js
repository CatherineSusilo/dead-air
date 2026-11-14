import { TUNER } from '../config.js';

// DOM HUD: CRT transcript (typewriter), the pop-up console device,
// prompts, tape log.

export class HUD {
  constructor() {
    this.crt = document.getElementById('crt');
    this.objective = document.getElementById('objective-text');
    this.hint = document.getElementById('hint');
    this.promptEl = document.getElementById('prompt');
    this.tapeList = document.getElementById('tape-list');
    this.scare = document.getElementById('scare');

    // console device elements
    this.consoleEl = document.getElementById('console');
    this.cFreq = document.getElementById('c-freq');
    this.cNeedle = document.getElementById('c-needle');
    this.cSig = document.getElementById('c-sig');
    this.cDial = document.getElementById('c-dial');
    this.cMic = document.getElementById('c-mic');
    this.cMicSig = document.getElementById('c-micsig');
    this.cMNeedle = document.getElementById('c-mneedle');
    this.cRec = document.getElementById('c-rec');
    this.cLed = document.getElementById('c-led');
    this.cBRec = document.getElementById('c-brec');
    this.cBPlay = document.getElementById('c-bplay');

    this._queue = [];
    this._typing = false;
    this._cursor = this.crt.querySelector('.cursor');
  }

  // ---------- CRT transcript ----------
  print(cls, text) {
    return new Promise((res) => {
      this._queue.push({ cls, text, res });
      this._drain();
    });
  }

  async _drain() {
    if (this._typing) return;
    const item = this._queue.shift();
    if (!item) return;
    this._typing = true;
    const line = document.createElement('div');
    line.className = item.cls;
    this.crt.insertBefore(line, this._cursor);
    // scroll: keep last ~8 lines
    while (this.crt.children.length > 10) this.crt.removeChild(this.crt.firstChild);
    for (let i = 0; i < item.text.length; i++) {
      line.textContent += item.text[i];
      if (i % 3 === 0) await this._sleep(20 + Math.random() * 28);
    }
    item.res();
    this._typing = false;
    this._drain();
  }

  // ---------- console ----------
  showConsole(on) { this.consoleEl.classList.toggle('open', on); }

  setObjective(t) { this.objective.textContent = t.toUpperCase(); }
  setHint(t) { this.hint.textContent = t || ''; }

  prompt(t) {
    if (t) { this.promptEl.innerHTML = t; this.promptEl.classList.add('show'); }
    else this.promptEl.classList.remove('show');
  }

  setFreq(f) {
    this.cFreq.textContent = f.toFixed(1);
    const t = (f - TUNER.MIN) / (TUNER.MAX - TUNER.MIN);
    this.cNeedle.style.left = `${t * 100}%`;
    this.cDial.style.transform = `rotate(${t * 300 - 150}deg)`;
  }

  setSignal(c) { this.cSig.style.width = `${Math.round(c * 100)}%`; }

  setMic(deg, s) {
    this.cMic.textContent = `${String(deg).padStart(3, '0')}°`;
    this.cMicSig.style.width = `${Math.round(s * 100)}%`;
    this.cMNeedle.style.transform = `rotate(${deg}deg)`;
    this.cMNeedle.style.transformOrigin = '50% 0';
  }

  setRec(state, sub) {
    this.cRec.textContent = `${state} ${sub}`;
    this.cLed.classList.toggle('on', state === 'REC');
    this.cBRec.classList.toggle('pressed', state === 'REC');
    this.cBPlay.classList.toggle('pressed', state === 'PLAY');
  }

  flashRec(msg) {
    this.cRec.textContent = msg;
    setTimeout(() => { this.cRec.textContent = 'IDLE'; }, 900);
  }

  addTape(tape) {
    const d = document.createElement('div');
    d.className = 'tape';
    d.textContent = `▸ ${tape.label}`;
    this.tapeList.appendChild(d);
  }

  markTapeHidden(tape) {
    const el = this.tapeList.children[tape.id - 1];
    if (el) { el.classList.add('hidden-layer'); el.textContent += ' — LAYER FOUND'; }
  }

  scareFlash(strength = 1) {
    this.scare.style.transition = 'none';
    this.scare.style.opacity = String(0.7 * strength);
    requestAnimationFrame(() => {
      this.scare.style.transition = 'opacity 1.6s ease';
      this.scare.style.opacity = '0';
    });
  }

  _sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
}
