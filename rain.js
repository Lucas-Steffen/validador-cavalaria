function createRainDrop() {
  const rainDrop = document.createElement("img");
  rainDrop.src = "assets/cavalaria.png";
  rainDrop.style.position = "absolute";
  rainDrop.style.width = "36px";
  rainDrop.style.opacity = "0.5";

  rainDrop.style.left = Math.random() * window.innerWidth + "px";
  rainDrop.style.top = "-50px";

  const rainContainer = document.querySelector(".rain");
  rainContainer.appendChild(rainDrop);

  const fallDuration = Math.random() * 4 + 4;
  rainDrop.animate(
    [
      { transform: "translateY(0)" },
      { transform: "translateY(" + (window.innerHeight + 50) + "px)" },
    ],
    {
      duration: fallDuration * 1000,
      easing: "ease-in-out",
      fill: "forwards",
    }
  );

  setTimeout(() => {
    rainDrop.remove();
  }, fallDuration * 1000);
}

setInterval(() => {
  createRainDrop();
}, 500);
