/* =========================
   THREE.JS VOLUMETRIC FOG
========================= */
const canvas = document.getElementById("bg");
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x02030a, 0.08);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.z = 6;

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* Fog planes */
const fogGeo = new THREE.PlaneGeometry(20, 20);
const fogMat = new THREE.MeshBasicMaterial({
  color: 0x0c1020,
  transparent: true,
  opacity: 0.08
});
const fogPlanes = [];
for (let i = 0; i < 12; i++) {
  const plane = new THREE.Mesh(fogGeo, fogMat.clone());
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
    cardBorderFrom: "#0ff",
    cardBorderTo: "#f0f",
    mistColorA: "rgba(0, 255, 255, 0.14)",
    mistColorB: "rgba(255, 0, 255, 0.09)",
    titleGlowColor: "255,255,255"
  },
  ember: {
    fogColor: 0x1a0604,
    fogPlaneBaseOpacity: 0.045,
    cardBorderFrom: "#ffb347",
    cardBorderTo: "#ff0844",
    mistColorA: "rgba(255, 120, 60, 0.16)",
    mistColorB: "rgba(255, 40, 40, 0.08)",
    titleGlowColor: "255,200,150"
  },
  abyss: {
    fogColor: 0x020814,
    fogPlaneBaseOpacity: 0.06,
    cardBorderFrom: "#4facfe",
    cardBorderTo: "#00f2fe",
    mistColorA: "rgba(80, 160, 255, 0.16)",
    mistColorB: "rgba(0, 220, 255, 0.09)",
    titleGlowColor: "180,220,255"
  }
};

let currentTheme = "cyber";
let themeLerpProgress = 1;
let themeFrom = THEMES.cyber;
let themeTo = THEMES.cyber;
let themeTransitionDuration = 1500;
let lastFrameTime = performance.now();

function lerpColorChannel(a, b, t) {
  return Math.round(a + (b - a) * t);
}
function hexToRgb(hex) {
  const h = hex.toString(16).padStart(6, "0");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return { r, g, b };
}
function cssColorToRgbTriple(str) {
  const parts = str.split(",").map(s => parseInt(s.trim(), 10));
  return { r: parts[0] || 255, g: parts[1] || 255, b: parts[2] || 255 };
}
function rgbTripleToString({ r, g, b }) {
  return `${r},${g},${b}`;
}

// Smooth theme change
function applyTheme(targetName, duration = 1500) {
  const next = THEMES[targetName] || THEMES.cyber;
  currentTheme = targetName;

  themeFrom = { ...themeTo };
  themeTo = next;
  themeLerpProgress = 0;
  themeTransitionDuration = duration;

  scene.fog.color.setHex(next.fogColor);
}
applyTheme("cyber", 1);

/* =========================
   AUDIO SETUP
========================= */
let audioCtx, analyser, dataArray, bufferSource, gainNode;
let audioBuffer, started = false;

fetch("music.ogg")
  .then(res => res.arrayBuffer())
  .then(arrayBuffer => {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx.decodeAudioData(arrayBuffer);
  })
  .then(decoded => {
    audioBuffer = decoded;
    console.log("Audio loaded and decoded");
  })
  .catch(err => console.error("Audio load failed:", err));

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
   CARD TILT + PARALLAX
========================= */
const card = document.getElementById("card");
const mist = document.getElementById("mist");
const title = document.getElementById("title");
const discordLine = document.getElementById("discord");

let curX = 0, curY = 0, tgtX = 0, tgtY = 0;
const maxTilt = 12, smooth = 0.08;

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
  curX += (tgtX - curX) * smooth;
  curY += (tgtY - curY) * smooth;

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
   TYPEWRITER EFFECT
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
   VISUALIZER CANVAS (BAR WAVE)
========================= */
const vizCanvas = document.getElementById("viz");
const vizCtx = vizCanvas.getContext("2d");

// Size viz to card width, small height
function resizeViz() {
  const rect = card.getBoundingClientRect();
  vizCanvas.width = rect.width * window.devicePixelRatio;
  vizCanvas.height = 60 * window.devicePixelRatio;
}
resizeViz();
window.addEventListener("resize", resizeViz);

/* =========================
   ANIMATION LOOP
========================= */
let lastThemeSwitch = 0;

