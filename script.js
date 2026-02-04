const card = document.getElementById("card");

let currentX = 0;
let currentY = 0;
let targetX = 0;
let targetY = 0;

const maxTilt = 12;
const smoothness = 0.08;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

document.addEventListener("mousemove", (e) => {
  const rect = card.getBoundingClientRect();
  const x = e.clientX - (rect.left + rect.width / 2);
  const y = e.clientY - (rect.top + rect.height / 2);

  const normX = clamp(x / (rect.width / 2), -1, 1);
  const normY = clamp(y / (rect.height / 2), -1, 1);

  targetY = normX * maxTilt;
  targetX = -normY * maxTilt;
});

function animate() {
  currentX += (targetX - currentX) * smoothness;
  currentY += (targetY - currentY) * smoothness;

  card.style.transform = `
    rotateX(${currentX}deg)
    rotateY(${currentY}deg)
  `;

  requestAnimationFrame(animate);
}

animate();

document.addEventListener("mouseleave", () => {
  targetX = 0;
  targetY = 0;
});
