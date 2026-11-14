// Generate the game's radio voice lines with ElevenLabs TTS.
// Run:  npm run voice   (loads ELEVENLABS_API_KEY from .env.local)
// Output: public/voice/<id>.mp3 — fetched by the game as static assets.
// Files that already exist are skipped (delete them to regenerate).

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { createWriteStream, mkdirSync, existsSync } from 'node:fs';
import { Readable } from 'node:stream';
import { join } from 'node:path';

const OUT = new URL('../public/voice/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

// premade voices (safe on free plan)
const DANIEL = 'onwK4e9ZLuTAKqWW03F9'; // authoritative male  — STATION CONTROL
const SARAH = 'EXAVITQu4vr4xnSDxMaL';  // soft female         — the stranger / her tape
const GEORGE = 'JBFqnCBsd6RMkjVDRZzb'; // narrative male      — the thing's whisper

// natural-case text reads better than the ALL-CAPS HUD transcript
const LINES = [
  // STATION CONTROL — flat, procedural
  { id: 'a_greeting', v: DANIEL, fx: 'radio', t: 'Good evening, technician. This is station control. Shift begins oh-three-hundred. Expect sporadic traffic.' },
  { id: 'a_tune',     v: DANIEL, fx: 'radio', t: 'Calibration required. Tune the receiver to eighty-seven point four megahertz.' },
  { id: 'a_lock',     v: DANIEL, fx: 'radio', t: 'Band check confirmed. Log all anomalous traffic. Reminder: the facility is automated. You are alone on site.' },
  { id: 'a_mictask',  v: DANIEL, fx: 'radio', t: 'Anomalous mechanical resonance detected in sub-level one. Locate the source using the directional microphone.' },
  { id: 'a_micdone',  v: DANIEL, fx: 'radio', t: 'Source confirmed. Ventilation housing, west wall. Resonance logged. No personnel are present on site.' },
  { id: 'a_rectask',  v: DANIEL, fx: 'radio', t: 'Standing order twelve C. Record a minimum of two seconds of traffic, and play it back for analysis.' },
  { id: 'a_recdone',  v: DANIEL, fx: 'radio', t: 'Recording accepted. A secondary layer was detected. It is classified as tape artifact. Disregard.' },
  { id: 'a_pest',     v: DANIEL, fx: 'radio', t: 'Advisory. Audio-reactive pest mitigation is active in ventilation. Minimize transmission noise.' },
  { id: 'a_hoax',     v: DANIEL, fx: 'radio', t: 'Dispose of recovered media. Trust only facility traffic.' },
  // the thing wearing control's voice — same voice, engine distorts it
  { id: 'a_mimic',    v: DANIEL, fx: 'radio', t: 'This is station control. Remain at your post. Open the door, technician.' },
  // THE STRANGER — urgent, breathy
  { id: 'b_outside',  v: SARAH, fx: 'radio', t: "It's outside your door now. Stay quiet. Stay absolutely quiet. Don't make another sound." },
  // her tape — found in the trash, phone-memo style
  { id: 'b_tape',     v: SARAH, fx: 'phone', t: "If anyone finds this — day nine, I think. They sealed sub-level three, and station control kept answering. It repeats things. It learned my voice off the tapes. Do not answer it. Do not record it. Whatever it asks — keep the door shut." },
  // the thing wearing her voice — engine distorts it
  { id: 'x_mimicb',   v: SARAH, fx: 'radio', t: "It's me. The technician. Open the door. I'm so cold out here." },
  // whispered over the open door
  { id: 'x_door',     v: GEORGE, fx: null, t: '[whispers] thank you for listening' },
  // THE FINAL MOMENT — the shift ends itself
  { id: 'end_thanks', v: DANIEL, fx: 'radio', t: 'Task complete. Thank you for your cooperation.' },
  { id: 'end_onemore',v: DANIEL, fx: 'radio', t: 'One more thing. Please stop making noise.' },
  // your own voice, played back at you — it was never yours
  { id: 'end_rec',    v: GEORGE, fx: 'radio', t: 'You can stop recording now.' },
  { id: 'end_room',   v: GEORGE, fx: null, t: "[whispers] I'm already in the room." },
];

const client = new ElevenLabsClient();

// pick a radio/phone filter preset from the account's effects catalog
let radioFx = null, phoneFx = null;
try {
  const cat = await client.audioEffects.getCatalog();
  const ids = (cat.filterPresets || cat.filter_presets || []).map((p) => p.filterPresetId || p.filter_preset_id || p.id);
  radioFx = ['old_radio', 'radio', 'walkie_talkie', 'intercom', 'phone'].find((x) => ids.includes(x)) || null;
  phoneFx = ['phone', 'telephone', 'old_radio'].find((x) => ids.includes(x)) || null;
  console.log('effects catalog:', radioFx ? `radio='${radioFx}'` : 'no radio preset', phoneFx ? `phone='${phoneFx}'` : 'no phone preset');
} catch {
  console.log('effects catalog unavailable — generating dry voices');
}

for (const L of LINES) {
  const file = join(OUT, `${L.id}.mp3`);
  if (existsSync(file)) { console.log(`skip  ${L.id}`); continue; }
  const fxId = L.fx === 'radio' ? radioFx : L.fx === 'phone' ? phoneFx : null;
  const req = {
    text: L.t,
    modelId: 'eleven_v4',
    outputFormat: 'mp3_44100_128',
    voiceSettings: { stability: L.v === DANIEL ? 0.75 : 0.45, similarityBoost: 0.75 },
  };
  if (fxId) req.audioEffects = { filterPresetId: fxId };
  try {
    const stream = await client.textToSpeech.convert(L.v, req);
    await new Promise((res, rej) =>
      Readable.fromWeb(stream).pipe(createWriteStream(file)).on('finish', res).on('error', rej));
    console.log(`wrote ${L.id}.mp3${fxId ? ` (${fxId})` : ''}`);
  } catch (e) {
    // retry without effects if the preset isn't usable on this plan
    delete req.audioEffects;
    try {
      const stream = await client.textToSpeech.convert(L.v, req);
      await new Promise((res, rej) =>
        Readable.fromWeb(stream).pipe(createWriteStream(file)).on('finish', res).on('error', rej));
      console.log(`wrote ${L.id}.mp3 (no fx)`);
    } catch (e2) {
      console.error(`FAIL  ${L.id}: ${e2.message}`);
    }
  }
}

// ---- sound effects (text-to-sfx) — the thing's physical sounds ----
const SFX_OUT = new URL('../public/sfx/', import.meta.url).pathname;
mkdirSync(SFX_OUT, { recursive: true });
const SFX = [
  { id: 'shriek',     t: 'monstrous inhuman creature shriek, guttural distorted scream, terrifying horror, sudden loud', d: 2.2 },
  { id: 'door_burst', t: 'heavy industrial metal door violently smashed open, loud impact bang, concrete room reverb',   d: 1.6 },
  { id: 'wall_clank', t: 'heavy metallic clanging and banging inside concrete walls, pipes struck hard, industrial',     d: 2.0 },
  { id: 'growl',      t: 'low guttural creature growl with wet breathing, menacing, close to microphone',                d: 3.0 },
  { id: 'boom',       t: 'deep cinematic sub-bass impact boom, horror stinger, floor-shaking thud',                      d: 1.5 },
];
for (const S of SFX) {
  const file = join(SFX_OUT, `${S.id}.mp3`);
  if (existsSync(file)) { console.log(`skip  sfx/${S.id}`); continue; }
  try {
    const stream = await client.textToSoundEffects.convert({
      text: S.t, durationSeconds: S.d, promptInfluence: 0.6, outputFormat: 'mp3_44100_128',
    });
    await new Promise((res, rej) =>
      Readable.fromWeb(stream).pipe(createWriteStream(file)).on('finish', res).on('error', rej));
    console.log(`wrote sfx/${S.id}.mp3`);
  } catch (e) {
    console.error(`FAIL  sfx/${S.id}: ${e.message}`);
  }
}
console.log('done.');
