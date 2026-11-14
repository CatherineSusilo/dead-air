import * as THREE from 'three';
import { TUNER, SIGNALS } from '../config.js';

// The field tuner unit the player lifts to their face. Built from the same
// low-poly parts as the room — flat-shaded boxes, a chunky dial with knurl
// teeth, a glowing LED display (canvas texture) showing the actual band,
// needle and signal meter, physical REC/PLAY keys and a REC lamp.

const PAL = {
  caseTop: 0x3d4136,   // faded olive-drab metal
  caseSide: 0x33362d,
  bezel: 0x23261f,
  dial: 0x2a2d2e,
  dialHi: 0x3d4142,
  red: 0xcc3a2a,
  key: 0x5d5647,
  keyRec: 0x7a2e22,
  keyPlay: 0x3d5a34,
};

function flat(color, rough = 0.85) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.25, flatShading: true });
}

export function makeHandheld(camera) {
  const dev = new THREE.Group();
  camera.add(dev);

  // ---------- body ----------
  const body = new THREE.Group();
  dev.add(body);
  const caseMat = flat(PAL.caseTop);
  const shell = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.05, 0.26, 1, 1, 1), caseMat);
  body.add(shell);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.015, 0.28), flat(PAL.caseSide, 0.6));
  lip.position.y = -0.028;
  body.add(lip);
  // corner screws
  const screwMat = flat(0x1a1c18, 0.4);
  for (const [sx, sz] of [[-0.185, -0.115], [0.185, -0.115], [-0.185, 0.115], [0.185, 0.115]]) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.006, 6), screwMat);
    s.position.set(sx, 0.028, sz);
    body.add(s);
  }

  // ---------- display: freq + band + needle + signal + deck ----------
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 128;
  const g2 = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter;   // chunky pixels = PS1
  tex.minFilter = THREE.NearestFilter;
  const disp = new THREE.Mesh(
    new THREE.PlaneGeometry(0.155, 0.078),
    new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
  );
  disp.rotation.x = -Math.PI / 2;
  disp.position.set(-0.095, 0.0285, -0.062);
  body.add(disp);
  // bezel frame around the glass
  const bez = new THREE.Mesh(new THREE.BoxGeometry(0.168, 0.012, 0.088), flat(PAL.bezel, 0.5));
  bez.position.set(-0.095, 0.022, -0.062);
  body.add(bez);

  // ---------- the big tuning dial ----------
  const dial = new THREE.Group();
  const dialMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.056, 0.022, 14), flat(PAL.dial, 0.7));
  dial.add(dialMesh);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.05, 0.006, 14), flat(PAL.dialHi, 0.5));
  cap.position.y = 0.013;
  dial.add(cap);
  // knurl teeth so it reads as grabbable
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.02, 0.011), flat(PAL.dialHi, 0.5));
    tooth.position.set(Math.cos(a) * 0.056, 0, Math.sin(a) * 0.056);
    tooth.rotation.y = -a;
    dial.add(tooth);
  }
  // red marker
  const mark = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.012, 0.02),
    new THREE.MeshBasicMaterial({ color: PAL.red, toneMapped: false }));
  mark.position.set(0, 0.018, -0.04);
  dial.add(mark);
  dial.position.set(-0.095, 0.036, 0.045);
  body.add(dial);

  // fine-tune knob beside it
  const fine = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.018, 10), flat(PAL.dialHi, 0.5));
  fine.position.set(-0.02, 0.034, 0.045);
  body.add(fine);

  // ---------- mic azimuth gauge ----------
  const gaugeCv = document.createElement('canvas');
  gaugeCv.width = 96; gaugeCv.height = 96;
  const gg = gaugeCv.getContext('2d');
  const gtex = new THREE.CanvasTexture(gaugeCv);
  gtex.magFilter = THREE.NearestFilter;
  const gauge = new THREE.Mesh(
    new THREE.PlaneGeometry(0.045, 0.045),
    new THREE.MeshBasicMaterial({ map: gtex, toneMapped: false })
  );
  gauge.rotation.x = -Math.PI / 2;
  gauge.position.set(0.055, 0.0285, -0.062);
  body.add(gauge);

  // ---------- REC / PLAY keys + lamp ----------
  function key(w, color, x, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.016, 0.03), flat(color, 0.6));
    m.position.set(x, 0.028, z);
    body.add(m);
    return m;
  }
  const kRec = key(0.05, PAL.keyRec, 0.115, -0.07);
  const kPlay = key(0.05, PAL.keyPlay, 0.115, -0.03);
  const kStop = key(0.05, PAL.key, 0.115, 0.01);
  const recLamp = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0x220505, toneMapped: false }));
  recLamp.position.set(0.115, 0.03, 0.045);
  body.add(recLamp);

  // tiny lamp so the unit stays readable as the room dies
  const glow = new THREE.PointLight(0xd8c9a0, 0.5, 1.2, 1.4);
  glow.position.set(0, 0.16, 0.02);
  dev.add(glow);

  // ---------- state ----------
  const S = {
    freq: 87.4, sig: 0, micDeg: 0, micSig: 0,
    rec: 'IDLE', recSub: '', open: 0, wantOpen: false,
    pressRec: 0, pressPlay: 0, dirty: true,
  };
  const HIDE = new THREE.Vector3(0.16, -0.92, -0.52);
  const SHOW = new THREE.Vector3(0.04, -0.185, -0.44);
  dev.scale.setScalar(0.82);
  dev.position.copy(HIDE);
  dev.rotation.set(0.1, 0.12, -0.06);

  // target tick position on the band (the lock freq of the control band)
  const target = SIGNALS.control?.freq ?? 87.4;

  function draw() {
    const w = cv.width, h = cv.height;
    g2.fillStyle = '#070d06'; g2.fillRect(0, 0, w, h);
    // faint scanlines on the glass
    g2.fillStyle = 'rgba(0,0,0,.25)';
    for (let y = 0; y < h; y += 3) g2.fillRect(0, y, w, 1);

    // frequency — big red LED
    g2.fillStyle = '#ff5a3a';
    g2.font = 'bold 34px "Courier New", monospace';
    g2.textAlign = 'left';
    g2.fillText(S.freq.toFixed(1), 10, 40);
    g2.font = '13px "Courier New", monospace';
    g2.fillStyle = '#7a4438';
    g2.fillText('MHz', 108, 40);

    // deck state
    g2.font = 'bold 13px "Courier New", monospace';
    g2.fillStyle = S.rec === 'REC' ? '#ff4030' : '#9fd48a';
    g2.fillText(`${S.rec} ${S.recSub}`, 150, 20);
    g2.fillStyle = S.rec === 'REC' ? '#ff3020' : '#331210';
    g2.beginPath(); g2.arc(232, 32, 5, 0, 7); g2.fill();

    // band scale
    const bx = 10, bw = w - 20, by = 62;
    g2.fillStyle = '#161c12'; g2.fillRect(bx, by, bw, 16);
    g2.strokeStyle = '#3d4a34'; g2.strokeRect(bx, by, bw, 16);
    for (let i = 0; i <= 22; i++) {
      const x = bx + (i / 22) * bw;
      g2.strokeStyle = i % 2 ? '#4a5a3e' : '#7a8a60';
      g2.beginPath(); g2.moveTo(x, by + 12); g2.lineTo(x, by + (i % 2 ? 16 : 8)); g2.stroke();
    }
    const t = (S.freq - TUNER.MIN) / (TUNER.MAX - TUNER.MIN);
    const tx = bx + ((target - TUNER.MIN) / (TUNER.MAX - TUNER.MIN)) * bw;
    g2.fillStyle = '#cc3a2a'; g2.fillRect(tx - 1, by - 3, 3, 22);
    g2.fillStyle = '#e8e4c8';
    g2.fillRect(bx + t * bw - 1, by - 4, 2, 24);

    // signal meter — LED segments
    g2.fillStyle = '#5a6b4e'; g2.font = '10px "Courier New", monospace';
    g2.fillText('SIG', 10, 96);
    for (let i = 0; i < 12; i++) {
      const on = S.sig * 12 > i;
      g2.fillStyle = on ? (i < 7 ? '#9fd48a' : i < 10 ? '#e0d060' : '#e06040') : '#16200f';
      g2.fillRect(34 + i * 18, 88, 14, 10);
    }
    // mic azimuth readout
    g2.fillStyle = '#8aa070'; g2.font = '11px "Courier New", monospace';
    g2.fillText(`MIC ${String(Math.round(S.micDeg)).padStart(3, '0')}°`, 10, 118);
    for (let i = 0; i < 8; i++) {
      const on = S.micSig * 8 > i;
      g2.fillStyle = on ? '#9fd48a' : '#16200f';
      g2.fillRect(34 + i * 18, 104, 14, 6);
    }

    // gauge: rotating compass needle for the mic
    gg.fillStyle = '#070d06'; gg.fillRect(0, 0, 96, 96);
    gg.strokeStyle = '#3d4a34'; gg.beginPath(); gg.arc(48, 48, 40, 0, 7); gg.stroke();
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      gg.strokeStyle = i % 3 ? '#4a5a3e' : '#7a8a60';
      gg.beginPath();
      gg.moveTo(48 + Math.cos(a) * 34, 48 + Math.sin(a) * 34);
      gg.lineTo(48 + Math.cos(a) * 40, 48 + Math.sin(a) * 40);
      gg.stroke();
    }
    const ma = S.micDeg * Math.PI / 180;
    gg.strokeStyle = '#9fd48a'; gg.lineWidth = 3;
    gg.beginPath(); gg.moveTo(48, 48);
    gg.lineTo(48 + Math.sin(ma) * 32, 48 - Math.cos(ma) * 32); gg.stroke();
    gg.lineWidth = 1;
    gg.fillStyle = '#cc3a2a'; gg.beginPath(); gg.arc(48, 48, 4, 0, 7); gg.fill();

    tex.needsUpdate = true;
    gtex.needsUpdate = true;
  }

  let blink = 0;
  return {
    group: dev,
    show(on) { S.wantOpen = on; },
    setFreq(f) { if (Math.abs(f - S.freq) > 0.005) { S.freq = f; S.dirty = true; } },
    setSignal(c) { if (Math.abs(c - S.sig) > 0.02) { S.sig = c; S.dirty = true; } },
    setMic(deg, s) { if (Math.abs(deg - S.micDeg) > 0.5 || Math.abs(s - S.micSig) > 0.02) { S.micDeg = deg; S.micSig = s; S.dirty = true; } },
    setRec(state, sub = '') {
      if (S.rec !== state || S.recSub !== sub) { S.rec = state; S.recSub = sub; S.dirty = true; }
      if (state === 'REC') S.pressRec = 1;
      if (state === 'PLAY') S.pressPlay = 1;
    },
    flashRec(msg) { this.setRec(msg, ''); },
    update(dt, t) {
      // rise/fall to the face
      const target = S.wantOpen ? 1 : 0;
      S.open += (target - S.open) * Math.min(1, dt * 6);
      const e = S.open * S.open * (3 - 2 * S.open); // smoothstep
      dev.position.lerpVectors(HIDE, SHOW, e);
      dev.position.y += Math.sin(t * 1.7) * 0.004 * e; // held-in-hand sway
      dev.rotation.x = 0.1 + e * 0.42;   // face tilts up toward your eyes
      dev.visible = S.open > 0.02;

      // physical state
      const ft = (S.freq - TUNER.MIN) / (TUNER.MAX - TUNER.MIN);
      dial.rotation.y = ft * Math.PI * 4.5;
      fine.rotation.y = S.freq * 2.6;
      S.pressRec = Math.max(0, S.pressRec - dt * 6);
      S.pressPlay = Math.max(0, S.pressPlay - dt * 6);
      kRec.position.y = 0.028 - S.pressRec * 0.01;
      kPlay.position.y = 0.028 - S.pressPlay * 0.01;
      blink += dt;
      recLamp.material.color.setHex(S.rec === 'REC' ? (Math.sin(blink * 12) > 0 ? 0xff3020 : 0x5a1810) : 0x220505);

      if (S.dirty) { S.dirty = false; draw(); }
    },
  };
}
