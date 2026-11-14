// DOM HUD: CRT transcript (typewriter), status boxes, prompts, tape log.

export class HUD {
  constructor() {
    this.crt = document.getElementById('crt');
    this.objective = document.getElementById('objective-text');
    this.promptEl = document.getElementById('prompt');
    this.freqEl = document.getElementById('freq-val');
    this.sigEl = document.getElementById('sig-meter');
    this.micEl = document.getElementById('mic-val');
    this.micMeterEl = document.getElementById('mic-meter');
    this.recEl = document.getElementById('rec-val');
    this.tapeList = document.getElementById('tape-list');
    this.scare = document.getElementById('scare');
    this.boxes = {
      tuner: document.getElementById('box-tuner'),
      mic: document.getElementById('box-mic'),
      rec: document.getElementById('box-rec'),
    };

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
    // scroll: keep last ~7 lines
    while (this.crt.children.length > 9) this.crt.removeChild(this.crt.firstChild);
    for (let i = 0; i < item.text.length; i++) {
      line.textContent += item.text[i];
      if (i % 3 === 0) await this._sleep(22 + Math.random() * 30);
    }
    item.res();
    this._typing = false;
    this._drain();
  }

  setBox(name, active) { this.boxes[name]?.classList.toggle('active', active); }
  setObjective(t) { this.objective.textContent = t.toUpperCase(); }
  prompt(t) {
    if (t) { this.promptEl.innerHTML = t; this.promptEl.classList.add('show'); }
    else this.promptEl.classList.remove('show');
  }
  setFreq(f) { this.freqEl.textContent = `${f.toFixed(1)} MHz`; }
  setSignal(c) { this.sigEl.style.width = `${Math.round(c * 100)}%`; }
  setMic(deg, s) {
    this.micEl.textContent = `${String(deg).padStart(3, '0')}°`;
    this.micMeterEl.style.width = `${Math.round(s * 100)}%`;
  }
  setRec(state, sub) {
    this.recEl.textContent = `${state} ${sub}`;
    this.boxes.rec.classList.toggle('rec', state === 'REC');
    this.boxes.rec.classList.add('active');
  }
  flashRec(msg) {
    this.recEl.textContent = msg;
    setTimeout(() => { this.recEl.textContent = 'IDLE'; }, 900);
  }
  addTape(tape) {
    const d = document.createElement('div');
    d.className = 'tape';
    d.textContent = `▸ ${tape.label}`;
    this.tapeList.appendChild(d);
  }
  markTapeHidden(tape) {
    const els = this.tapeList.children;
    const el = els[tape.id - 1];
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
