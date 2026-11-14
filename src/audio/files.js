import { audio } from './engine.js';

// ElevenLabs-generated sound effects, served from /sfx/*.mp3.
// Lazy-fetched and decoded on first use; if a file is missing the synth
// layers in sfx.js still carry the scare — this just makes it fatter.

const buffers = new Map();

function load(id) {
  let p = buffers.get(id);
  if (!p) {
    p = fetch(`./sfx/${id}.mp3`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
      .then((ab) => audio.ctx.decodeAudioData(ab))
      .catch(() => null);
    buffers.set(id, p);
  }
  return p;
}

// fire-and-forget. bearing/distance route through the room panner;
// omit them for a full-width master hit.
export function playFile(id, { gain = 1, bearing = null, distance = 1, rate = 1, dest = null } = {}) {
  load(id).then((buf) => {
    if (!buf) return;
    const c = audio.ctx;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = c.createGain();
    g.gain.value = gain;
    src.connect(g);
    if (dest) {
      g.connect(dest);
    } else if (bearing !== null) {
      const { input, output } = audio.panner(bearing, distance);
      g.connect(input);
      output.connect(audio.roomBus);
      output.connect(audio.reverb);
    } else {
      g.connect(audio.master);
    }
    src.start();
  });
}

// warm the cache during boot so the first scare isn't delayed by a fetch
export function preloadSfx() {
  for (const id of ['shriek', 'door_burst', 'wall_clank', 'growl', 'boom']) load(id);
}
