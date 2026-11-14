import * as THREE from 'three';
import { PALETTE } from '../config.js';
import { texConcrete, texFloor, texMetal, texWood, texGrill, makeCrtScreen } from './textures.js';

const M = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, ...opts });

function box(w, h, d, mat, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  if (ry) m.rotation.y = ry;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function cyl(r, h, mat, x, y, z, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export function buildRoom(scene) {
  const room = new THREE.Group();
  const W = 5, H = 3, D = 6; // room dims
  const hx = W / 2, hz = D / 2;

  const concrete = new THREE.MeshLambertMaterial({ map: texConcrete() });
  const concreteD = new THREE.MeshLambertMaterial({ map: texConcrete(), color: 0x8a8a80 });
  const floorMat = new THREE.MeshLambertMaterial({ map: texFloor() });
  const metal = new THREE.MeshLambertMaterial({ map: texMetal('#3a3d40') });
  const metalD = new THREE.MeshLambertMaterial({ map: texMetal('#24272a') });
  const wood = new THREE.MeshLambertMaterial({ map: texWood() });
  const grill = new THREE.MeshLambertMaterial({ map: texGrill() });
  const greenM = M(PALETTE.green);
  const beigeM = M(PALETTE.beige);
  const redM = M(PALETTE.red);
  const blackM = M(PALETTE.black);

  // ---------- shell ----------
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  room.add(floor);

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), M(0x2f2f2b));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  room.add(ceil);

  const wallN = new THREE.Mesh(new THREE.PlaneGeometry(W, H), concrete);
  wallN.position.set(0, H / 2, -hz);
  wallN.receiveShadow = true;
  room.add(wallN);
  const wallS = new THREE.Mesh(new THREE.PlaneGeometry(W, H), concrete);
  wallS.rotation.y = Math.PI;
  wallS.position.set(0, H / 2, hz);
  room.add(wallS);
  const wallW = new THREE.Mesh(new THREE.PlaneGeometry(D, H), concreteD);
  wallW.rotation.y = Math.PI / 2;
  wallW.position.set(-hx, H / 2, 0);
  wallW.receiveShadow = true;
  room.add(wallW);
  const wallE = new THREE.Mesh(new THREE.PlaneGeometry(D, H), concreteD);
  wallE.rotation.y = -Math.PI / 2;
  wallE.position.set(hx, H / 2, 0);
  room.add(wallE);

  // wainscot stripe — dark green band on walls
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(W, 0.9), greenM);
  stripe.position.set(0, 0.45, -hz + 0.005);
  room.add(stripe);
  const stripeE = new THREE.Mesh(new THREE.PlaneGeometry(D, 0.9), greenM);
  stripeE.rotation.y = -Math.PI / 2;
  stripeE.position.set(hx - 0.005, 0.45, 0);
  room.add(stripeE);
  const stripeW = new THREE.Mesh(new THREE.PlaneGeometry(D, 0.9), greenM);
  stripeW.rotation.y = Math.PI / 2;
  stripeW.position.set(-hx + 0.005, 0.45, 0);
  room.add(stripeW);

  // ---------- desk ----------
  const desk = new THREE.Group();
  desk.add(box(3.0, 0.06, 0.9, wood, 0, 0, 0));
  desk.add(box(0.08, 0.75, 0.8, metalD, -1.42, -0.4, 0));
  desk.add(box(0.08, 0.75, 0.8, metalD, 1.42, -0.4, 0));
  const drawers = box(0.55, 0.62, 0.75, beigeM, 1.05, -0.42, 0);
  desk.add(drawers);
  for (let i = 0; i < 3; i++) {
    desk.add(box(0.45, 0.02, 0.04, metalD, 1.05, -0.2 - i * 0.18, 0.39));
  }
  desk.position.set(0.3, 0.78, -2.15);
  room.add(desk);
  const deskTop = 0.81;

  // ---------- radio receiver ----------
  const radioUnit = new THREE.Group();
  radioUnit.add(box(0.62, 0.3, 0.28, metalD, 0, 0.15, 0));
  radioUnit.add(box(0.24, 0.2, 0.02, grill, -0.16, 0.15, 0.145)); // speaker
  for (let i = 0; i < 3; i++) {
    const k = cyl(0.025, 0.03, blackM, 0.08 + i * 0.1, 0.12, 0.15);
    k.rotation.x = Math.PI / 2;
    radioUnit.add(k);
  }
  const ant = cyl(0.004, 0.55, metal, 0.24, 0.55, -0.08);
  ant.rotation.z = -0.3;
  radioUnit.add(ant);
  radioUnit.position.set(-0.85, deskTop, -2.2);
  radioUnit.userData.type = 'radio';
  room.add(radioUnit);

  // ---------- frequency tuner ----------
  const tuner = new THREE.Group();
  tuner.add(box(0.72, 0.34, 0.32, metal, 0, 0.17, 0));
  tuner.add(box(0.68, 0.05, 0.30, metalD, 0, 0.02, 0));
  // dial (rotates)
  const dial = cyl(0.085, 0.035, blackM, -0.2, 0.17, 0.17);
  dial.rotation.x = Math.PI / 2;
  const dialMark = box(0.012, 0.07, 0.012, redM, 0, 0.05, 0.02);
  dial.add(dialMark);
  tuner.add(dial);
  // frequency window (red 7-seg look)
  const freqFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.07),
    new THREE.MeshBasicMaterial({ color: 0x1a0505 })
  );
  freqFace.position.set(0.16, 0.24, 0.161);
  tuner.add(freqFace);
  // band scale
  const scale = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 0.05),
    new THREE.MeshBasicMaterial({ color: 0x302d20 })
  );
  scale.position.set(0.14, 0.12, 0.161);
  tuner.add(scale);
  const needle = new THREE.Mesh(new THREE.PlaneGeometry(0.006, 0.05), new THREE.MeshBasicMaterial({ color: 0xcc3a2a }));
  needle.position.set(0.14, 0.12, 0.163);
  tuner.add(needle);
  tuner.position.set(0.0, deskTop, -2.15);
  tuner.userData.type = 'tuner';
  room.add(tuner);

  // ---------- cassette recorder ----------
  const rec = new THREE.Group();
  rec.add(box(0.4, 0.09, 0.28, beigeM, 0, 0.045, 0));
  rec.add(box(0.4, 0.02, 0.28, metalD, 0, 0.095, 0));
  const reelL = cyl(0.045, 0.012, blackM, -0.1, 0.1, 0.0);
  const reelR = cyl(0.045, 0.012, blackM, 0.1, 0.1, 0.0);
  for (const r of [reelL, reelR]) {
    for (let i = 0; i < 3; i++) {
      const spoke = box(0.008, 0.005, 0.08, M(0x777), 0, 0.008, 0);
      spoke.rotation.y = (i * Math.PI) / 3;
      r.add(spoke);
    }
    rec.add(r);
  }
  const recBtn = box(0.05, 0.02, 0.05, redM, -0.14, 0.02, 0.16);
  rec.add(recBtn);
  const playBtn = box(0.05, 0.02, 0.05, greenM, -0.06, 0.02, 0.16);
  rec.add(playBtn);
  const recLed = new THREE.Mesh(new THREE.SphereGeometry(0.008), new THREE.MeshBasicMaterial({ color: 0x220505 }));
  recLed.position.set(0.16, 0.06, 0.145);
  rec.add(recLed);
  rec.position.set(0.85, deskTop, -2.05);
  rec.userData.type = 'recorder';
  room.add(rec);

  // ---------- directional mic on stand ----------
  const mic = new THREE.Group();
  const base = cyl(0.09, 0.02, metalD, 0, 0.01, 0);
  mic.add(base);
  const micPivot = new THREE.Group();
  const stem = cyl(0.012, 0.5, metal, 0, 0.25, 0);
  micPivot.add(stem);
  const micHead = new THREE.Group();
  const barrel = cyl(0.03, 0.3, metalD, 0, 0, 0, 8);
  barrel.rotation.x = Math.PI / 2;
  const foam = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.14, 8), M(0x1c1c1c));
  foam.rotation.x = Math.PI / 2;
  foam.position.z = 0.2;
  micHead.add(barrel, foam);
  micHead.position.y = 0.52;
  micPivot.add(micHead);
  mic.add(micPivot);
  mic.position.set(1.45, deskTop, -1.9);
  mic.userData.type = 'mic';
  room.add(mic);

  // ---------- CRT monitors ----------
  const crtScreens = [];
  function crt(w = 0.34, h = 0.28) {
    const g = new THREE.Group();
    g.add(box(w, h, 0.3, beigeM, 0, h / 2, -0.05));
    const scr = makeCrtScreen();
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.72, h * 0.66),
      new THREE.MeshBasicMaterial({ map: scr.tex }));
    face.position.set(0, h / 2 + 0.01, 0.105);
    g.add(face);
    crtScreens.push(scr);
    return g;
  }
  const crt1 = crt();
  crt1.position.set(-0.5, deskTop, -2.45);
  crt1.rotation.y = 0.25;
  room.add(crt1);
  const crt2 = crt(0.3, 0.24);
  crt2.position.set(1.9, 1.35, -2.6);
  crt2.rotation.y = -0.3;
  room.add(crt2);

  // wall shelf under crt2
  room.add(box(0.8, 0.04, 0.45, wood, 1.9, 1.3, -2.6));
  room.add(box(0.6, 0.04, 0.3, wood, -1.9, 1.7, -2.75));

  // shelf clutter
  room.add(box(0.15, 0.22, 0.12, beigeM, -1.7, 1.83, -2.75));
  room.add(box(0.12, 0.18, 0.1, greenM, -2.0, 1.81, -2.75));
  room.add(box(0.1, 0.14, 0.09, redM, -2.15, 1.79, -2.75, 0.3));

  // ---------- industrial door ----------
  const door = new THREE.Group();
  const dframe = box(1.0, 2.1, 0.12, metalD, 0, 1.05, 0);
  const dpanel = box(0.82, 1.95, 0.08, metal, 0, 0.98, 0.03);
  door.add(dframe, dpanel);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 6, 14), M(0x555a55));
  wheel.position.set(0.15, 1.0, 0.09);
  door.add(wheel);
  for (let i = 0; i < 3; i++) {
    const spoke = box(0.02, 0.26, 0.02, M(0x555a55), 0, 0, 0);
    spoke.rotation.z = (i * Math.PI) / 3;
    wheel.add(spoke);
  }
  const port = new THREE.Mesh(new THREE.CircleGeometry(0.09, 12),
    new THREE.MeshBasicMaterial({ color: 0x050808 }));
  port.position.set(0, 1.55, 0.08);
  door.add(port);
  door.position.set(-1.5, 0, -hz + 0.02);
  door.userData.type = 'door';
  room.add(door);

  // caution sign by door
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.2), new THREE.MeshBasicMaterial({ color: 0x8a7a30 }));
  sign.position.set(-0.85, 1.9, -hz + 0.012);
  room.add(sign);

  // ---------- observation window ----------
  const win = new THREE.Group();
  const wframe = box(1.05, 0.85, 0.14, metalD, 0, 0, 0);
  const wglass = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.65),
    new THREE.MeshBasicMaterial({ color: 0x16202a, transparent: true, opacity: 0.55 }));
  wglass.position.z = 0.02;
  win.add(wframe, wglass);
  // cross bars
  win.add(box(0.85, 0.03, 0.02, metalD, 0, 0, 0.04));
  win.add(box(0.03, 0.65, 0.02, metalD, 0, 0, 0.04));
  win.position.set(1.15, 1.6, -hz + 0.02);
  room.add(win);

  // ---------- THE FIGURE (hidden until needed) ----------
  const figure = new THREE.Group();
  const figMat = new THREE.MeshBasicMaterial({ color: 0x020203 });
  const torso = box(0.34, 0.9, 0.2, figMat, 0, 1.15, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), figMat);
  head.position.set(0, 1.72, 0);
  head.scale.y = 1.35;
  const armL = box(0.07, 0.85, 0.09, figMat, -0.23, 1.1, 0);
  const armR = box(0.07, 0.85, 0.09, figMat, 0.23, 1.1, 0);
  const legL = box(0.09, 0.75, 0.1, figMat, -0.1, 0.38, 0);
  const legR = box(0.09, 0.75, 0.1, figMat, 0.1, 0.38, 0);
  figure.add(torso, head, armL, armR, legL, legR);
  figure.visible = false;
  room.add(figure);

  // ---------- vent ----------
  const vent = box(0.5, 0.35, 0.06, grill, -hx + 0.02, 2.15, -1.2, Math.PI / 2);
  room.add(vent);

  // ---------- pipes ----------
  const pipeMat = new THREE.MeshLambertMaterial({ map: texMetal('#4a4038') });
  for (const [y, z] of [[2.75, -2.6], [2.6, -2.75]]) {
    const p = cyl(0.05, W - 0.2, pipeMat, 0, y, z);
    p.rotation.z = Math.PI / 2;
    room.add(p);
  }
  const pE = cyl(0.07, H, pipeMat, hx - 0.1, H / 2, -0.6);
  room.add(pE);
  const pE2 = cyl(0.05, 2.0, pipeMat, hx - 0.08, H - 1.0, 1.4);
  room.add(pE2);
  const pJoin = cyl(0.07, 1.2, pipeMat, hx - 0.1, 2.7, 0.4);
  pJoin.rotation.x = Math.PI / 2;
  room.add(pJoin);
  // valve wheel on east pipe
  const valve = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 6, 12), redM);
  valve.position.set(hx - 0.2, 1.4, -0.6);
  valve.rotation.y = Math.PI / 2;
  room.add(valve);

  // ---------- fluorescent fixtures ----------
  const fluorFix = [];
  for (const x of [-0.9, 0.9]) {
    const fix = new THREE.Group();
    fix.add(box(1.1, 0.06, 0.18, metalD, 0, 0, 0));
    const tubeMat = new THREE.MeshBasicMaterial({ color: 0xcfe8c8 });
    const tube = cyl(0.02, 1.0, tubeMat, 0, -0.045, 0, 8);
    tube.rotation.z = Math.PI / 2;
    fix.add(tube);
    fix.position.set(x, H - 0.05, 0.2);
    room.add(fix);
    fluorFix.push(tubeMat);
  }

  // ---------- cables ----------
  const cableMat = M(0x141414);
  function cable(from, to, sag = 0.35) {
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    mid.y -= sag;
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const t = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.012, 5), cableMat);
    room.add(t);
  }
  cable(new THREE.Vector3(-0.85, deskTop + 0.1, -2.3), new THREE.Vector3(-1.4, 0.05, -2.7), 0.5);
  cable(new THREE.Vector3(0.0, deskTop + 0.15, -2.3), new THREE.Vector3(0.4, 0.05, -2.85), 0.45);
  cable(new THREE.Vector3(1.45, deskTop + 0.1, -2.0), new THREE.Vector3(2.3, 0.05, -2.5), 0.55);
  cable(new THREE.Vector3(-0.5, deskTop + 0.2, -2.55), new THREE.Vector3(-0.3, 2.2, -2.9), 0.3);
  // hanging cable from ceiling
  const hang = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(2.1, H, 0.8), new THREE.Vector3(2.25, 1.6, 0.9), new THREE.Vector3(2.1, 0.9, 1.1)
    ), 12, 0.014, 5), cableMat);
  room.add(hang);

  // ---------- clutter ----------
  // filing cabinet SW
  room.add(box(0.55, 1.3, 0.5, greenM, -1.95, 0.65, 2.45));
  for (let i = 0; i < 4; i++) room.add(box(0.42, 0.02, 0.03, metalD, -1.95, 0.35 + i * 0.28, 2.71));
  // chair
  const chair = new THREE.Group();
  chair.add(cyl(0.02, 0.5, metalD, 0, 0.25, 0));
  chair.add(box(0.45, 0.05, 0.45, M(0x28281f), 0, 0.52, 0));
  chair.add(box(0.45, 0.5, 0.05, M(0x28281f), 0, 0.8, 0.2));
  chair.position.set(0.1, 0, -0.9);
  chair.rotation.y = Math.PI + 0.2;
  room.add(chair);
  // papers on desk + floor
  const paper = new THREE.MeshBasicMaterial({ color: 0x9a917c });
  for (const [x, y, z, ry] of [[-0.3, deskTop + 0.01, -2.0, 0.4], [0.5, deskTop + 0.01, -1.85, -0.2], [0.9, 0.005, -1.2, 1.1], [-1.2, 0.005, -0.5, 2.4]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.24), paper);
    p.rotation.x = -Math.PI / 2;
    p.rotation.z = ry;
    p.position.set(x, y, z);
    room.add(p);
  }
  // mug
  room.add(cyl(0.035, 0.08, redM, -0.15, deskTop + 0.05, -1.85));
  // wall clock
  const clock = new THREE.Group();
  clock.add(cyl(0.12, 0.03, beigeM, 0, 0, 0));
  const hand = box(0.01, 0.09, 0.01, blackM, 0, 0.03, 0.02);
  clock.add(hand);
  const hand2 = box(0.01, 0.07, 0.01, blackM, 0.02, 0.02, 0.02);
  hand2.rotation.z = -1.1;
  clock.add(hand2);
  clock.position.set(0.4, 2.4, -hz + 0.04);
  clock.rotation.x = Math.PI / 2;
  room.add(clock);
  // poster — faded warning
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), new THREE.MeshLambertMaterial({ color: 0x6a5a40 }));
  poster.position.set(-2.46, 1.6, 0.6);
  poster.rotation.y = Math.PI / 2;
  poster.rotation.z = 0.04;
  room.add(poster);
  const posterBar = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.08), new THREE.MeshBasicMaterial({ color: 0x7e2f24 }));
  posterBar.position.set(-2.45, 1.82, 0.6);
  posterBar.rotation.y = Math.PI / 2;
  posterBar.rotation.z = 0.04;
  room.add(posterBar);
  // junction box on wall
  room.add(box(0.25, 0.35, 0.1, metalD, hx - 0.06, 1.8, 1.8));
  const jbLed = new THREE.Mesh(new THREE.SphereGeometry(0.012), new THREE.MeshBasicMaterial({ color: 0x3a6a2a }));
  jbLed.position.set(hx - 0.12, 1.9, 1.8);
  room.add(jbLed);
  // ceiling stain
  const stain = new THREE.Mesh(new THREE.CircleGeometry(0.5, 10), new THREE.MeshBasicMaterial({ color: 0x1c1c18, transparent: true, opacity: 0.6 }));
  stain.rotation.x = Math.PI / 2;
  stain.position.set(-1.2, H - 0.01, -1.0);
  room.add(stain);

  scene.add(room);

  return {
    room,
    refs: { dial, needle, micPivot, micHead, reelL, reelR, recLed, figure, door, dpanel, wheel, crtScreens, fluorFix, port, wglass },
    interactables: { tuner, mic, recorder: rec, radio: radioUnit, door },
  };
}
