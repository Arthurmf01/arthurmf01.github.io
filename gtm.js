/* AI for GTM: three small demos. No dependencies. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var LABELS = { num: "Predict a number", sort: "Sort into groups", gen: "Write something new" };
  function $(sel, root) { return (root || document).querySelector(sel); }
  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function svg(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }

  /* Idea 1: one deal, three kinds of answer. Illustrative data, not real deals. */
  var DEALS = [[1, 0], [2, 0], [2, 0], [3, 0], [4, 1], [4, 0], [5, 0], [6, 1], [7, 1], [7, 0], [8, 1], [9, 1], [10, 1], [11, 1], [12, 1]];
  function initModels() {
    var chart = $("[data-chart]"), slider = $("[data-meet]");
    if (!chart) return;
    var mode = "num";
    var notes = {
      num: "Regression draws the line that best fits past deals, then reads a number off it.",
      sort: "Classification draws a boundary instead. Each side of it gets a label.",
      gen: "A generative model predicts the next word, again and again. The bars show how likely it finds each candidate."
    };
    function x(m) { return 30 + (m - 1) * 24; }
    function draw() {
      var m = Number(slider.value), answer;
      $("[data-meet-out]").textContent = m;
      chart.textContent = "";
      if (mode === "gen") {
        var words = m < 5 ? [["follow-up", 46], ["deck", 31], ["quote", 15], ["contract", 8]] : m < 9 ? [["quote", 44], ["deck", 24], ["follow-up", 20], ["contract", 12]] : [["contract", 52], ["quote", 30], ["follow-up", 12], ["deck", 6]];
        var t = svg("text", { x: 10, y: 22, "class": "bar-label" });
        t.textContent = "“Thanks for today. I will send the …”";
        chart.appendChild(t);
        words.forEach(function (w, i) {
          var y = 44 + i * 36;
          chart.appendChild(svg("rect", { x: 90, y: y, width: w[1] * 3.6, height: 20, rx: 4, "class": i ? "bar" : "bar bar--top" }));
          var l = svg("text", { x: 10, y: y + 14, "class": "bar-label" }); l.textContent = w[0]; chart.appendChild(l);
          var p = svg("text", { x: 96 + w[1] * 3.6, y: y + 14 }); p.textContent = w[1] + "%"; chart.appendChild(p);
        });
        answer = "Next word: “" + words[0][0] + "”.";
      } else {
        chart.appendChild(svg("line", { x1: 24, y1: 170, x2: 310, y2: 170, "class": "axis" }));
        var lab = svg("text", { x: 24, y: 190 }); lab.textContent = "Meetings held →"; chart.appendChild(lab);
        DEALS.forEach(function (d, i) {
          var cy = mode === "num" ? 160 - d[0] * 10 - ((i * 37) % 23 - 11) : 140 - d[1] * 80 - ((i * 37) % 23 - 11);
          chart.appendChild(svg("circle", { cx: x(d[0]) + ((i * 13) % 9 - 4), cy: cy, r: 4, "class": d[1] && mode === "sort" ? "dot dot--won" : "dot" }));
        });
        if (mode === "num") {
          chart.appendChild(svg("line", { x1: x(1), y1: 150, x2: x(12), y2: 40, "class": "line" }));
          chart.appendChild(svg("circle", { cx: x(m), cy: 160 - m * 10, r: 6, "class": "you" }));
          answer = "Predicted deal size: €" + (20 + m * 15) + "k.";
        } else {
          chart.appendChild(svg("line", { x1: x(5.5), y1: 20, x2: x(5.5), y2: 170, "class": "cut" }));
          chart.appendChild(svg("circle", { cx: x(m), cy: m > 5 ? 60 : 140, r: 6, "class": "you" }));
          answer = "Label: " + (m > 5 ? "likely to close." : "unlikely to close.");
        }
      }
      $("[data-model-answer]").textContent = answer;
      $("[data-model-note]").textContent = notes[mode];
    }
    all("[data-models] button").forEach(function (b) {
      b.addEventListener("click", function () {
        all("[data-models] button").forEach(function (o) { o.setAttribute("aria-selected", String(o === b)); });
        mode = b.dataset.model; draw();
      });
    });
    slider.addEventListener("input", draw);
    draw();
  }

  /* Idea 2: draw the network and count its dials (weights plus one bias per neuron). */
  function initNet() {
    var net = $("[data-net]"), layersIn = $("[data-layers]"), widthIn = $("[data-width]");
    if (!net) return;
    function draw() {
      var layers = Number(layersIn.value), width = Number(widthIn.value);
      var sizes = [3]; for (var i = 0; i < layers; i++) sizes.push(width); sizes.push(1);
      var params = 0, pts = [];
      net.textContent = "";
      sizes.forEach(function (n, c) {
        var col = [];
        for (var r = 0; r < n; r++) col.push([20 + c * (280 / (sizes.length - 1)), 110 + (r - (n - 1) / 2) * (200 / Math.max(n, 4))]);
        pts.push(col);
        if (c) params += sizes[c - 1] * n + n;
      });
      pts.forEach(function (col, c) {
        if (!c) return;
        pts[c - 1].forEach(function (a) { col.forEach(function (b) { net.appendChild(svg("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], "class": "edge" })); }); });
      });
      pts.forEach(function (col) { col.forEach(function (p) { net.appendChild(svg("circle", { cx: p[0], cy: p[1], r: 6, "class": "node" })); }); });
      $("[data-layers-out]").textContent = layers; $("[data-width-out]").textContent = width;
      $("[data-params]").textContent = params;
      $("[data-params-scale]").textContent = "GPT-3, released in 2020, had about 175 billion.";
    }
    layersIn.addEventListener("input", draw); widthIn.addEventListener("input", draw);
    draw();
  }

  /* Idea 3: a deliberately simple cutter. Words, punctuation, and long words in pieces. */
  function initTokens() {
    var input = $("[data-text]"), out = $("[data-tokens]");
    if (!input) return;
    function id(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 50000; return h; }
    function draw() {
      var pieces = [];
      (input.value.match(/[A-Za-zÀ-ſ']+|\d+|[^\sA-Za-zÀ-ſ\d]/g) || []).forEach(function (w) {
        if (w.length > 6 && /[A-Za-z]/.test(w)) { pieces.push(w.slice(0, 4)); pieces.push(w.slice(4)); } else pieces.push(w);
      });
      out.textContent = "";
      pieces.forEach(function (p) {
        var li = document.createElement("li"), s = document.createElement("small");
        li.textContent = p; s.textContent = id(p); li.appendChild(s); out.appendChild(li);
      });
      $("[data-token-count]").textContent = pieces.length;
    }
    input.addEventListener("input", draw);
    draw();
  }

  document.addEventListener("DOMContentLoaded", function () { initModels(); initNet(); initTokens(); });
})();
