import * as THREE from 'three';

// Fluorescent rig + desk lamp + CRT glow. `stress` (0..1) worsens flicker.

export function buildLighting(scene) {
  const amb = new THREE.AmbientLight(0x2a3226, 1.1);
  scene.add(amb);

  const fluor1 = new THREE.PointLight(0xbfd8b0, 40, 10, 1.4);
  fluor1.position.set(-0.9, 2.7, 0.2);
  fluor1.castShadow = true;
  fluor1.shadow.mapSize.set(1024, 1024);
  fluor1.shadow.bias = -0.004;
  scene.add(fluor1);

  const fluor2 = new THREE.PointLight(0xbfd8b0, 30, 10, 1.4);
  fluor2.position.set(0.9, 2.7, 0.2);
  scene.add(fluor2);

  const lamp = new THREE.SpotLight(0xd8b06a, 14, 5, 0.75, 0.5, 1.3);
  lamp.position.set(-0.4, 1.5, -1.7);
  lamp.target.position.set(0, 0.8, -2.1);
  scene.add(lamp, lamp.target);

  const crtGlow = new THREE.PointLight(0x3a6a3a, 3.5, 3);
  crtGlow.position.set(-0.5, 1.1, -2.2);
  scene.add(crtGlow);

  // red emergency light (off until finale)
  const red = new THREE.PointLight(0xaa2015, 0, 8);
  red.position.set(-1.5, 2.4, -2.5);
  scene.add(red);

  const state = { stress: 0, off: false, t: 0, flickerT: 0, dark: 0 };

  return {
    setStress(v) { state.stress = v; },
    setDarkness(v) { state.dark = Math.min(0.9, Math.max(0, v)); },
    kill() { state.off = true; },
    revive(dim = 0.25) {
      state.off = false;
      fluor1.intensity = 40 * dim;
      fluor2.intensity = 30 * dim;
    },
    redAlert(on) { red.intensity = on ? 5 : 0; },
    update(dt) {
      state.t += dt;
      if (state.off) {
        fluor1.intensity = 0; fluor2.intensity = 0;
        lamp.intensity = 0;
        amb.intensity = 0.15;
        return;
      }
      const dim = 1 - state.dark * 0.78;   // the room dies slowly over the shift
      // baseline hum-flicker
      let f = 1 + Math.sin(state.t * 57) * 0.012 + Math.sin(state.t * 23) * 0.01;
      // stress dropouts
      if (state.stress > 0.05) {
        state.flickerT -= dt;
        if (state.flickerT <= 0) {
          state.flickerT = 0.05 + Math.random() * (1.4 - state.stress);
          if (Math.random() < state.stress * 0.85) f *= 0.05 + Math.random() * 0.3;
        }
      }
      fluor1.intensity = 40 * f * dim;
      fluor2.intensity = 30 * (f * 0.9 + 0.1) * dim;
      lamp.intensity = 14 * (0.92 + Math.sin(state.t * 31) * 0.05) * dim;
      amb.intensity = 1.1 * dim;
      crtGlow.intensity = 3.5 * dim;
    },
  };
}
