import * as THREE from 'three';

// Low-res canvas textures with nearest filtering — the PS1 look.

export function canvasTex(size, draw, { repeat = [1, 1] } = {}) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  draw(g, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function noiseFill(g, s, base, n, alpha) {
  g.fillStyle = base;
  g.fillRect(0, 0, s, s);
  for (let i = 0; i < n; i++) {
    const v = (Math.random() * 60) | 0;
    g.fillStyle = `rgba(${v},${v},${v},${alpha})`;
    g.fillRect((Math.random() * s) | 0, (Math.random() * s) | 0, 1 + (Math.random() * 3) | 0, 1 + (Math.random() * 3) | 0);
  }
}

export const texConcrete = () =>
  canvasTex(128, (g, s) => {
    noiseFill(g, s, '#4b4a43', 900, 0.16);
    // stains
    for (let i = 0; i < 14; i++) {
      g.fillStyle = `rgba(20,22,18,${0.08 + Math.random() * 0.14})`;
      const w = 8 + Math.random() * 40;
      g.fillRect(Math.random() * s, Math.random() * s, w, 4 + Math.random() * 22);
    }
    // form-board seams
    g.strokeStyle = 'rgba(0,0,0,.35)';
    g.lineWidth = 2;
    for (let i = 0; i <= 2; i++) {
      g.beginPath(); g.moveTo(0, i * 64); g.lineTo(s, i * 64); g.stroke();
    }
  }, { repeat: [2, 1] });

export const texFloor = () =>
  canvasTex(128, (g, s) => {
    noiseFill(g, s, '#2b2a26', 1100, 0.2);
    g.strokeStyle = 'rgba(0,0,0,.5)';
    g.lineWidth = 2;
    g.strokeRect(1, 1, s - 2, s - 2);
    // grime center
    g.fillStyle = 'rgba(10,10,8,.25)';
    g.fillRect(20, 30, 60, 50);
  }, { repeat: [3, 3] });

export const texMetal = (base = '#3a3d40') =>
  canvasTex(64, (g, s) => {
    noiseFill(g, s, base, 300, 0.2);
    g.strokeStyle = 'rgba(0,0,0,.4)';
    for (let i = 0; i < 8; i++) {
      g.beginPath();
      const y = Math.random() * s;
      g.moveTo(0, y); g.lineTo(s, y + (Math.random() * 6 - 3)); g.stroke();
    }
  });

export const texWood = () =>
  canvasTex(64, (g, s) => {
    noiseFill(g, s, '#3d3226', 250, 0.22);
    g.strokeStyle = 'rgba(20,12,6,.5)';
    for (let i = 0; i < 6; i++) {
      g.beginPath(); g.moveTo(0, i * 11); g.lineTo(s, i * 11 + 3); g.stroke();
    }
  });

// A grill pattern for speakers / vent.
export const texGrill = () =>
  canvasTex(64, (g, s) => {
    g.fillStyle = '#141614'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#050605';
    for (let y = 4; y < s; y += 8) {
      for (let x = 4; x < s; x += 8) g.fillRect(x, y, 4, 4);
    }
  });

// CRT screen content — static-ish noise; redrawn occasionally.
export function makeCrtScreen() {
  const cv = document.createElement('canvas');
  cv.width = 96; cv.height = 72;
  const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  let mode = 'noise';
  return {
    tex,
    setMode(m) { mode = m; },
    update() {
      if (mode === 'noise') {
        const img = g.createImageData(96, 72);
        for (let i = 0; i < img.data.length; i += 4) {
          const v = Math.random() < 0.5 ? 20 + Math.random() * 40 : 0;
          img.data[i] = v * 0.3; img.data[i + 1] = v; img.data[i + 2] = v * 0.4;
          img.data[i + 3] = 255;
        }
        g.putImageData(img, 0, 0);
      } else if (mode === 'sine') {
        g.fillStyle = '#031003'; g.fillRect(0, 0, 96, 72);
        g.strokeStyle = '#4fd44f'; g.lineWidth = 2;
        g.beginPath();
        const t = performance.now() / 300;
        for (let x = 0; x < 96; x++) {
          const y = 36 + Math.sin(x * 0.3 + t) * 14 * Math.sin(t * 0.7);
          x ? g.lineTo(x, y) : g.moveTo(x, y);
        }
        g.stroke();
      } else {
        g.fillStyle = '#020a02'; g.fillRect(0, 0, 96, 72);
      }
      tex.needsUpdate = true;
    },
  };
}
