// The voices on the wire. Early game is pure instructions — the story
// only surfaces later, mostly through the found tape.

export const SYS = {
  boot: [
    'MERIDIAN RELAY FACILITY — SUB-LEVEL 1',
    'TERMINAL 7 — NIGHT SHIFT 03:12',
    'ALL SYSTEMS NOMINAL',
  ],
};

export const A = {  // STATION CONTROL — calm, technical, tutorializes the mechanics
  greeting: 'GOOD EVENING, TECHNICIAN. THIS IS STATION CONTROL. SHIFT BEGINS 03:00. EXPECT SPORADIC TRAFFIC.',
  tuneFirst: 'CALIBRATION REQUIRED. TUNE RECEIVER TO 87.4 MEGAHERTZ.',
  lockOk: 'BAND CHECK CONFIRMED. LOG ALL ANOMALOUS TRAFFIC. REMINDER: THE FACILITY IS AUTOMATED. YOU ARE ALONE ON SITE.',
  micTask: 'ANOMALOUS MECHANICAL RESONANCE DETECTED IN SUB-LEVEL 1. LOCATE SOURCE USING DIRECTIONAL MICROPHONE.',
  micDone: 'SOURCE CONFIRMED. VENTILATION HOUSING, WEST WALL. RESONANCE LOGGED. NO PERSONNEL ARE PRESENT ON SITE.',
  recTask: 'STANDING ORDER 12-C: RECORD A MINIMUM OF TWO SECONDS OF TRAFFIC AND PLAY BACK FOR ANALYSIS.',
  recDone: 'RECORDING ACCEPTED. SECONDARY LAYER DETECTED — CLASSIFIED AS TAPE ARTIFACT. DISREGARD.',
  pestWarn: 'ADVISORY: AUDIO-REACTIVE PEST MITIGATION ACTIVE IN VENTILATION. MINIMIZE TRANSMISSION NOISE.',
  noiseWarn: 'ADVISORY: EXCESS ACOUSTIC ACTIVITY DETECTED ON YOUR LEVEL. REDUCE EQUIPMENT OUTPUT.',
  hoax: 'DISPOSE OF RECOVERED MEDIA. TRUST ONLY FACILITY TRAFFIC.',
  mimic: 'THIS IS STATION CONTROL. REMAIN AT YOUR POST. OPEN THE DOOR, TECHNICIAN.',
};

export const B = {  // THE STRANGER — now only exists on her tape, and one late call
  outside: 'It\'s outside your door now. Stay quiet. Stay absolutely quiet. Don\'t make another sound.',
};

export const X = {  // THE THING
  whisper1: 'i can do the voice too',
  whisper2: 'the more you listen, the closer i get',
  whisper3: 'you have such a quiet room',
  door: 'thank you for listening',
  mimicB: 'It\'s me. The technician. Open the door. I\'m so cold out here.',
};

// the cassette in the trash can — the previous technician's last message,
// recorded like a phone memo. This is where her story actually starts.
export const TAPE = {
  line: 'If anyone finds this — day nine, I think. They sealed sub-level three and station control kept answering. It repeats things. It learned my voice off the tapes. Do not answer it. Do not record it. Whatever it asks: keep the door shut.',
  hiddenLine: 'i am still down here. it wears me now.',
};

// line registry: id -> {cls, timbre, text}. timbre also picks the TTS file
// processing ('X' = the thing wearing someone's voice).
export const LINES = {
  a_greeting: { cls: 'src-a', timbre: 'A', text: A.greeting },
  a_tune:     { cls: 'src-a', timbre: 'A', text: A.tuneFirst },
  a_lock:     { cls: 'src-a', timbre: 'A', text: A.lockOk },
  a_mictask:  { cls: 'src-a', timbre: 'A', text: A.micTask },
  a_micdone:  { cls: 'src-a', timbre: 'A', text: A.micDone },
  a_rectask:  { cls: 'src-a', timbre: 'A', text: A.recTask },
  a_recdone:  { cls: 'src-a', timbre: 'A', text: A.recDone },
  a_pest:     { cls: 'src-a', timbre: 'A', text: A.pestWarn },
  a_hoax:     { cls: 'src-a', timbre: 'A', text: A.hoax },
  a_mimic:    { cls: 'src-x', timbre: 'X', text: A.mimic },   // control's words, wrong voice
  b_outside:  { cls: 'src-b', timbre: 'B', text: B.outside },
  x_mimicb:   { cls: 'src-x', timbre: 'X', text: X.mimicB },  // her words, wrong voice
  b_tape:     { cls: 'src-b', timbre: 'B', text: TAPE.line },
};
