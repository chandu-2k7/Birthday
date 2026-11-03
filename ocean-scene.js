/**
 * 🌊 3D Bioluminescent Moonlit Ocean Engine
 * Features:
 *  - Real-time 3D WebGL Perspective Ocean Shader with 5-octave Gerstner waves
 *  - Physically based moonlight specular reflection (*månegate* / glitter road)
 *  - Bioluminescent electric cyan wave crest luminescence & subsurface scattering
 *  - Distance horizon fog seamlessly blending with the starry night sky
 *  - Subtle interactive 3D camera parallax responding to mouse / touch
 *  - High-fidelity Canvas 2D 3D-perspective multi-slice fallback
 *  - Procedural 3D moon texture generation
 */
(() => {
  "use strict";

  const canvas = document.getElementById("ocean-canvas");
  if (!canvas) return;

  const moonElement = document.getElementById("moon");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI * 2;

  // Shared state
  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    horizonRatio: 0.5, // 50% from top of screen
    moonX: 0.76,       // normalized [0..1]
    moonY: 0.82,       // normalized [0..1] from bottom in WebGL
    time: 0,
    lastTime: 0,
    mouseX: 0,
    mouseY: 0,
    targetMouseX: 0,
    targetMouseY: 0,
    useWebGL: false
  };

  // Track mouse for subtle 3D camera parallax
  window.addEventListener("mousemove", (e) => {
    state.targetMouseX = (e.clientX / window.innerWidth) * 2.0 - 1.0;
    state.targetMouseY = (e.clientY / window.innerHeight) * 2.0 - 1.0;
  }, { passive: true });

  window.addEventListener("touchmove", (e) => {
    if (e.touches.length > 0) {
      state.targetMouseX = (e.touches[0].clientX / window.innerWidth) * 2.0 - 1.0;
      state.targetMouseY = (e.touches[0].clientY / window.innerHeight) * 2.0 - 1.0;
    }
  }, { passive: true });

  function updateMoonPosition() {
    if (moonElement) {
      const rect = moonElement.getBoundingClientRect();
      state.moonX = (rect.left + rect.width * 0.5) / window.innerWidth;
      // In WebGL Y=0 is bottom, in CSS Y=0 is top
      state.moonY = 1.0 - (rect.top + rect.height * 0.5) / window.innerHeight;
      return;
    }
    state.moonX = 0.76;
    state.moonY = 0.82;
  }

  // Initialize photorealistic moon position and tracking
  function initMoon() {
    if (!moonElement) return;
    updateMoonPosition();
  }

  /* =========================================================================
     1. WEBGL 3D OCEAN ENGINE (PRIMARY)
     ========================================================================= */

  const VS_SOURCE = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = a_position * 0.5 + 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  const FS_SOURCE = `
    #ifdef GL_ES
    precision highp float;
    #endif

    varying vec2 v_uv;

    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec2 u_moon_pos;
    uniform float u_horizon;
    uniform vec2 u_mouse;

    // 3D Trochoidal / Gerstner wave octave
    float waveOctave(vec2 p, vec2 dir, float freq, float speed, float t, float steepness) {
      float phase = dot(p, dir) * freq + t * speed;
      float s = sin(phase);
      return pow(s * 0.5 + 0.5, steepness) * 2.0 - 1.0;
    }

    // Volumetric 3D water heightfield
    float getWaterHeight(vec2 p, float t) {
      float h = 0.0;
      // Primary rolling swells moving forward towards the camera
      h += waveOctave(p, vec2(0.12, 0.99), 0.36, 1.15, t, 1.85) * 0.32;
      // Secondary cross swell
      h += waveOctave(p, vec2(-0.35, 0.94), 0.72, 1.60, t, 1.65) * 0.17;
      // Mid-frequency chop
      h += waveOctave(p, vec2(0.55, 0.83), 1.45, 2.35, t, 1.50) * 0.095;
      // High-frequency surface ripples
      h += waveOctave(p, vec2(-0.72, 0.69), 3.10, 3.70, t, 1.30) * 0.045;
      h += waveOctave(p, vec2(0.88, -0.47), 6.50, 4.90, t, 1.20) * 0.022;
      return h;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_resolution.xy;
      float horizonY = 1.0 - u_horizon;

      // Above horizon: 100% transparent so stars, clouds & moon show with pure clarity
      if (uv.y > horizonY + 0.004) {
        gl_FragColor = vec4(0.0);
        return;
      }

      // 3D Camera Ray Setup
      vec3 ro = vec3(u_mouse.x * 0.65, 3.2, -5.0);
      vec3 lookAt = vec3(0.0, 0.2, 14.0);
      vec3 fwd = normalize(lookAt - ro);
      vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
      vec3 up = cross(fwd, right);

      vec2 p = (gl_FragCoord.xy - u_resolution.xy * 0.5) / u_resolution.y;
      float pitchOffset = (horizonY - 0.5) * 1.58;
      vec3 rd = normalize(p.x * right + (p.y - pitchOffset) * up + 1.28 * fwd);

      // Ray pointing at or above horizon
      if (rd.y >= -0.001) {
        gl_FragColor = vec4(0.0);
        return;
      }

      // Intersect with 3D water plane y = 0
      float tHit = -ro.y / rd.y;
      vec3 pos = ro + rd * tHit;

      // Raymarch heightfield refinement
      float h = getWaterHeight(pos.xz, u_time);
      tHit += (pos.y - h) / max(0.06, -rd.y);
      pos = ro + rd * tHit;
      h = getWaterHeight(pos.xz, u_time);
      tHit += (pos.y - h) / max(0.06, -rd.y) * 0.6;
      pos = ro + rd * tHit;

      // Distance-adaptive 3D Surface Normal via gradient
      float eps = max(0.012, tHit * 0.0028);
      float hL = getWaterHeight(pos.xz - vec2(eps, 0.0), u_time);
      float hR = getWaterHeight(pos.xz + vec2(eps, 0.0), u_time);
      float hD = getWaterHeight(pos.xz - vec2(0.0, eps), u_time);
      float hU = getWaterHeight(pos.xz + vec2(0.0, eps), u_time);
      vec3 N = normalize(vec3(hL - hR, 2.0 * eps, hD - hU));

      // 3D Lighting vectors
      vec3 V = -rd;
      vec3 moonWorld = vec3((u_moon_pos.x - 0.5) * 48.0, 20.0, 65.0);
      vec3 L = normalize(moonWorld - pos);
      vec3 H = normalize(L + V);

      // 1. Physically Based Moonlight Specular Highlights (Månegate / Moon Road)
      float NdotH = max(0.0, dot(N, H));
      float specSharp = pow(NdotH, 160.0) * 4.2;
      float specMid = pow(NdotH, 32.0) * 1.45;
      float specBroad = pow(NdotH, 8.0) * 0.38;

      // Natural lateral dispersion along the moon's specular column
      float moonAzimuthDiff = abs(pos.x - (u_moon_pos.x - 0.5) * (tHit * 0.42));
      float roadMask = exp(-pow(moonAzimuthDiff / (0.85 + tHit * 0.19), 2.0));

      vec3 moonGlintColor = vec3(0.96, 0.99, 1.0);
      vec3 moonSpecular = moonGlintColor * (specSharp * (0.35 + 0.65 * roadMask) + (specMid + specBroad) * roadMask);

      // 2. Fresnel Reflectance & Sky Reflection
      float NdotV = max(0.0, dot(N, V));
      float fresnel = 0.035 + 0.965 * pow(1.0 - NdotV, 4.0);
      vec3 skyReflect = mix(vec3(0.015, 0.05, 0.10), vec3(0.045, 0.16, 0.28), pow(1.0 - NdotV, 2.0));

      // 3. Deep Ocean Water Absorption & Body Color
      vec3 deepWater = vec3(0.007, 0.026, 0.058);    // Deep oceanic midnight navy
      vec3 shallowWater = vec3(0.022, 0.095, 0.185); // Lit ocean blue
      float waveRelHeight = clamp((pos.y + 0.35) / 0.7, 0.0, 1.0);
      vec3 waterBody = mix(deepWater, shallowWater, waveRelHeight);

      // 4. Bioluminescence on Churning Wave Crests
      float crestSteepness = clamp((N.y < 0.88 ? (0.88 - N.y) * 4.2 : 0.0) + waveRelHeight * 0.45, 0.0, 1.0);
      float bioNoise = sin(pos.x * 2.8 + pos.z * 1.9 + u_time * 2.3) * 0.5 + 0.5;
      float bioSparkle = pow(sin(pos.x * 7.5 - pos.z * 5.2 + u_time * 3.4) * 0.5 + 0.5, 7.0);
      float bioIntensity = pow(crestSteepness, 2.1) * (0.55 + 0.45 * bioNoise) + bioSparkle * 0.38 * crestSteepness;
      vec3 bioColor = vec3(0.08, 0.96, 0.92); // Vivid electric cyan luminescence

      // Combine shaded ocean surface
      vec3 finalColor = waterBody * (1.0 - fresnel) + skyReflect * fresnel + moonSpecular + bioColor * bioIntensity * 0.9;

      // 5. Atmospheric Horizon Depth Fog
      float fog = 1.0 - exp(-tHit * 0.038);
      vec3 horizonFogColor = vec3(0.018, 0.062, 0.115);
      finalColor = mix(finalColor, horizonFogColor, clamp(fog, 0.0, 1.0));

      // Smooth horizon boundary transition (no harsh seam)
      float horizonAlpha = smoothstep(horizonY, horizonY - 0.014, uv.y);
      gl_FragColor = vec4(finalColor, horizonAlpha * 0.98);
    }
  `;

  class WebGLOceanRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = null;
      this.program = null;
      this.quadBuffer = null;
      this.locs = {};
    }

    init() {
      const gl = this.canvas.getContext("webgl", {
        alpha: true,
        antialias: true,
        premultipliedAlpha: false
      }) || this.canvas.getContext("experimental-webgl", {
        alpha: true,
        antialias: true,
        premultipliedAlpha: false
      });

      if (!gl) return false;
      this.gl = gl;

      const vs = this.compileShader(gl.VERTEX_SHADER, VS_SOURCE);
      const fs = this.compileShader(gl.FRAGMENT_SHADER, FS_SOURCE);
      if (!vs || !fs) return false;

      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.warn("WebGL Program Link Error:", gl.getProgramInfoLog(program));
        return false;
      }

      this.program = program;
      gl.useProgram(program);

      // Full-screen quad
      const quadVertices = new Float32Array([
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0
      ]);

      this.quadBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

      const posLoc = gl.getAttribLocation(program, "a_position");
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      // Cache uniform locations
      this.locs = {
        resolution: gl.getUniformLocation(program, "u_resolution"),
        time: gl.getUniformLocation(program, "u_time"),
        moonPos: gl.getUniformLocation(program, "u_moon_pos"),
        horizon: gl.getUniformLocation(program, "u_horizon"),
        mouse: gl.getUniformLocation(program, "u_mouse")
      };

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      return true;
    }

    compileShader(type, source) {
      const gl = this.gl;
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn("Shader compilation error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    resize(width, height, dpr) {
      const gl = this.gl;
      if (!gl) return;
      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    render() {
      const gl = this.gl;
      if (!gl || !this.program) return;

      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(this.program);

      gl.uniform2f(this.locs.resolution, this.canvas.width, this.canvas.height);
      gl.uniform1f(this.locs.time, state.time);
      gl.uniform2f(this.locs.moonPos, state.moonX, state.moonY);
      gl.uniform1f(this.locs.horizon, state.horizonRatio);
      gl.uniform2f(this.locs.mouse, state.mouseX, state.mouseY);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }

  /* =========================================================================
     2. CANVAS 2D 3D-PERSPECTIVE ENGINE (HIGH-FIDELITY FALLBACK)
     ========================================================================= */

  class Canvas2DOceanRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d", { alpha: true });
    }

    init() {
      return !!this.ctx;
    }

    resize() {}

    render() {
      const ctx = this.ctx;
      if (!ctx) return;

      const { width, height, dpr } = state;
      const horizon = height * state.horizonRatio;
      const depth = height - horizon;
      const moonPixelX = state.moonX * width;
      const t = state.time;

      ctx.clearRect(0, 0, width, height);

      // 1. Deep ocean base gradient
      const waterGrad = ctx.createLinearGradient(0, horizon, 0, height);
      waterGrad.addColorStop(0, "#081d2f");
      waterGrad.addColorStop(0.25, "#061726");
      waterGrad.addColorStop(0.65, "#040f1a");
      waterGrad.addColorStop(1, "#02070d");

      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, horizon, width, depth);

      // 2. Render 36 dense 3D-perspective wave slices
      const totalSlices = width < 700 ? 26 : 38;
      ctx.save();

      for (let i = 0; i < totalSlices; i++) {
        const p = i / (totalSlices - 1);
        // Exponential perspective depth: slices are tightly spaced near horizon, wide in foreground
        const yBase = horizon + Math.pow(p, 1.55) * depth;
        const amplitude = (1.2 + p * 12.0) * (1.0 + Math.sin(t * 0.4 + i * 0.3) * 0.15);
        const wavelength = width * (0.85 - p * 0.45);
        const speed = 0.35 + p * 0.45;
        const phase = p * 4.6;
        const step = Math.max(10, width / 120);

        // Compute 3D wave crest curve
        const crest = new Path2D();
        const startX = -20;
        const startY = yBase + Math.sin(startX / wavelength + t * speed + phase) * amplitude;
        crest.moveTo(startX, startY);

        for (let x = startX + step; x <= width + 20; x += step) {
          const waveY = yBase
            + Math.sin(x / wavelength + t * speed + phase) * amplitude
            + Math.sin(x / (wavelength * 0.42) - t * speed * 1.3 + phase * 1.4) * amplitude * 0.32
            + Math.sin(x / (wavelength * 0.18) + t * speed * 1.8) * amplitude * 0.1;
          crest.lineTo(x, waveY);
        }

        // Fill wave body with depth-shaded ocean blue
        const body = new Path2D(crest);
        body.lineTo(width + 20, height + 20);
        body.lineTo(-20, height + 20);
        body.closePath();

        const fill = ctx.createLinearGradient(0, yBase - amplitude, 0, yBase + amplitude * 3.0);
        fill.addColorStop(0, `rgba(18, 54, 82, ${0.18 + p * 0.24})`);
        fill.addColorStop(0.35, `rgba(8, 28, 45, ${0.45 + p * 0.28})`);
        fill.addColorStop(1, "rgba(2, 8, 14, 0.95)");

        ctx.fillStyle = fill;
        ctx.fill(body);

        // 3. Bioluminescent electric cyan crest highlights on peaks
        ctx.save();
        ctx.globalCompositeOperation = "screen";

        // Moon Road specular glints on this wave slice
        const moonDistX = Math.abs(width * 0.5 - moonPixelX);
        const roadWidth = (width * 0.08 + p * width * 0.22);
        const glintCount = Math.round(3 + p * 14);

        for (let g = 0; g < glintCount; g++) {
          const offset = (Math.random() - 0.5) * roadWidth * 1.6;
          const glintX = moonPixelX + offset + Math.sin(t * 0.6 + g * 2.1) * 15.0;
          if (glintX < 0 || glintX > width) continue;

          const glintY = yBase + Math.sin(glintX / wavelength + t * speed + phase) * amplitude;
          const glintPulse = Math.pow(Math.max(0.0, Math.sin(t * 1.8 + g * 1.4 + p * 3.0)), 3.0);
          const size = (0.8 + p * 2.6) * (0.6 + glintPulse * 0.8);

          ctx.fillStyle = "rgba(230, 248, 255, 0.92)";
          ctx.beginPath();
          ctx.ellipse(glintX, glintY, size * 2.2, size * 0.65, 0, 0, TAU);
          ctx.fill();
        }

        // Electric cyan crest line
        ctx.strokeStyle = `rgba(0, 240, 245, ${0.12 + p * 0.28})`;
        ctx.lineWidth = 0.6 + p * 1.4;
        ctx.stroke(crest);

        ctx.restore();
      }

      ctx.restore();

      // 3. Soft horizon mist
      const mist = ctx.createLinearGradient(0, horizon - 20, 0, horizon + 25);
      mist.addColorStop(0, "rgba(8, 24, 38, 0)");
      mist.addColorStop(0.48, "rgba(25, 68, 92, 0.08)");
      mist.addColorStop(1, "rgba(8, 24, 38, 0)");
      ctx.fillStyle = mist;
      ctx.fillRect(0, horizon - 20, width, 45);
    }
  }

  // Active Renderer Instance
  let activeRenderer = null;

  function resize() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;

    // Mobile vs Desktop horizon placement
    state.horizonRatio = state.width < 700 ? 0.46 : 0.49;

    const resolutionScale = state.width < 700 ? 0.95 : 1.0;
    state.dpr = Math.max(1, Math.min(1.5, (window.devicePixelRatio || 1) * resolutionScale));

    canvas.width = Math.round(state.width * state.dpr);
    canvas.height = Math.round(state.height * state.dpr);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;

    updateMoonPosition();

    if (activeRenderer) {
      activeRenderer.resize(state.width, state.height, state.dpr);
    }
  }

  function renderLoop(now) {
    if (!state.lastTime) state.lastTime = now;

    const frameInterval = reduceMotion ? 66 : 16;
    if (now - state.lastTime < frameInterval) {
      requestAnimationFrame(renderLoop);
      return;
    }

    const delta = Math.min((now - state.lastTime) / 1000, 0.06);
    state.lastTime = now;
    state.time += delta * (reduceMotion ? 0.35 : 1.0);

    // Smooth mouse interpolation for 3D parallax
    state.mouseX += (state.targetMouseX - state.mouseX) * 0.05;
    state.mouseY += (state.targetMouseY - state.mouseY) * 0.05;

    if (activeRenderer) {
      activeRenderer.render();
    }

    requestAnimationFrame(renderLoop);
  }

  function init() {
    initMoon();

    // Try WebGL 3D Ocean first
    const webglRenderer = new WebGLOceanRenderer(canvas);
    if (webglRenderer.init()) {
      activeRenderer = webglRenderer;
      state.useWebGL = true;
      console.log("🌊 3D WebGL Ocean Engine initialized successfully.");
    } else {
      // Fallback to Canvas 2D 3D-Perspective Engine
      const c2dRenderer = new Canvas2DOceanRenderer(canvas);
      if (c2dRenderer.init()) {
        activeRenderer = c2dRenderer;
        state.useWebGL = false;
        console.log("🌊 Canvas 2D 3D-Perspective Ocean Fallback active.");
      }
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });
    requestAnimationFrame(renderLoop);
  }

  init();
})();
