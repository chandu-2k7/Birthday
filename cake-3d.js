/**
 * 🎂 REALISTIC 3D BIRTHDAY CAKE ENGINE (Three.js & WebGL)
 * Features:
 *  - Photorealistic dual-tier chocolate & vanilla buttercream cake
 *  - Organic spatula-frosted buttercream PBR normal & roughness textures
 *  - Glossy dark chocolate mirror ganache with physical cascading drips
 *  - Piped whipped cream rosettes, fresh ruby strawberries, chocolate curls & gold pearls
 *  - 5 realistic striped birthday candles with twisted cotton wicks
 *  - Procedural burning flame simulation with flickering core, amber envelope & dynamic firelight
 *  - Natural candle blowing physics: wind-shear flame bending, incandescent glowing ember wicks,
 *    and rising turbulent smoke trails
 *  - Interactive 3D orbital mouse / touch tilt parallax
 *  - Web Audio API microphone breath / blow detection
 */

(() => {
  "use strict";

  // Check Three.js availability
  if (typeof THREE === "undefined") {
    console.error("Three.js is required for Cake3D but was not found.");
    return;
  }

  class Cake3DEngine {
    constructor() {
      this.container = null;
      this.canvas = null;
      this.scene = null;
      this.camera = null;
      this.renderer = null;

      // Cake object hierarchy
      this.cakeGroup = null;
      this.standMesh = null;
      this.candles = [];
      this.flames = [];
      this.flameLights = [];
      this.wicks = [];
      this.wickEmbers = [];
      this.smokeParticles = [];

      // State
      this.isBlown = false;
      this.isBlowing = false;
      this.blowProgress = 0;
      this.time = 0;
      this.clock = new THREE.Clock();

      // Mouse / Touch Parallax
      this.targetRotX = 0.22;
      this.targetRotY = 0;
      this.currentRotX = 0.22;
      this.currentRotY = 0;

      // Microphone blow detector
      this.micActive = false;
      this.audioContext = null;
      this.micStream = null;
      this.analyser = null;
      this.blowHistory = [];

      // Callbacks
      this.onBlowComplete = null;
    }

    init(containerId = "cake-3d-viewport", canvasId = "cake-3d-canvas") {
      this.container = document.getElementById(containerId);
      this.canvas = document.getElementById(canvasId);

      if (!this.container || !this.canvas) {
        console.warn("Cake3D container or canvas not found:", containerId, canvasId);
        return false;
      }

      const width = this.container.clientWidth || 440;
      const height = this.container.clientHeight || 400;

      // 1. Scene
      this.scene = new THREE.Scene();

      // 2. Camera: 3/4 perspective view
      this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
      this.camera.position.set(0, 3.4, 7.2);
      this.camera.lookAt(0, 0.95, 0);

      // 3. Renderer with PBR lighting & shadow maps
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance"
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // 4. Lighting setup
      this.setupLighting();

      // 5. Build 3D Cake Hierarchy
      this.cakeGroup = new THREE.Group();
      this.cakeGroup.position.set(0, -0.15, 0);
      this.scene.add(this.cakeGroup);

      this.buildPedestalStand();
      this.buildCakeTiers();
      this.buildDecorations();
      this.buildCandlesAndFlames();
      this.buildSmokeSystem();

      // 6. Interaction listeners
      this.setupEventListeners();

      // 7. Start render loop
      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);

      console.log("🎂 Realistic 3D Birthday Cake Engine initialized.");
      return true;
    }

    /* -------------------------------------------------------------
       LIGHTING & SHADOWS
       ------------------------------------------------------------- */
    setupLighting() {
      // Soft ambient moonlight
      const ambientLight = new THREE.AmbientLight(0xd4eaff, 0.65);
      this.scene.add(ambientLight);

      // Key light: overhead warm moonbeam
      const keyLight = new THREE.DirectionalLight(0xfff5e6, 1.4);
      keyLight.position.set(3.5, 8, 4.5);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 18;
      keyLight.shadow.camera.left = -3;
      keyLight.shadow.camera.right = 3;
      keyLight.shadow.camera.top = 3;
      keyLight.shadow.camera.bottom = -3;
      keyLight.shadow.bias = -0.001;
      this.scene.add(keyLight);

      // Cool rim light from behind (moonlit ocean reflection)
      const rimLight = new THREE.DirectionalLight(0x7ad8ff, 0.95);
      rimLight.position.set(-4, 4, -4);
      this.scene.add(rimLight);

      // Contact shadow receiver beneath pedestal
      const shadowPlaneGeo = new THREE.PlaneGeometry(8, 8);
      const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.38 });
      const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
      shadowPlane.rotation.x = -Math.PI / 2;
      shadowPlane.position.y = -0.12;
      shadowPlane.receiveShadow = true;
      this.scene.add(shadowPlane);
    }

    /* -------------------------------------------------------------
       PROCEDURAL TEXTURES
       ------------------------------------------------------------- */
    createFrostingNormalMap() {
      const size = 512;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#8080ff"; // flat normal
      ctx.fillRect(0, 0, size, size);

      const imgData = ctx.getImageData(0, 0, size, size);
      const data = imgData.data;

      // Generate subtle spatula strokes & buttercream texture
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const idx = (y * size + x) * 4;
          const nx = (x / size) * 8.0;
          const ny = (y / size) * 4.0;
          // Wavy horizontal spatula strokes
          const swirl = Math.sin(ny * 6.0 + Math.cos(nx * 3.0) * 1.5);
          const noise = Math.sin(nx * 32.0 + ny * 18.0) * 0.25;

          const bumpX = Math.cos(nx * 6.0) * 0.15;
          const bumpY = swirl * 0.2 + noise * 0.1;

          data[idx] = Math.floor(128 + bumpX * 127);
          data[idx + 1] = Math.floor(128 + bumpY * 127);
          data[idx + 2] = 255;
          data[idx + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(3, 1.5);
      return texture;
    }

    createGanacheGlazeTexture() {
      const size = 512;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      // Glossy dark chocolate gradient
      const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 256);
      grad.addColorStop(0, "#3e190e");
      grad.addColorStop(0.65, "#250d06");
      grad.addColorStop(1, "#180703");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      // Fine golden dust / chocolate swirls
      for (let i = 0; i < 180; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = Math.random() * 1.8 + 0.6;
        ctx.fillStyle = Math.random() > 0.4 ? "rgba(255, 215, 140, 0.45)" : "rgba(255, 255, 255, 0.25)";
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      const texture = new THREE.CanvasTexture(canvas);
      return texture;
    }

    createSpiralCandleTexture(colorA = "#ff6b8b", colorB = "#ffffff") {
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = colorA;
      ctx.fillRect(0, 0, size, size);

      ctx.fillStyle = colorB;
      const stripeWidth = size / 6;
      ctx.beginPath();
      for (let i = -size; i < size * 2; i += stripeWidth * 2) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i + stripeWidth, 0);
        ctx.lineTo(i + stripeWidth + size, size);
        ctx.lineTo(i + size, size);
        ctx.closePath();
      }
      ctx.fill();

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 4);
      return texture;
    }

    /* -------------------------------------------------------------
       GEOMETRY: PEDESTAL STAND
       ------------------------------------------------------------- */
    buildPedestalStand() {
      const standGroup = new THREE.Group();

      // Premium white porcelain ceramic material with soft reflection
      const ceramicMat = new THREE.MeshStandardMaterial({
        color: 0xf4f7fa,
        roughness: 0.18,
        metalness: 0.08,
      });

      // Gold rim trim
      const goldTrimMat = new THREE.MeshStandardMaterial({
        color: 0xe6b85c,
        roughness: 0.28,
        metalness: 0.85
      });

      // 1. Platter plate top
      const platterGeo = new THREE.CylinderGeometry(2.32, 2.22, 0.1, 48);
      const platter = new THREE.Mesh(platterGeo, ceramicMat);
      platter.position.y = 0.35;
      platter.receiveShadow = true;
      platter.castShadow = true;
      standGroup.add(platter);

      // Gold rim around platter
      const goldRimGeo = new THREE.TorusGeometry(2.28, 0.024, 16, 64);
      const goldRim = new THREE.Mesh(goldRimGeo, goldTrimMat);
      goldRim.rotation.x = Math.PI / 2;
      goldRim.position.y = 0.38;
      standGroup.add(goldRim);

      // 2. Gracefully curved pedestal stem
      const stemPoints = [];
      stemPoints.push(new THREE.Vector2(0.95, 0.0));
      stemPoints.push(new THREE.Vector2(0.85, 0.04));
      stemPoints.push(new THREE.Vector2(0.38, 0.12));
      stemPoints.push(new THREE.Vector2(0.24, 0.22));
      stemPoints.push(new THREE.Vector2(0.42, 0.34));
      const stemGeo = new THREE.LatheGeometry(stemPoints, 36);
      const stem = new THREE.Mesh(stemGeo, ceramicMat);
      stem.castShadow = true;
      stem.receiveShadow = true;
      standGroup.add(stem);

      this.cakeGroup.add(standGroup);
    }

    /* -------------------------------------------------------------
       GEOMETRY: CAKE TIERS & GANACHE DRIPS
       ------------------------------------------------------------- */
    buildCakeTiers() {
      const frostingNormal = this.createFrostingNormalMap();
      const ganacheTexture = this.createGanacheGlazeTexture();

      // Velvet Chocolate Buttercream Material
      const chocolateFrostingMat = new THREE.MeshStandardMaterial({
        color: 0x3a190f,
        roughness: 0.42,
        metalness: 0.04,
        normalMap: frostingNormal,
        normalScale: new THREE.Vector2(0.4, 0.4)
      });

      // Glossy Mirror Chocolate Ganache Glaze
      const ganacheGlazeMat = new THREE.MeshStandardMaterial({
        color: 0x220c06,
        roughness: 0.12,
        metalness: 0.06,
        map: ganacheTexture
      });

      // Creamy Vanilla Buttercream Material (Tier 2 body)
      const vanillaFrostingMat = new THREE.MeshStandardMaterial({
        color: 0xfff3e4,
        roughness: 0.38,
        metalness: 0.02,
        normalMap: frostingNormal,
        normalScale: new THREE.Vector2(0.35, 0.35)
      });

      // ==========================================
      // TIER 1: BOTTOM TIER (Rich Dark Chocolate)
      // ==========================================
      const t1Radius = 1.95;
      const t1Height = 1.15;
      const t1Y = 0.4 + t1Height / 2;

      const tier1Geo = new THREE.CylinderGeometry(t1Radius, t1Radius, t1Height, 64);
      const tier1Mesh = new THREE.Mesh(tier1Geo, chocolateFrostingMat);
      tier1Mesh.position.y = t1Y;
      tier1Mesh.castShadow = true;
      tier1Mesh.receiveShadow = true;
      this.cakeGroup.add(tier1Mesh);

      // Top ganache pool on Tier 1
      const t1TopGeo = new THREE.CylinderGeometry(t1Radius * 0.99, t1Radius * 0.99, 0.02, 64);
      const t1TopMesh = new THREE.Mesh(t1TopGeo, ganacheGlazeMat);
      t1TopMesh.position.y = t1Y + t1Height / 2 + 0.01;
      t1TopMesh.receiveShadow = true;
      this.cakeGroup.add(t1TopMesh);

      // Cascading chocolate ganache drips on Tier 1
      this.buildGanacheDrips(t1Radius, t1Y + t1Height / 2, 28, 0.18, 0.52);

      // Base border: Piped whipped cream rosettes circling the bottom stand
      this.buildRosetteRing(t1Radius + 0.08, 0.42, 24, 0.13, 0xfff6ec);

      // ==========================================
      // TIER 2: TOP TIER (Creamy Vanilla & Mirror Ganache)
      // ==========================================
      const t2Radius = 1.34;
      const t2Height = 0.95;
      const t2Y = t1Y + t1Height / 2 + t2Height / 2;

      const tier2Geo = new THREE.CylinderGeometry(t2Radius, t2Radius, t2Height, 64);
      const tier2Mesh = new THREE.Mesh(tier2Geo, vanillaFrostingMat);
      tier2Mesh.position.y = t2Y;
      tier2Mesh.castShadow = true;
      tier2Mesh.receiveShadow = true;
      this.cakeGroup.add(tier2Mesh);

      // Thick glossy chocolate ganache glaze cap on Tier 2
      const t2TopGeo = new THREE.CylinderGeometry(t2Radius * 0.99, t2Radius * 0.99, 0.03, 64);
      const t2TopMesh = new THREE.Mesh(t2TopGeo, ganacheGlazeMat);
      t2TopMesh.position.y = t2Y + t2Height / 2 + 0.012;
      t2TopMesh.receiveShadow = true;
      this.cakeGroup.add(t2TopMesh);

      // Cascading chocolate ganache drips on Tier 2
      this.buildGanacheDrips(t2Radius, t2Y + t2Height / 2, 20, 0.16, 0.46);

      // Piped cream rosettes around Tier 2 top perimeter
      this.buildRosetteRing(t2Radius - 0.08, t2Y + t2Height / 2 + 0.04, 14, 0.11, 0xfff7ee);

      this.topSurfaceY = t2Y + t2Height / 2 + 0.02;
    }

    /* -------------------------------------------------------------
       GEOMETRY: GANACHE DRIPS
       ------------------------------------------------------------- */
    buildGanacheDrips(radius, topY, count, minLen, maxLen) {
      const dripMat = new THREE.MeshStandardMaterial({
        color: 0x1f0c05,
        roughness: 0.12,
        metalness: 0.06
      });

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        // Natural variation in drip lengths
        const pseudoRand = Math.sin(i * 3.8) * 0.5 + 0.5;
        const len = minLen + pseudoRand * (maxLen - minLen);

        // Rounded droplet mesh at bottom of drip
        const dripMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.062, 12, 12),
          dripMat
        );
        dripMesh.scale.set(1.0, 1.4, 0.7);

        const x = Math.cos(angle) * (radius + 0.018);
        const z = Math.sin(angle) * (radius + 0.018);
        const y = topY - len;

        dripMesh.position.set(x, y, z);
        dripMesh.rotation.y = -angle + Math.PI / 2;
        dripMesh.castShadow = true;
        this.cakeGroup.add(dripMesh);

        // Cylinder body connecting the top rim to the drip tip
        const stemHeight = Math.max(0.04, len);
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.045, 0.055, stemHeight, 8),
          dripMat
        );
        stem.position.set(x, topY - stemHeight / 2, z);
        stem.rotation.y = -angle;
        this.cakeGroup.add(stem);
      }
    }

    /* -------------------------------------------------------------
       GEOMETRY: PIPED WHIPPED CREAM ROSETTES
       ------------------------------------------------------------- */
    buildRosetteRing(radius, y, count, scale, colorHex) {
      const creamMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.45,
        metalness: 0.02
      });

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        // Realistic fluted rosette (pinched spiral cone with fluting)
        const rosette = new THREE.Mesh(
          new THREE.ConeGeometry(scale * 1.1, scale * 1.4, 7),
          creamMat
        );
        rosette.position.set(x, y + scale * 0.7, z);
        rosette.rotation.y = angle + Math.PI / 4;
        rosette.rotation.z = Math.sin(angle * 2) * 0.08;
        rosette.castShadow = true;
        rosette.receiveShadow = true;
        this.cakeGroup.add(rosette);

        // Dollop pearl top
        const tip = new THREE.Mesh(
          new THREE.SphereGeometry(scale * 0.45, 8, 8),
          creamMat
        );
        tip.position.set(x, y + scale * 1.35, z);
        this.cakeGroup.add(tip);
      }
    }

    /* -------------------------------------------------------------
       GEOMETRY: FRESH STRAWBERRIES, CHOCOLATE CURLS & GOLD PEARLS
       ------------------------------------------------------------- */
    buildDecorations() {
      // 1. Fresh Glossy Ruby Strawberries
      const strawberryMat = new THREE.MeshStandardMaterial({
        color: 0xdd1a28,
        roughness: 0.22,
        metalness: 0.04
      });

      const calyxMat = new THREE.MeshStandardMaterial({
        color: 0x27ae60,
        roughness: 0.45
      });

      const berryPositions = [
        { x: -0.85, z: 0.25, rot: -0.2 },
        { x: 0.85, z: 0.22, rot: 0.25 },
        { x: -0.35, z: 0.75, rot: 0.15 },
        { x: 0.42, z: 0.72, rot: -0.18 }
      ];

      berryPositions.forEach(pos => {
        const berryGroup = new THREE.Group();

        // Strawberry heart/cone shape
        const berryMesh = new THREE.Mesh(
          new THREE.ConeGeometry(0.19, 0.36, 16),
          strawberryMat
        );
        berryMesh.rotation.x = Math.PI;
        berryMesh.scale.set(1.0, 1.0, 0.88);
        berryMesh.castShadow = true;
        berryGroup.add(berryMesh);

        // Green leaves (calyx)
        for (let l = 0; l < 5; l++) {
          const leaf = new THREE.Mesh(
            new THREE.ConeGeometry(0.07, 0.16, 4),
            calyxMat
          );
          leaf.position.y = 0.18;
          leaf.rotation.z = 0.8;
          leaf.rotation.y = (l / 5) * Math.PI * 2;
          berryGroup.add(leaf);
        }

        berryGroup.position.set(pos.x, this.topSurfaceY + 0.18, pos.z);
        berryGroup.rotation.y = pos.rot * 4.0;
        berryGroup.rotation.z = pos.rot;
        this.cakeGroup.add(berryGroup);
      });

      // 2. Rolled Chocolate Wafer Pirouettes
      const waferMat = new THREE.MeshStandardMaterial({
        color: 0x5a2d18,
        roughness: 0.35,
        metalness: 0.05
      });

      const wafer1 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.042, 1.45, 12),
        waferMat
      );
      wafer1.position.set(-0.15, this.topSurfaceY + 0.24, -0.25);
      wafer1.rotation.set(0.2, 0.65, 1.35);
      wafer1.castShadow = true;
      this.cakeGroup.add(wafer1);

      const wafer2 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.042, 1.35, 12),
        waferMat
      );
      wafer2.position.set(0.12, this.topSurfaceY + 0.28, -0.15);
      wafer2.rotation.set(-0.25, -0.45, 1.25);
      wafer2.castShadow = true;
      this.cakeGroup.add(wafer2);

      // 3. Shiny Metallic Gold Sprinkle Pearls
      const goldPearlMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        roughness: 0.18,
        metalness: 0.88
      });

      for (let i = 0; i < 30; i++) {
        const pearl = new THREE.Mesh(
          new THREE.SphereGeometry(0.024 + Math.random() * 0.014, 8, 8),
          goldPearlMat
        );
        const r = Math.random() * 1.15;
        const theta = Math.random() * Math.PI * 2;
        pearl.position.set(
          Math.cos(theta) * r,
          this.topSurfaceY + 0.012,
          Math.sin(theta) * r
        );
        this.cakeGroup.add(pearl);
      }
    }

    /* -------------------------------------------------------------
       GEOMETRY: CANDLES, FLICKERING FLAMES & FIRELIGHT
       ------------------------------------------------------------- */
    buildCandlesAndFlames() {
      const candleColors = [
        { a: "#ff6b8b", b: "#ffffff" }, // Rose / white
        { a: "#ffa502", b: "#ffffff" }, // Gold peach / white
        { a: "#2ed573", b: "#ffffff" }, // Mint / white
        { a: "#1e90ff", b: "#ffffff" }, // Sky blue / white
        { a: "#a55eea", b: "#ffffff" }  // Lavender / white
      ];

      // 5 Candle positions in a graceful balanced arc
      const candlePos = [
        { x: -0.68, z: -0.05, height: 0.82 },
        { x: -0.35, z: -0.32, height: 0.94 },
        { x:  0.00, z: -0.42, height: 1.05 }, // Center tallest
        { x:  0.35, z: -0.32, height: 0.94 },
        { x:  0.68, z: -0.05, height: 0.82 }
      ];

      const wickMat = new THREE.MeshBasicMaterial({ color: 0x1f1a18 });

      candlePos.forEach((pos, idx) => {
        const cGroup = new THREE.Group();
        cGroup.position.set(pos.x, this.topSurfaceY, pos.z);

        // 1. Striped Candle Wax Cylinder
        const candleTex = this.createSpiralCandleTexture(candleColors[idx].a, candleColors[idx].b);
        const waxMat = new THREE.MeshStandardMaterial({
          map: candleTex,
          roughness: 0.32,
          metalness: 0.02
        });

        const candleRadius = 0.056;
        const waxMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(candleRadius, candleRadius, pos.height, 18),
          waxMat
        );
        waxMesh.position.y = pos.height / 2;
        waxMesh.castShadow = true;
        cGroup.add(waxMesh);

        // 2. Cotton Wick
        const wickHeight = 0.14;
        const wickMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.012, 0.012, wickHeight, 6),
          wickMat
        );
        wickMesh.position.y = pos.height + wickHeight / 2;
        cGroup.add(wickMesh);

        // 3. Glowing Wick Ember (hidden while burning; glows red/orange when flame is blown out)
        const emberMat = new THREE.MeshBasicMaterial({
          color: 0xff3300,
          transparent: true,
          opacity: 0.0
        });
        const emberMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.022, 8, 8),
          emberMat
        );
        emberMesh.position.y = pos.height + wickHeight;
        cGroup.add(emberMesh);
        this.wickEmbers.push(emberMat);

        // 4. Realistic Multi-Layered Flame Mesh
        const flameGroup = new THREE.Group();
        flameGroup.position.y = pos.height + wickHeight + 0.01;

        // Outer warm amber-orange flame teardrop
        const outerFlameGeo = new THREE.ConeGeometry(0.082, 0.34, 14);
        outerFlameGeo.translate(0, 0.17, 0); // Origin at wick base
        const outerFlameMat = new THREE.MeshBasicMaterial({
          color: 0xff8811,
          transparent: true,
          opacity: 0.92,
          blending: THREE.AdditiveBlending
        });
        const outerFlame = new THREE.Mesh(outerFlameGeo, outerFlameMat);
        flameGroup.add(outerFlame);

        // Inner white-yellow luminous core
        const innerFlameGeo = new THREE.ConeGeometry(0.046, 0.22, 12);
        innerFlameGeo.translate(0, 0.11, 0);
        const innerFlameMat = new THREE.MeshBasicMaterial({
          color: 0xfffbee,
          transparent: true,
          opacity: 0.98,
          blending: THREE.AdditiveBlending
        });
        const innerFlame = new THREE.Mesh(innerFlameGeo, innerFlameMat);
        flameGroup.add(innerFlame);

        // Deep blue flame root at base of wick
        const rootFlameGeo = new THREE.SphereGeometry(0.038, 8, 8);
        rootFlameGeo.scale(1.0, 0.7, 1.0);
        const rootFlameMat = new THREE.MeshBasicMaterial({
          color: 0x3388ff,
          transparent: true,
          opacity: 0.75,
          blending: THREE.AdditiveBlending
        });
        const rootFlame = new THREE.Mesh(rootFlameGeo, rootFlameMat);
        rootFlame.position.y = 0.03;
        flameGroup.add(rootFlame);

        cGroup.add(flameGroup);
        this.flames.push({
          group: flameGroup,
          outer: outerFlame,
          inner: innerFlame,
          baseY: flameGroup.position.y,
          flickerOffset: idx * 1.85
        });

        // 5. Dynamic Warm PointLight casting firelight reflections
        const flameLight = new THREE.PointLight(0xffa834, 1.15, 3.8, 2);
        flameLight.position.set(pos.x, this.topSurfaceY + pos.height + 0.24, pos.z);
        this.cakeGroup.add(flameLight);
        this.flameLights.push(flameLight);

        this.cakeGroup.add(cGroup);
        this.candles.push(cGroup);
        this.wicks.push({
          worldPos: new THREE.Vector3(pos.x, this.topSurfaceY + pos.height + wickHeight, pos.z)
        });
      });
    }

    /* -------------------------------------------------------------
       PARTICLES: SMOKE TRAILS AFTER BLOWOUT
       ------------------------------------------------------------- */
    buildSmokeSystem() {
      const smokeCount = 45;
      this.smokeSprites = [];
      this.smokePool = [];

      // Smoke point sprite texture
      const smokeCanvas = document.createElement("canvas");
      smokeCanvas.width = 64;
      smokeCanvas.height = 64;
      const sCtx = smokeCanvas.getContext("2d");
      const sGrad = sCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
      sGrad.addColorStop(0, "rgba(240, 245, 252, 0.85)");
      sGrad.addColorStop(0.35, "rgba(200, 215, 228, 0.45)");
      sGrad.addColorStop(0.75, "rgba(160, 180, 195, 0.15)");
      sGrad.addColorStop(1, "rgba(120, 140, 160, 0)");
      sCtx.fillStyle = sGrad;
      sCtx.fillRect(0, 0, 64, 64);
      const smokeTexture = new THREE.CanvasTexture(smokeCanvas);

      this.smokeGroup = new THREE.Group();
      this.cakeGroup.add(this.smokeGroup);

      // Particle simulation pool using individual Sprite billboards
      for (let i = 0; i < smokeCount; i++) {
        const mat = new THREE.SpriteMaterial({
          map: smokeTexture,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.NormalBlending
        });
        const sprite = new THREE.Sprite(mat);
        sprite.visible = false;
        this.smokeGroup.add(sprite);
        this.smokeSprites.push(sprite);

        this.smokePool.push({
          sprite: sprite,
          active: false,
          wickIndex: i % this.wicks.length,
          pos: new THREE.Vector3(),
          vel: new THREE.Vector3(),
          life: 0,
          maxLife: 2.2 + Math.random() * 1.4,
          baseSize: 0.16 + Math.random() * 0.12,
          rotSpeed: (Math.random() - 0.5) * 1.5
        });
      }
    }

    /* -------------------------------------------------------------
       INTERACTIONS: BLOW CANDLES, RELIGHT, AUDIO
       ------------------------------------------------------------- */
    blowCandles() {
      if (this.isBlown || this.isBlowing) return;
      this.isBlowing = true;
      this.blowProgress = 0;

      // Haptic feedback on supported mobile devices
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([40, 60, 120]);
      }

      console.log("💨 Candle blowing interaction started!");
    }

    relightCandles() {
      this.isBlown = false;
      this.isBlowing = false;
      this.blowProgress = 0;

      // 1. Restore flame visibility, scale, and point lights
      this.flames.forEach(f => {
        f.group.visible = true;
        f.group.scale.set(1, 1, 1);
        f.group.rotation.set(0, 0, 0);
      });

      this.flameLights.forEach(light => {
        light.intensity = 1.15;
      });

      // 2. Cool glowing wick embers
      this.wickEmbers.forEach(mat => {
        mat.opacity = 0.0;
      });

      // 3. Clear smoke
      this.smokePool.forEach(p => {
        p.active = false;
        if (p.sprite) {
          p.sprite.visible = false;
          p.sprite.material.opacity = 0;
        }
      });

      console.log("🕯️ Candles relit successfully.");
    }

    /* -------------------------------------------------------------
       MICROPHONE BREATH BLOW DETECTION
       ------------------------------------------------------------- */
    async startMicDetection(onBlowDetected) {
      if (this.micActive) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        this.micStream = stream;

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContextClass();
        if (this.audioContext.state === "suspended") {
          await this.audioContext.resume();
        }

        const source = this.audioContext.createMediaStreamSource(stream);

        // Low-pass / bandpass filter: Wind breath hits microphone diaphragm strongly around 100-300 Hz
        const filter = this.audioContext.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 180;
        filter.Q.value = 1.2;

        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 512;
        this.analyser.smoothingTimeConstant = 0.4;

        source.connect(filter);
        filter.connect(this.analyser);

        this.micActive = true;
        this.blowHistory = [];

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

        const checkMicLoop = () => {
          if (!this.micActive) return;

          this.analyser.getByteFrequencyData(dataArray);

          // Measure low-frequency breath turbulence energy
          let sum = 0;
          const lowBins = Math.min(24, dataArray.length);
          for (let i = 0; i < lowBins; i++) {
            sum += dataArray[i];
          }
          const avgLevel = sum / lowBins;

          // Track sustained breath blow
          if (avgLevel > 45) {
            this.blowHistory.push(avgLevel);
            if (this.blowHistory.length >= 4 && !this.isBlown && !this.isBlowing) {
              if (onBlowDetected) onBlowDetected();
              this.blowCandles();
            }
          } else {
            this.blowHistory = [];
          }

          requestAnimationFrame(checkMicLoop);
        };

        checkMicLoop();
        return true;
      } catch (err) {
        console.warn("Microphone access not granted or unavailable", err);
        this.micActive = false;
        return false;
      }
    }

    stopMicDetection() {
      this.micActive = false;
      if (this.micStream) {
        this.micStream.getTracks().forEach(track => track.stop());
        this.micStream = null;
      }
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }
    }

    /* -------------------------------------------------------------
       EVENT LISTENERS: ORBITAL PARALLAX & RESIZE
       ------------------------------------------------------------- */
    setupEventListeners() {
      // Mouse Parallax across the screen
      window.addEventListener("mousemove", (e) => {
        const nx = (e.clientX / window.innerWidth) * 2.0 - 1.0;
        const ny = (e.clientY / window.innerHeight) * 2.0 - 1.0;

        // Controlled 3D viewing angle tilt
        this.targetRotY = nx * 0.45;
        this.targetRotX = 0.22 + ny * 0.22;
      }, { passive: true });

      // Touch drag / tilt for mobile
      let touchStartX = 0;
      let touchStartY = 0;
      this.container.addEventListener("touchstart", (e) => {
        if (e.touches.length > 0) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      }, { passive: true });

      this.container.addEventListener("touchmove", (e) => {
        if (e.touches.length > 0) {
          const dx = (e.touches[0].clientX - touchStartX) / window.innerWidth;
          const dy = (e.touches[0].clientY - touchStartY) / window.innerHeight;
          this.targetRotY += dx * 0.15;
          this.targetRotX = Math.max(0.05, Math.min(0.55, this.targetRotX + dy * 0.15));
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      }, { passive: true });

      // Responsive Resize
      window.addEventListener("resize", () => {
        this.resize();
      }, { passive: true });
    }

    resize() {
      if (!this.container || !this.renderer || !this.camera) return;
      const width = this.container.clientWidth || 440;
      const height = this.container.clientHeight || 400;

      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    }

    /* -------------------------------------------------------------
       ANIMATION & RENDER LOOP
       ------------------------------------------------------------- */
    animate() {
      requestAnimationFrame(this.animate);

      const delta = Math.min(this.clock.getDelta(), 0.08);
      this.time += delta;

      // 1. Smooth Camera / Cake Tilt Interpolation
      this.currentRotX += (this.targetRotX - this.currentRotX) * 0.08;
      this.currentRotY += (this.targetRotY - this.currentRotY) * 0.08;

      if (this.cakeGroup) {
        // Gentle floating breath
        this.cakeGroup.position.y = -0.15 + Math.sin(this.time * 1.5) * 0.035;
        this.cakeGroup.rotation.x = this.currentRotX;
        // Subtle slow turntable idle spin combined with mouse tracking
        this.cakeGroup.rotation.y = this.currentRotY + Math.sin(this.time * 0.35) * 0.08;
      }

      // 2. Burning Flame Dynamics (Natural Flickering & Firelight)
      if (!this.isBlown && !this.isBlowing) {
        this.flames.forEach((f, idx) => {
          const t = this.time * 8.0 + f.flickerOffset;
          const noiseX = Math.sin(t * 1.4) * 0.06 + Math.sin(t * 3.8) * 0.03;
          const noiseZ = Math.cos(t * 1.1) * 0.06;
          const flickerScale = 0.94 + Math.sin(t * 4.2) * 0.08 + Math.cos(t * 2.1) * 0.05;

          // Natural flame wave movement
          f.group.rotation.z = noiseX;
          f.group.rotation.x = noiseZ;
          f.group.scale.set(flickerScale, flickerScale * 1.06, flickerScale);

          // Synchronize flickering firelight
          if (this.flameLights[idx]) {
            this.flameLights[idx].intensity = 1.05 + Math.sin(t * 3.5) * 0.22;
          }
        });
      }

      // 3. Candle Blowout Transition Physics (Bending flames, extinguishing, ember glow)
      if (this.isBlowing) {
        this.blowProgress += delta * 2.2; // ~450ms blowout sequence

        if (this.blowProgress < 0.6) {
          // Wind pushes flames: steep horizontal bend in wind direction
          const bendAngle = (this.blowProgress / 0.6) * 1.15;
          const windFlutter = Math.sin(this.time * 35.0) * 0.22;

          this.flames.forEach(f => {
            f.group.rotation.z = bendAngle + windFlutter;
            f.group.rotation.x = 0.2;
            f.group.scale.set(0.65, 1.4, 0.45);
          });

          this.flameLights.forEach(light => {
            light.intensity = Math.max(0, 1.2 * (1.0 - this.blowProgress / 0.6));
          });
        } else {
          // Extinguish flames!
          this.flames.forEach(f => {
            f.group.visible = false;
          });
          this.flameLights.forEach(light => {
            light.intensity = 0;
          });

          // Heat wicks to incandescent glowing embers
          const emberHeat = Math.min(1.0, (this.blowProgress - 0.6) * 3.5);
          this.wickEmbers.forEach(mat => {
            mat.opacity = Math.max(0, 1.0 - (this.blowProgress - 0.6) * 0.4);
          });

          // Spawn realistic smoke puffs
          this.spawnSmokePuffs(delta);
        }

        // Blow complete
        if (this.blowProgress >= 1.0 && !this.isBlown) {
          this.isBlown = true;
          this.isBlowing = false;
          if (this.onBlowComplete) {
            this.onBlowComplete();
          }
        }
      }

      // 4. Continued Smoke Simulation after Extinguishing
      if (this.isBlown) {
        this.spawnSmokePuffs(delta);

        // Gradually fade glowing wick embers to dark ash
        this.wickEmbers.forEach(mat => {
          if (mat.opacity > 0.01) {
            mat.opacity -= delta * 0.25;
          } else {
            mat.opacity = 0;
          }
        });
      }

      // 5. Update Smoke Particles Physics
      this.updateSmoke(delta);

      // 6. Render Frame
      this.renderer.render(this.scene, this.camera);
    }

    spawnSmokePuffs(delta) {
      if (Math.random() > 0.55) return; // Staggered realistic smoke puffing

      for (let w = 0; w < this.wicks.length; w++) {
        // Find inactive smoke particle
        const p = this.smokePool.find(item => !item.active && item.wickIndex === w);
        if (!p) continue;

        const wickWorld = this.wicks[w].worldPos;
        p.active = true;
        p.life = 0;
        p.pos.set(
          wickWorld.x + (Math.random() - 0.5) * 0.04,
          wickWorld.y + 0.02,
          wickWorld.z + (Math.random() - 0.5) * 0.04
        );
        // Buoyant upward velocity with slight random draft
        p.vel.set(
          (Math.random() - 0.5) * 0.08 + 0.04,
          0.38 + Math.random() * 0.22,
          (Math.random() - 0.5) * 0.08
        );
      }
    }

    updateSmoke(delta) {
      this.smokePool.forEach((p, i) => {
        if (!p.active) {
          if (p.sprite) p.sprite.visible = false;
          return;
        }

        p.life += delta;
        const progress = p.life / p.maxLife;

        if (progress >= 1.0) {
          p.active = false;
          if (p.sprite) p.sprite.visible = false;
          return;
        }

        if (p.sprite) {
          p.sprite.visible = true;

          // Upward movement with buoyant drift and turbulence
          p.pos.addScaledVector(p.vel, delta);
          p.pos.x += Math.sin(p.life * 4.0 + i) * 0.003;
          p.pos.z += Math.cos(p.life * 3.5 + i) * 0.003;
          p.vel.y *= 0.985;

          p.sprite.position.copy(p.pos);

          // Smooth fade-in, curl, then fade-out
          let alpha = 0.65;
          if (progress < 0.15) {
            alpha = (progress / 0.15) * 0.65;
          } else {
            alpha = (1.0 - (progress - 0.15) / 0.85) * 0.65;
          }
          p.sprite.material.opacity = Math.max(0, alpha);

          // Smoke expands as it rises
          const currentSize = p.baseSize * (1.0 + progress * 2.8);
          p.sprite.scale.set(currentSize, currentSize, 1.0);
          p.sprite.material.rotation += p.rotSpeed * delta;
        }
      });
    }
  }

  // Export globally
  window.Cake3D = new Cake3DEngine();
})();
