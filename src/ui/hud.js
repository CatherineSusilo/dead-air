// DOM HUD: CRT transcript (typewriter), the pop-up console device,
// prompts, tape log.

export class HUD {
  constructor() {
    this.crt = document.getElementById('crt');
    this.objective = document.getElementById('objective-text');
    this.hint = document.getElementById('hint');
    this.promptEl = document.getElementById('prompt');
    this.tapeList = document.getElementById('tape-list');
    this.micRead = document.getElementById('micread');
    this.scare = document.getElementById('scare');

    this.device = null;   // the low-poly handheld tuner (set by main)

    this._queue = [];
    this._typing = false;
    this._cursor = this.crt.querySelector('.cursor');
  }

  attachDevice(device) { this.device = device; }

  // wipe the transcript — used when a task completes so the log stays clean
  clearLog() {
    while (this.crt.children.length > 1) this.crt.removeChild(this.crt.firstChild);
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

  // ---------- the handheld unit ----------
  showConsole(on) { this.device?.show(on); }

  setObjective(t) { this.objective.textContent = t.toUpperCase(); }
  setUrgent(on) { this.objective.parentElement.classList.toggle('urgent', on); }
  setHint(t) { this.hint.textContent = t || ''; }
  setMicRead(deg, live) {
    const sign = deg < 0 ? '−' : '';
    this.micRead.textContent = `MIC ${sign}${String(Math.abs(deg)).padStart(3, '0')}°`;
    this.micRead.classList.toggle('live', live);
  }

  prompt(t) {
    if (t) { this.promptEl.innerHTML = t; this.promptEl.classList.add('show'); }
    else this.promptEl.classList.remove('show');
  }

  setFreq(f) { this.device?.setFreq(f); }

  setSignal(c) { this.device?.setSignal(c); }

  setMic(deg, s) { this.device?.setMic(deg, s); }

  setRec(state, sub = '') { this.device?.setRec(state, sub); }

  flashRec(msg) {
    this.device?.setRec(msg, '');
    setTimeout(() => this.device?.setRec('IDLE', ''), 900);
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
