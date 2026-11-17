/* ISP article page: scroll-driven figures.
 * - Each step (.isp-step) carries its own figure inline (phone and no-JS read it in place).
 * - On load, figures are copied into the sticky stage; CSS shows the stage copies on desktop only.
 * - The step nearest the middle of the viewport becomes active: its stage figure fades in,
 *   and in Part 2 the matching recommendation lights up on the map.
 * - Inline figures animate once when they scroll into view.
 */
(function () {
  "use strict";

  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll(".isp-fig").forEach(function (f) { f.classList.add("is-active"); });
    return;
  }

  document.querySelectorAll("[data-isp-scrolly]").forEach(function (scrolly) {
    var steps = Array.prototype.slice.call(scrolly.querySelectorAll(".isp-step"));
    var stage = scrolly.querySelector("[data-isp-stage]");
    var mapItems = Array.prototype.slice.call(scrolly.querySelectorAll(".isp-map li[data-rec]"));
    var staged = {};

    if (stage) {
      var figs = document.createElement("div");
      figs.className = "isp-stage__figs";
      steps.forEach(function (step) {
        var fig = step.querySelector(":scope > .isp-fig");
        if (!fig) return;
        var copy = fig.cloneNode(true);
        copy.setAttribute("data-for", step.dataset.step);
        copy.setAttribute("aria-hidden", "true");
        figs.appendChild(copy);
        staged[step.dataset.step] = copy;
      });
      stage.appendChild(figs);
      scrolly.classList.add("is-staged");
    }

    var current = null;
    function activate(step) {
      if (step === current) return;
      current = step;
      var id = step.dataset.step;
      var rec = parseInt(step.dataset.rec || "0", 10);
      steps.forEach(function (s) { s.classList.toggle("is-active", s === step); });
      Object.keys(staged).forEach(function (k) {
        var on = k === id;
        staged[k].classList.toggle("is-active", on);
        if (on) staged[k].removeAttribute("aria-hidden"); else staged[k].setAttribute("aria-hidden", "true");
      });
      mapItems.forEach(function (li) {
        var n = parseInt(li.dataset.rec, 10);
        li.classList.toggle("is-active", n === rec);
        li.classList.toggle("is-done", rec > 0 && n < rec);
      });
    }

    var stepObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) activate(e.target); });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    steps.forEach(function (s) { stepObserver.observe(s); });
    if (steps[0]) activate(steps[0]);

    // Inline figures (phone): animate once on entry.
    var figObserver = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-active"); obs.unobserve(e.target); }
      });
    }, { threshold: 0.3 });
    steps.forEach(function (s) {
      var f = s.querySelector(":scope > .isp-fig");
      if (f) figObserver.observe(f);
    });
  });
})();
