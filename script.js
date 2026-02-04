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

// Fog planes (volumetric-ish layers)
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

function applyTheme(name) {
  const t = THEMES[name] || THEMES.cyber;
  currentTheme = name;

  // Scene fog color
  scene.fog.color.setHex(t.fogColor);
  fogPlanes.forEach(p => {
    p.material.color.setHex(t.fogColor);
    p.material.opacity = t.fogPlaneBaseOpacity;
  });

  // Card border + mist colors via CSS variables
  document.documentElement.style.setProperty("--card-border-from", t.cardBorderFrom);
  document.documentElement.style.setProperty("--card-border-to", t.cardBorderTo);
  document.documentElement.style.setProperty("--mist-color-a", t.mistColorA);
  document.documentElement.style.setProperty("--mist-color-b", t.mistColorB);
  document.documentElement.style.setProperty("--title-glow-rgb", t.titleGlowColor);
}

// Set initial theme
applyTheme("cyber");

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

  // Volume control
  gainNode = audioCtx.createGain();
  gainNode.gain.value = 0.5; // slightly quieter than default

  bufferSource.connect(analyser);
  analyser.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  bufferSource.loop = true;
  bufferSource.start(0);

  console.log("Audio playing via Web Audio buffer!");
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

  mist.style.transform = `translateX(${curY * 1.5}px) translateY(${curX * 1.5}px) translateZ(20px)`;

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
    title.textContent = text.slice(0, idx + 1);
    idx++;
    if (idx >= text.length) typingForward = false;
  } else {
    title.textContent = text.slice(0, idx - 1);
    idx--;
    if (idx <= 0) typingForward = true;
  }
  setTimeout(typeEffect, 350);
}
typeEffect();

/* =========================
   ANIMATION LOOP (AUDIO-REACTIVE)
========================= */
let lastThemeSwitch = 0;

function animate() {
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

  const pulse = bass / 80;
  const midPulse = mids / 120;
  const highPulse = highs / 140;

  const bassClamped = Math.min(pulse, 2);
  const midClamped = Math.min(midPulse, 1.7);
  const highClamped = Math.min(highPulse, 1.5);

  // Title glow + card scale (bass)
  const glowSize = 20 + bassClamped * 70;
  const glowAlpha = 0.15 + bassClamped * 0.7;

  const themeRGB = getComputedStyle(document.documentElement)
    .getPropertyValue("--title-glow-rgb")
    .trim() || "255,255,255";

  title.style.textShadow =
    `0 0 ${glowSize}px rgba(${themeRGB}, ${glowAlpha})`;
  const scale = 1 + bassClamped * 0.06;
  const currentCardTransform = card.style.transform || "";
  const cleanedTransform = currentCardTransform.replace(/scale\([^)]*\)/, "").trim();
  card.style.transform = `${cleanedTransform} scale(${scale})`.trim();

  // Card border glow (mids)
  const borderGlow = 1 + midClamped * 4;
  card.style.boxShadow =
    `0 0 ${15 + midClamped * 25}px rgba(0,0,0,0.9), ` +
    `0 0 ${borderGlow * 8}px rgba(255,255,255,0.16), ` +
    `inset 0 0 40px rgba(255,255,255,0.04)`;

  // Fog planes: opacity + depth (bass)
  const theme = THEMES[currentTheme];
  fogPlanes.forEach((p, i) => {
    p.rotation.z += 0.0006 * (i + 1);
    p.material.opacity =
      theme.fogPlaneBaseOpacity + bassClamped * 0.12 * (1 - i / fogPlanes.length);
    p.position.z = -i * 1.2 - bassClamped * 0.4;
  });

  // Mist: drift (bass) + subtle flicker (highs)
  const mistDriftX = bassClamped * 22;
  const mistScale = 1 + highClamped * 0.1;
  mist.style.transform += ` translateX(${mistDriftX}px) scale(${mistScale})`;

  // Discord line: subtle shake on highs
  if (discordLine) {
    const shakeX = (Math.random() - 0.5) * highClamped * 3;
    const shakeY = (Math.random() - 0.5) * highClamped * 3;
    discordLine.style.transform = `translateZ(35px) translate(${shakeX}px, ${shakeY}px)`;
    discordLine.style.opacity = 0.85 + highClamped * 0.15;
  }

  // Very slow theme switching on sustained energy (example / optional)
  const now = performance.now();
  if (bassClamped > 1.4 && midClamped > 1.0 && now - lastThemeSwitch > 15000) {
    const order = ["cyber", "ember", "abyss"];
    const next = order[(order.indexOf(currentTheme) + 1) % order.length];
    applyTheme(next);
    lastThemeSwitch = now;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
