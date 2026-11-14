// The two voices on the wire — and the third one learning them.

export const SYS = {
  boot: [
    'MERIDIAN RELAY FACILITY — SUB-LEVEL 1',
    'TERMINAL 7 — NIGHT SHIFT 03:12',
    'ALL SYSTEMS NOMINAL',
  ],
};

export const A = {  // STATION CONTROL — calm, technical
  greeting: 'GOOD EVENING, TECHNICIAN. THIS IS STATION CONTROL. SHIFT BEGINS 03:00. EXPECT SPORADIC TRAFFIC.',
  tuneFirst: 'CALIBRATION REQUIRED. TUNE RECEIVER TO 87.4 MEGAHERTZ.',
  lockOk: 'BAND CHECK CONFIRMED. LOG ALL ANOMALOUS TRAFFIC. REMINDER: THE FACILITY IS AUTOMATED. YOU ARE ALONE ON SITE.',
  micTask: 'ANOMALOUS MECHANICAL RESONANCE DETECTED IN SUB-LEVEL 1. LOCATE SOURCE USING DIRECTIONAL MICROPHONE.',
  micDone: 'SOURCE CONFIRMED: VENTILATION HOUSING, WEST WALL. RESONANCE LOGGED. NO PERSONNEL ARE PRESENT ON SITE.',
  recTask: 'STANDING ORDER 12-C: RECORD A MINIMUM OF TWO SECONDS OF TRAFFIC AND PLAY BACK FOR ANALYSIS.',
  recDone: 'RECORDING ACCEPTED. SECONDARY LAYER DETECTED — CLASSIFIED AS TAPE ARTIFACT. DISREGARD.',
  pestWarn: 'ADVISORY: AUDIO-REACTIVE PEST MITIGATION ACTIVE IN VENTILATION. MINIMIZE TRANSMISSION NOISE.',
  noiseWarn: 'ADVISORY: EXCESS ACOUSTIC ACTIVITY DETECTED ON YOUR LEVEL. REDUCE EQUIPMENT OUTPUT.',
  mimic: 'THIS IS STATION CONTROL. REMAIN AT YOUR POST. OPEN THE DOOR, TECHNICIAN.',
};

export const B = {  // THE STRANGER — human, urgent
  first: '...hello? hello — is anyone on this band? God. I\'m a technician. Sub-level three. The door\'s sealed.',
  warn1: 'Don\'t answer control. There is no automated system. There hasn\'t been, for years.',
  warnMic: 'That sound it asked you to find? It wanted to know you could hear it.',
  warnRec: 'It counts the noises you make. Every recording. Every playback. Please — stop.',
  learned: 'It learned my voice off the tapes. If control talks again — that\'s not control. And soon it won\'t be me either.',
  outside: 'It\'s outside your door now. Stay quiet. Stay absolutely quiet. Don\'t make another sound.',
};

export const X = {  // THE THING
  whisper1: 'i can do the voice too',
  whisper2: 'the more you listen, the closer i get',
  whisper3: 'you have such a quiet room',
  mimicB: 'It\'s me. The technician. Open the door. I\'m so cold out here.',
};
