// Hero photos: crossfade every few seconds. Pauses on hover, when the tab is hidden,
// or for good with the Pause button. No rotation when the visitor prefers reduced motion.
(function () {
  var card = document.querySelector("[data-hero-show]");
  if (!card) return;
  var slides = card.querySelectorAll(".hero-card__slide");
  var pauseBtn = card.querySelector("[data-hero-pause]");
  if (slides.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var HOLD = 3000, current = 0, hovering = false, stopped = false;

  function next() {
    if (stopped || hovering || document.hidden) return;
    slides[current].classList.remove("is-on");
    current = (current + 1) % slides.length;
    slides[current].classList.add("is-on");
  }

  window.addEventListener("load", function () {
    slides.forEach(function (s) { if (s.dataset.src) s.src = s.dataset.src; });
    pauseBtn.hidden = false;
    var timer = setInterval(next, HOLD);
    pauseBtn.addEventListener("click", function () {
      stopped = !stopped;
      pauseBtn.textContent = stopped ? "Play" : "Pause";
      pauseBtn.setAttribute("aria-label", stopped ? "Play the photos" : "Pause the photos");
    });
  });
  card.addEventListener("mouseenter", function () { hovering = true; });
  card.addEventListener("mouseleave", function () { hovering = false; });
})();
