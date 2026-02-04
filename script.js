/* =========================
   THREE.JS VOLUMETRIC FOG
========================= */
const bgCanvas = document.getElementById("bg");
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x02030a, 0.08);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.z = 6;

const renderer = new THREE.WebGLRenderer({ canvas: bgCanvas, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(window.devicePixelRatio || 1);

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* Fog planes */
const fogGeo = new THREE.PlaneGeometry(20, 20);
const fogPlanes = [];
for (let i = 0; i < 12; i++) {
  const mat = new THREE.MeshBasicMaterial({
    color: 0x0c1020,
    transparent: true,
    opacity: 0.08
  });
  const plane = new THREE.Mesh(fogGeo, mat);
  plane.position.z = -i * 1.2;
  plane.rotation.z = Math.random();
  scene.add(plane);
  fogPlanes.push(plane);
}

/* =========================
   COLOR THEMES
========================= */
const THEMES = {
  cyber: {
    fogColor: 0x0c1020,
    fogPlaneBaseOpacity: 0.05,
    borderFrom: "#0ff",
    borderTo: "#f0f",
    mistA: "rgba(0, 255, 255, 0.14)",
    mistB: "rgba(255, 0, 255, 0.09)",
    glowRgb: "255,255,255"
  },
  ember: {
    fogColor: 0x1a0604,
    fogPlaneBaseOpacity: 0.045,
    borderFrom: "#ffb347",
    borderTo: "#ff0844",
    mistA: "rgba(255, 120, 60, 0.16)",
    mistB: "rgba(255, 40, 40, 0.08)",
    glowRgb: "255,200,150"
  },
  abyss: {
    fogColor: 0x020814,
    fogPlaneBaseOpacity: 0.06,
    borderFrom: "#4facfe",
    borderTo: "#00f2fe",
    mistA: "rgba(80, 160, 255, 0.16)",
    mistB: "rgba(0, 220, 255, 0.09)",
    glowRgb: "180,220,255"
  }
};

const themeOrder = ["cyber", "ember", "abyss"];
let themeIndex = 0;
let currentThemeName = themeOrder[0];

let themeFrom = THEMES[themeOrder[0]];
let themeTo = THEMES[themeOrder[1]];
let themeT = 0;          // 0..1
const THEME_CYCLE_DURATION = 20000; // ms full crossfade

let lastFrameTime = performance.now();

function hexToRgb(hex) {
  const h = hex.toString(16).padStart(6, "0");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  };
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function lerpRgb(c1, c2, t) {
  return {
    r: Math.round(lerp(c1.r, c2.r, t)),
    g: Math.round(lerp(c1.g, c2.g, t)),
    b: Math.round(lerp(c1.b, c2.b, t))
  };
}
function rgbToHex({ r, g, b }) {
  return (r << 16) | (g << 8) | b;
}
function parseRgbTriple(str) {
  const p = str.split(",").map(v => parseInt(v.trim(), 10));
  return { r: p[0] || 255, g: p[1] || 255, b: p[2] || 255 };
}
function rgbTripleString({ r, g, b }) {
  return `${r},${g},${b}`;
}
function parseRgbaOpacity(rgba) {
  const m = rgba.match(/rgba\([^,]+,[^,]+,[^,]+,([^)\s]+)\)/i);
  if (!m) return 0.1;
  return parseFloat(m[1]);
}
function setRgbaOpacity(rgba, alpha) {
  return rgba.replace(/rgba\(([^)]+),[^)]+\)/i, (_, rgb) => {
    return `rgba(${rgb}, ${alpha.toFixed(2)})`;
  });
}

