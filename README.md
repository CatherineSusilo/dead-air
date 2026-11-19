# DEAD AIR

*The more you listen, the closer it gets.*

A browser-based 3D psychological horror game. You're a night-shift sound
technician alone in an underground recording room with three tools — a
frequency tuner, a directional microphone, and a tape recorder. Station
Control gives you six tasks. Something in the facility counts every
sound you make.

Low-poly, PS1-era, analog-industrial aesthetic. Built with Three.js and
the Web Audio API — the entire soundscape is synthesized or generated,
there are no engine assets.

## Run it

```bash
npm install
npm run dev
# open http://localhost:5173 — click BEGIN SHIFT
```

Production build:

```bash
npm run build && npm run preview
```

## How to play

| Input | Action |
|-------|--------|
| Mouse | look around · hover equipment to raise the console · drag dials |
| `A` / `D` | tune the radio down / up |
| `Q` / `E` | rotate the directional mic |
| `R` | record / stop recording |
| `P` | play tape |
| `F` or click | interact — grab the tape in the trash, turn the door wheel |
| `T` | transmit (very loud. it hears it.) |

### The six tasks

1. Tune the radio to **87.4 MHz** (hold `D` — line the needle onto the red tick)
2. Aim the mic at the noise (`Q`/`E` — the meter peaks when you're close)
3. Record a tape (`R` for at least 2 seconds)
4. Play it back (`P` — listen for what's underneath)
5. Recover and play the tape in the trash can
6. **Stay silent. Do not touch anything.**

Each task is timed. Run out and the scratching in the walls reaches you.

### Ways to die

- Miss a task deadline — it comes through the door
- Open the door when the voice tells you to — `SIGNAL LOST`
- Leave the radio locked on a loud signal too long — it hears the carrier

### How to win

Complete all six tasks, then make **zero noise** during the final moment.
*"Please stop making noise"* is literal — stay silent and you make it to
`06:00 — SHIFT COMPLETE`.

## Tech

- **Three.js** — procedural low-poly room, equipment, entity; no models
- **Web Audio API** — static, radio processing, formant voices, spatialized
  emitters, convolution reverb, countdown claw-taps, door bursts
- **ElevenLabs** — real voice lines (`public/voice/`) and sound effects
  (`public/sfx/`) generated at build time via `@elevenlabs/elevenlabs-js`
- **Vite** — dev server + bundler

### Regenerating audio

The committed `.mp3` files mean the game works without an API key —
synth fallbacks cover anything missing. To regenerate with real voices:

```bash
npx -y @elevenlabs/cli@latest onboard init   # stores key in .env.local
npm run voice                                 # writes public/voice + public/sfx
```

## Debug

`window.__da` exposes the director, tuner, mic, recorder, refs, HUD and
audio engine for poking at game state from the console.
