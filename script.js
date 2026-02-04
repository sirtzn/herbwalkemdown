const card = document.getElementById("card");

document.addEventListener("mousemove", (e) => {
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left - rect.width / 2;
  const y = e.clientY - rect.top - rect.height / 2;

  const rotateX = (-y / rect.height) * 15;
  const rotateY = (x / rect.width) * 15;

  card.style.transform = `
    rotateX(${rotateX}deg)
    rotateY(${rotateY}deg)
  `;
});

document.addEventListener("mouseleave", () => {
  card.style.transform = "rotateX(0deg) rotateY(0deg)";
});
