import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// PS1-flavored horror pass: chunky pixels, film grain, chromatic aberration,
// scanlines, vignette, and a glitch uniform for scare moments.

const HorrorShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    grain: { value: 0.055 },
    aberr: { value: 0.0028 },
    glitch: { value: 0 },
    px: { value: new THREE.Vector2(384, 240) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float time, grain, aberr, glitch;
    uniform vec2 px;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    void main() {
      // pixel grid
      vec2 uv = floor(vUv * px) / px;

      // glitch: horizontal band shear
      if (glitch > 0.02) {
        float band = floor(uv.y * 24.0);
        float n = hash(vec2(band, floor(time * 18.0)));
        if (n > 1.0 - glitch * 0.5) {
          uv.x += (hash(vec2(band, time)) - 0.5) * 0.12 * glitch;
        }
      }

      // slight barrel distortion
      vec2 cc = uv - 0.5;
      float r2 = dot(cc, cc);
      uv = uv + cc * r2 * 0.1;

      // chromatic aberration, worsens with glitch
      float ab = aberr * (1.0 + glitch * 5.0);
      vec2 dir = cc * ab * 4.0;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + dir).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - dir).b;

      // scanlines
      col *= 0.88 + 0.12 * sin(uv.y * px.y * 3.14159 * 2.0);

      // film grain
      float g = hash(uv * 1000.0 + fract(time) * 100.0) - 0.5;
      col += g * grain * (1.0 + glitch);

      // vignette
      float vig = smoothstep(0.62, 0.18, r2);
      col *= mix(0.6, 1.05, vig);

      // green-ish grade, lifted blacks a touch
      col = pow(col, vec3(1.05, 1.0, 1.1));
      col.g *= 1.04;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export function setupPostFX(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const pass = new ShaderPass(HorrorShader);
  composer.addPass(pass);
  composer.addPass(new OutputPass());
  return {
    composer,
    setTime(t) { pass.uniforms.time.value = t; },
    setGlitch(v) { pass.uniforms.glitch.value = v; },
    resize(w, h) { composer.setSize(w, h); },
  };
}
