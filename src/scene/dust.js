import * as THREE from 'three';

// Drifting dust motes in the light.

export function buildDust(scene) {
  const N = 350;
  const pos = new Float32Array(N * 3);
  const seed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 4.6;
    pos[i * 3 + 1] = Math.random() * 2.9;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 5.6;
    seed[i] = Math.random() * 100;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x8a9078, size: 0.012, transparent: true, opacity: 0.5,
    sizeAttenuation: true, depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);
  const base = pos.slice();
  return {
    update(t) {
      const p = geo.attributes.position.array;
      for (let i = 0; i < N; i++) {
        p[i * 3] = base[i * 3] + Math.sin(t * 0.1 + seed[i]) * 0.08;
        p[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.07 + seed[i] * 2) * 0.1;
        p[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.08 + seed[i]) * 0.08;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}