function advanceTheme(dt) {
  themeT += dt / THEME_CYCLE_DURATION;
  if (themeT >= 1) {
    themeT -= 1;
    themeIndex = (themeIndex + 1) % themeOrder.length;
    const nextIndex = (themeIndex + 1) % themeOrder.length;
    themeFrom = THEMES[themeOrder[themeIndex]];
    themeTo = THEMES[themeOrder[nextIndex]];
    currentThemeName = themeOrder[themeIndex];
  }

  const fromFog = hexToRgb(themeFrom.fogColor);
  const toFog = hexToRgb(themeTo.fogColor);
  const fogRgb = lerpRgb(fromFog, toFog, themeT);
  const fogHex = rgbToHex(fogRgb);
  scene.fog.color.setHex(fogHex);
  fogPlanes.forEach(p => p.material.color.setHex(fogHex));

  const fromBorderFrom = hexToRgb(parseInt(themeFrom.borderFrom.slice(1), 16));
  const toBorderFrom = hexToRgb(parseInt(themeTo.borderFrom.slice(1), 16));
  const fromBorderTo = hexToRgb(parseInt(themeFrom.borderTo.slice(1), 16));
  const toBorderTo = hexToRgb(parseInt(themeTo.borderTo.slice(1), 16));
  const borderFromRgb = lerpRgb(fromBorderFrom, toBorderFrom, themeT);
  const borderToRgb = lerpRgb(fromBorderTo, toBorderTo, themeT);

  document.documentElement.style.setProperty(
    "--card-border-from",
    `rgb(${borderFromRgb.r},${borderFromRgb.g},${borderFromRgb.b})`
  );
  document.documentElement.style.setProperty(
    "--card-border-to",
    `rgb(${borderToRgb.r},${borderToRgb.g},${borderToRgb.b})`
  );

  const fromMistAAlpha = parseRgbaOpacity(themeFrom.mistA);
  const toMistAAlpha = parseRgbaOpacity(themeTo.mistA);
  const fromMistBAlpha = parseRgbaOpacity(themeFrom.mistB);
  const toMistBAlpha = parseRgbaOpacity(themeTo.mistB);
  const mistAAlpha = lerp(fromMistAAlpha, toMistAAlpha, themeT);
  const mistBAlpha = lerp(fromMistBAlpha, toMistBAlpha, themeT);

  document.documentElement.style.setProperty(
    "--mist-color-a",
    setRgbaOpacity(themeTo.mistA, mistAAlpha)
  );
  document.documentElement.style.setProperty(
    "--mist-color-b",
    setRgbaOpacity(themeTo.mistB, mistBAlpha)
  );

  const fromGlow = parseRgbTriple(themeFrom.glowRgb);
  const toGlow = parseRgbTriple(themeTo.glowRgb);
  const glowRgb = lerpRgb(fromGlow, toGlow, themeT);
  document.documentElement.style.setProperty(
    "--title-glow-rgb",
    rgbTripleString(glowRgb)
  );
}

/* =========================
   AUDIO SETUP
========================= */
let audioCtx, analyser, dataArray, bufferSource, gainNode;
let audioBuffer = null;
let started = false;

fetch("music.ogg")
  .then(r => r.arrayBuffer())
  .then(buf => {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx.decodeAudioData(buf);
  })
  .then(decoded => {
    audioBuffer = decoded;
  })
  .catch(console.error);

document.addEventListener("click", () => {
  if (started || !audioBuffer) return;
  started = true;

  if (audioCtx.state === "suspended") audioCtx.resume();

  bufferSource = audioCtx.createBufferSource();
  bufferSource.buffer = audioBuffer;

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  dataArray = new Uint8Array(analyser.frequencyBinCount);

  gainNode = audioCtx.createGain();
  gainNode.gain.value = 0.5;

  bufferSource.connect(analyser);
  analyser.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  bufferSource.loop = true;
  bufferSource.start(0);
});

/* =========================
   DOM REFERENCES
========================= */
const card = document.getElementById("card");
const mist = document.getElementById("mist");
const title = document.getElementById("title");
const discordLine = document.getElementById("discord");
const vizCanvas = document.getElementById("viz");
const vizCtx = vizCanvas.getContext("2d");

/* =========================
   CARD TILT
========================= */
let curX = 0, curY = 0, tgtX = 0, tgtY = 0;
const maxTilt = 12;
const tiltSmooth = 0.08;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

document.addEventListener("mousemove", e => {
  const r = card.getBoundingClientRect();
  const x = e.clientX - (r.left + r.width / 2);
  const y = e.clientY - (r.top + r.height / 2);
  tgtY = clamp(x / (r.width / 2), -1, 1) * maxTilt;
  tgtX = -clamp(y / (r.height / 2), -1, 1) * maxTilt;
});

function tiltLoop() {
  curX += (tgtX - curX) * tiltSmooth;
  curY += (tgtY - curY) * tiltSmooth;

  const baseTransform = `rotateX(${curX}deg) rotateY(${curY}deg)`;
  card.style.transform = baseTransform;

  mist.style.transform =
    `translateX(${curY * 1.5}px) translateY(${curX * 1.5}px) translateZ(20px)`;

  const aberr = Math.abs(curX) + Math.abs(curY);
  card.style.filter =
    `drop-shadow(${aberr * 0.4}px 0 rgba(255,0,0,0.18)) ` +
    `drop-shadow(${-aberr * 0.4}px 0 rgba(0,160,255,0.18))`;

  requestAnimationFrame(tiltLoop);
}
tiltLoop();

/* =========================
   TYPEWRITER
========================= */
const text = "herb";
let idx = 0;
let typingForward = true;

