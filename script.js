/* =========================
   THREE.JS VOLUMETRIC FOG
========================= */
const canvas = document.getElementById("bg");
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050505, 0.08);

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

// Fog planes
const fogGeo = new THREE.PlaneGeometry(20, 20);
const fogMat = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.08 });
const fogPlanes = [];
for (let i = 0; i < 12; i++) {
  const plane = new THREE.Mesh(fogGeo, fogMat);
  plane.position.z = -i * 1.2;
  plane.rotation.z = Math.random();
  scene.add(plane);
  fogPlanes.push(plane);
}

/* =========================
   AUDIO SETUP
========================= */
let audioCtx, analyser, dataArray, bufferSource;
let audioBuffer, started = false;

fetch('music.ogg')
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

  if (audioCtx.state === 'suspended') audioCtx.resume();

  bufferSource = audioCtx.createBufferSource();
  bufferSource.buffer = audioBuffer;

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  dataArray = new Uint8Array(analyser.frequencyBinCount);

  bufferSource.connect(analyser);
  analyser.connect(audioCtx.destination);

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

let curX = 0, curY = 0, tgtX = 0, tgtY = 0;
const maxTilt = 12, smooth = 0.08;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

document.addEventListener("mousemove", e => {
  const r = card.getBoundingClientRect();
  const x = e.clientX - (r.left + r.width / 2);
  const y = e.clientY - (r.top + r.height / 2);
  tgtY = clamp(x / (r.width/2), -1,1) * maxTilt;
  tgtX = -clamp(y / (r.height/2), -1,1) * maxTilt;
});

function tiltLoop() {
  curX += (tgtX - curX) * smooth;
  curY += (tgtY - curY) * smooth;
  card.style.transform = `rotateX(${curX}deg) rotateY(${curY}deg)`;
  mist.style.transform = `translateX(${curY*1.5}px) translateY(${curX*1.5}px) translateZ(20px)`;

  const aberr = Math.abs(curX)+Math.abs(curY);
  card.style.filter = `drop-shadow(${aberr*0.4}px 0 rgba(255,0,0,0.15)) drop-shadow(${-aberr*0.4}px 0 rgba(0,150,255,0.15))`;

  requestAnimationFrame(tiltLoop);
}
tiltLoop();

/* =========================
   TYPEWRITER EFFECT ON TITLE
========================= */
const text = "herb";
let idx = 0;
let typingForward = true;

function typeEffect() {
  if (!title) return;
  if (typingForward) {
    title.textContent = text.slice(0, idx+1);
    idx++;
    if (idx >= text.length) typingForward = false;
  } else {
    title.textContent = text.slice(0, idx-1);
    idx--;
    if (idx <= 0) typingForward = true;
  }
  setTimeout(typeEffect, 200);
}
typeEffect();

/* =========================
   ANIMATION LOOP (AUDIO-REACTIVE)
========================= */
function animate() {
  let bass = 0;
  if (analyser) {
    analyser.getByteFrequencyData(dataArray);
    bass = dataArray.slice(0,12).reduce((a,b)=>a+b,0)/12;
  }
  const pulse = bass/140;

  // Audio reactive title glow
  title.style.textShadow = `0 0 ${20+pulse*40}px rgba(255,255,255,${0.15+pulse*0.5})`;

  // Audio reactive fog opacity
  fogPlanes.forEach((p,i)=>{
    p.rotation.z += 0.0005*(i+1);
    p.material.opacity = 0.05 + pulse*0.05; // subtle pulse
  });

  renderer.render(scene,camera);
  requestAnimationFrame(animate);
}
animate();