function animate() {
  const now = performance.now();
  const dt = now - lastFrameTime;
  lastFrameTime = now;

  if (themeLerpProgress < 1) {
    themeLerpProgress = Math.min(
      1,
      themeLerpProgress + dt / themeTransitionDuration
    );
  }

  let bass = 0;
  let mids = 0;
  let highs = 0;

  if (analyser) {
    analyser.getByteFrequencyData(dataArray);

    const bassBins = dataArray.slice(0, 18);
    const midBins = dataArray.slice(18, 64);
    const highBins = dataArray.slice(64, 128);

    bass = bassBins.reduce((a, b) => a + b, 0) / bassBins.length || 0;
    mids = midBins.reduce((a, b) => a + b, 0) / midBins.length || 0;
    highs = highBins.reduce((a, b) => a + b, 0) / highBins.length || 0;
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

  /* THEME LERP */
  const fromFog = hexToRgb(themeFrom.fogColor);
  const toFog = hexToRgb(themeTo.fogColor);
  const fogRgb = {
    r: lerpColorChannel(fromFog.r, toFog.r, themeLerpProgress),
    g: lerpColorChannel(fromFog.g, toFog.g, themeLerpProgress),
    b: lerpColorChannel(fromFog.b, toFog.b, themeLerpProgress)
  };
  const fogHex = (fogRgb.r << 16) | (fogRgb.g << 8) | fogRgb.b;
  scene.fog.color.setHex(fogHex);
  fogPlanes.forEach(p => p.material.color.setHex(fogHex));

  document.documentElement.style.setProperty(
    "--card-border-from",
    themeLerpProgress < 0.5 ? themeFrom.cardBorderFrom : themeTo.cardBorderFrom
  );
  document.documentElement.style.setProperty(
    "--card-border-to",
    themeLerpProgress < 0.5 ? themeFrom.cardBorderTo : themeTo.cardBorderTo
  );

  const mistATo = themeTo.mistColorA;
  const mistBTo = themeTo.mistColorB;
  const mistIntensity = 1 + themeLerpProgress * 0.3;

  document.documentElement.style.setProperty(
    "--mist-color-a",
    mistATo.replace(/0\.[0-9]+/, m =>
      (parseFloat(m) * mistIntensity).toFixed(2)
    )
  );
  document.documentElement.style.setProperty(
    "--mist-color-b",
    mistBTo.replace(/0\.[0-9]+/, m =>
      (parseFloat(m) * mistIntensity).toFixed(2)
    )
  );

  const fromGlowRgb = cssColorToRgbTriple(themeFrom.titleGlowColor);
  const toGlowRgb = cssColorToRgbTriple(themeTo.titleGlowColor);
  const glowRgb = {
    r: lerpColorChannel(fromGlowRgb.r, toGlowRgb.r, themeLerpProgress),
    g: lerpColorChannel(fromGlowRgb.g, toGlowRgb.g, themeLerpProgress),
    b: lerpColorChannel(fromGlowRgb.b, toGlowRgb.b, themeLerpProgress)
  };
  document.documentElement.style.setProperty(
    "--title-glow-rgb",
    rgbTripleToString(glowRgb)
  );

  /* AUDIO-REACTIVE CARD */
  const glowSize = 24 + bassClamped * 60;
  const glowAlpha = 0.25 + bassClamped * 0.75;
  const themeRGB = getComputedStyle(document.documentElement)
    .getPropertyValue("--title-glow-rgb")
    .trim() || "255,255,255";

  title.style.textShadow =
    `0 0 ${glowSize}px rgba(${themeRGB}, ${glowAlpha})`;

  const scale = 1 + bassClamped * 0.12; // ~30% max
  const currentCardTransform = card.style.transform || "";
  const cleanedTransform =
    currentCardTransform.replace(/scale\([^)]*\)/, "").trim();
  card.style.transform = `${cleanedTransform} scale(${scale})`.trim();

  const borderGlow = 1 + midClamped * 5.5;
  card.style.boxShadow =
    `0 45px 90px rgba(0,0,0,0.95), ` +
    `0 0 ${18 + midClamped * 28}px rgba(255,255,255,0.22), ` +
    `inset 0 0 48px rgba(255,255,255,0.07)`;

  const theme = THEMES[currentTheme];
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

  if (bassClamped > 1.4 && midClamped > 1.0 && now - lastThemeSwitch > 15000) {
    const order = ["cyber", "ember", "abyss"];
    const next = order[(order.indexOf(currentTheme) + 1) % order.length];
    applyTheme(next, 1800);
    lastThemeSwitch = now;
  }

  /* VISUALIZER DRAW (BAR WAVE AT BOTTOM) */
  if (analyser && vizCtx) {
    const width = vizCanvas.width;
    const height = vizCanvas.height;
    vizCtx.clearRect(0, 0, width, height);

    const bufferLength = dataArray.length;
    const barCount = 48; // fewer bars for a clean look
    const step = Math.floor(bufferLength / barCount);
    const barWidth = width / barCount;

    const baseColor = glowRgb; // align with title glow
    for (let i = 0; i < barCount; i++) {
      const v = dataArray[i * step] || 0;
      const magnitude = v / 255;

      const barHeight = magnitude * height * 0.9;

      const alpha = 0.15 + magnitude * 0.85;
      const r = baseColor.r;
      const g = baseColor.g;
      const b = baseColor.b;

      vizCtx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      const x = i * barWidth;
      const y = height - barHeight;

      vizCtx.fillRect(x, y, barWidth * 0.8, barHeight);
    }
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