function typeEffect() {
  if (!title) return;
  if (typingForward) {
    title.textContent = text.slice(0, idx + 1) || "\u00A0";
    idx++;
    if (idx >= text.length) typingForward = false;
  } else {
    title.textContent = text.slice(0, idx - 1) || "\u00A0";
    idx--;
    if (idx <= 0) typingForward = true;
  }
  setTimeout(typeEffect, 350);
}
typeEffect();

/* =========================
   VISUALIZER SIZING
========================= */
function resizeViz() {
  const r = card.getBoundingClientRect();
  vizCanvas.width = r.width * (window.devicePixelRatio || 1) * 0.8;
  vizCanvas.height = 36 * (window.devicePixelRatio || 1);
}
resizeViz();
window.addEventListener("resize", resizeViz);

/* =========================
   MAIN ANIMATION LOOP
========================= */
function animate() {
  const now = performance.now();
  const dt = now - lastFrameTime;
  lastFrameTime = now;

  advanceTheme(dt);

  let bass = 0, mids = 0, highs = 0;
  if (analyser) {
    analyser.getByteFrequencyData(dataArray);
    const bassBins = dataArray.slice(0, 18);
    const midBins = dataArray.slice(18, 64);
    const highBins = dataArray.slice(64, 128);

    const avg = arr => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
    bass = avg(bassBins);
    mids = avg(midBins);
    highs = avg(highBins);
  }

  // Sensitive mapping
  let bassNorm = bass / 70;
  let midNorm = mids / 90;
  let highNorm = highs / 110;

  bassNorm = Math.pow(bassNorm + 0.05, 1.1);
  midNorm = Math.pow(midNorm + 0.03, 1.15);
  highNorm = Math.pow(highNorm + 0.02, 1.2);

  const bassClamped = Math.min(bassNorm, 2.5);
  const midClamped = Math.min(midNorm, 1.9);
  const highClamped = Math.min(highNorm, 1.7);

  const glowRgbStr = getComputedStyle(document.documentElement)
    .getPropertyValue("--title-glow-rgb")
    .trim() || "255,255,255";

  const [gr, gg, gb] = glowRgbStr.split(",").map(v => parseInt(v.trim(), 10));
  const glowSize = 24 + bassClamped * 60;
  const glowAlpha = 0.25 + bassClamped * 0.75;
  title.style.textShadow =
    `0 0 ${glowSize}px rgba(${gr},${gg},${gb},${glowAlpha})`;

  const scale = 1 + bassClamped * 0.12;
  const currentTransform = card.style.transform || "";
  const cleaned = currentTransform.replace(/scale\([^)]*\)/, "").trim();
  card.style.transform = `${cleaned} scale(${scale})`.trim();

  const borderGlow = 1 + midClamped * 5.5;
  card.style.boxShadow =
    `0 45px 90px rgba(0,0,0,0.95), ` +
    `0 0 ${18 + midClamped * 28}px rgba(255,255,255,0.22), ` +
    `inset 0 0 48px rgba(255,255,255,0.07)`;

  const theme = THEMES[currentThemeName];
  fogPlanes.forEach((p, i) => {
    p.rotation.z += 0.0008 * (i + 1);
    p.material.opacity =
      theme.fogPlaneBaseOpacity + bassClamped * 0.14 * (1 - i / fogPlanes.length);
    p.position.z = -i * 1.2 - bassClamped * 0.55;
  });

  const mistDriftX = bassClamped * 26;
  const mistScale = 1 + highClamped * 0.13;
  mist.style.transform += ` translateX(${mistDriftX}px) scale(${mistScale})`;

  if (discordLine) {
    const shakeX = (Math.random() - 0.5) * highClamped * 5;
    const shakeY = (Math.random() - 0.5) * highClamped * 5;
    discordLine.style.transform =
      `translateZ(35px) translate(${shakeX}px, ${shakeY}px)`;
    discordLine.style.opacity = 0.82 + highClamped * 0.18;
  }

  // Symmetric visualizer
  if (analyser && vizCtx) {
    const w = vizCanvas.width;
    const h = vizCanvas.height;
    vizCtx.clearRect(0, 0, w, h);

    const bufferLength = dataArray.length;
    const barCount = 40;
    const step = Math.floor(bufferLength / barCount);
    const barWidth = w / barCount;

    for (let i = 0; i < barCount; i++) {
      const v = dataArray[i * step] || 0;
      const mag = v / 255;
      const barHeight = mag * (h * 0.45);
      const x = i * barWidth;
      const yCenter = h / 2;

      const alpha = 0.15 + mag * 0.85;
      vizCtx.fillStyle = `rgba(${gr},${gg},${gb},${alpha})`;

      // Top half
      vizCtx.fillRect(x, yCenter - barHeight, barWidth * 0.7, barHeight);
      // Bottom half (mirror)
      vizCtx.fillRect(x, yCenter, barWidth * 0.7, barHeight);
    }
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
