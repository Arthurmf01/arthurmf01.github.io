/* ==========================================================================
   Personal OS diagram (home page)
   Draws the wires between the nodes, sends data packets along them, and
   lights up one input's route on hover, focus or tap.
   Wide screens only for wires and packets; the stacked phone layout uses
   CSS connectors. Reduced motion: wires and highlights, no packets.
   ========================================================================== */

(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";
  var WIDE = window.matchMedia("(min-width: 900px)");
  var CALM = window.matchMedia("(prefers-reduced-motion: reduce)");
  var SPEED = 0.32; // px per ms
  var MAX_PACKETS = 7;

  function el(name, attrs) {
    var node = document.createElementNS(SVG_NS, name);
    Object.keys(attrs || {}).forEach(function (key) {
      node.setAttribute(key, attrs[key]);
    });
    return node;
  }

  function box(node, stage) {
    var r = node.getBoundingClientRect();
    var s = stage.getBoundingClientRect();
    return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
  }

  function initPos(figure) {
    var stage = figure.querySelector("[data-pos-stage]");
    var wires = figure.querySelector("[data-pos-wires]");
    var router = figure.querySelector("[data-pos-router]");
    var hub = figure.querySelector("[data-pos-hub]");
    var inputs = Array.prototype.slice.call(figure.querySelectorAll(".pos__col--in [data-pos-node]"));
    var outputs = Array.prototype.slice.call(figure.querySelectorAll(".pos__col--out [data-pos-node]"));
    var nodes = inputs.concat(outputs);

    var segments = {}; // id -> SVGPathElement (hidden route segments)
    var packets = [];
    var focusId = null;
    var pinnedId = null;
    var visible = false;
    var lastSpawn = 0;
    var frame = null;

    function feedsOf(input) {
      return (input.getAttribute("data-feeds") || "").split(/\s+/).filter(Boolean);
    }

    function routesFor(id) {
      // Every [input, output] pair touching the node with this id.
      var pairs = [];
      inputs.forEach(function (input) {
        var inId = input.getAttribute("data-pos-node");
        feedsOf(input).forEach(function (outId) {
          if (!id || id === inId || id === outId) pairs.push([inId, outId]);
        });
      });
      return pairs;
    }

    function addPath(group, key, d, cls) {
      var path = el("path", { d: d, class: cls });
      if (key) path.setAttribute("data-wire", key);
      group.appendChild(path);
      return path;
    }

    function draw() {
      while (wires.firstChild) wires.removeChild(wires.firstChild);
      packets = [];
      segments = {};
      if (!WIDE.matches) return;

      var w = stage.clientWidth;
      var h = stage.clientHeight;
      wires.setAttribute("viewBox", "0 0 " + w + " " + h);

      var base = el("g", { class: "pos__wire-base" });
      var hidden = el("g", { class: "pos__wire-route" });
      var dots = el("g", { class: "pos__packets" });
      wires.appendChild(base);
      wires.appendChild(hidden);
      wires.appendChild(dots);

      var rb = box(router, stage);
      var hb = box(hub, stage);
      var exitX = rb.x + rb.w;
      var exitY = rb.y + rb.h / 2;
      var hubR = hb.w / 2;
      var hubCx = hb.x + hubR;
      var hubCy = hb.y + hb.h / 2;

      inputs.forEach(function (input) {
        var id = input.getAttribute("data-pos-node");
        var b = box(input, stage);
        var y = b.y + b.h / 2;
        var d = "M" + (b.x + b.w) + " " + y + "H" + rb.x;
        addPath(base, "in-" + id, d, "pos__wire");
        segments["in-" + id] = addPath(hidden, null, d, "");
        segments["funnel-" + id] = addPath(hidden, null, "M" + rb.x + " " + y + "L" + exitX + " " + exitY, "");
      });

      var trunk = "M" + exitX + " " + exitY + "H" + (hubCx - hubR);
      addPath(base, "trunk", trunk, "pos__wire pos__wire--trunk");
      var head = hubCx - hubR;
      addPath(base, null, "M" + (head - 9) + " " + (exitY - 6) + "L" + head + " " + exitY + "L" + (head - 9) + " " + (exitY + 6), "pos__wire pos__wire--trunk pos__wire--head");
      segments.trunk = addPath(hidden, null, trunk, "");
      segments.core = addPath(hidden, null, "M" + (hubCx - hubR) + " " + hubCy + "H" + (hubCx + hubR), "");

      outputs.forEach(function (output) {
        var id = output.getAttribute("data-pos-node");
        var b = box(output, stage);
        var x0 = hubCx + hubR;
        var x1 = b.x - 8;
        var y1 = b.y + b.h / 2;
        var mid = x0 + (x1 - x0) * 0.45;
        var d = "M" + x0 + " " + hubCy + "C" + mid + " " + hubCy + " " + mid + " " + y1 + " " + x1 + " " + y1;
        addPath(base, "out-" + id, d, "pos__wire");
        addPath(base, "head-" + id, "M" + (x1 - 1) + " " + (y1 - 5) + "L" + (x1 + 7) + " " + y1 + "L" + (x1 - 1) + " " + (y1 + 5) + "Z", "pos__wire-tip");
        segments["out-" + id] = addPath(hidden, null, d, "");
      });

      wires.dots = dots;
      setFocus(focusId);
    }

    function setFocus(id) {
      focusId = id;
      var lit = {};
      if (id) {
        lit[id] = true;
        routesFor(id).forEach(function (pair) {
          lit[pair[0]] = true;
          lit[pair[1]] = true;
        });
      }
      stage.classList.toggle("is-focused", !!id);
      nodes.forEach(function (node) {
        var nodeId = node.getAttribute("data-pos-node");
        node.classList.toggle("is-lit", !!lit[nodeId]);
        node.setAttribute("aria-pressed", pinnedId === nodeId ? "true" : "false");
      });
      Array.prototype.forEach.call(wires.querySelectorAll("[data-wire]"), function (wire) {
        var key = wire.getAttribute("data-wire");
        var on = key === "trunk" ? !!id : !!lit[key.replace(/^(in|out|head)-/, "")];
        wire.classList.toggle("is-lit", on);
      });
      router.classList.toggle("is-lit", !!id);
      hub.classList.toggle("is-lit", !!id);
    }

    function spawn(pair) {
      if (!wires.dots) return;
      var route = [
        segments["in-" + pair[0]],
        segments["funnel-" + pair[0]],
        segments.trunk,
        segments.core,
        segments["out-" + pair[1]]
      ];
      if (route.some(function (seg) { return !seg; })) return;
      var lengths = route.map(function (seg) { return seg.getTotalLength(); });
      var dot = el("circle", { r: 4, class: "pos__packet" });
      wires.dots.appendChild(dot);
      packets.push({ dot: dot, route: route, lengths: lengths, total: lengths.reduce(function (a, b) { return a + b; }, 0), t: 0 });
    }

    function tick(now, prev) {
      var dt = Math.min(now - prev, 50);
      var gap = focusId ? 260 : 620;
      if (now - lastSpawn > gap && packets.length < MAX_PACKETS) {
        var pairs = routesFor(focusId);
        spawn(pairs[Math.floor(Math.random() * pairs.length)]);
        lastSpawn = now;
      }
      packets = packets.filter(function (p) {
        p.t += dt * SPEED;
        if (p.t >= p.total) {
          p.dot.remove();
          return false;
        }
        var left = p.t;
        var i = 0;
        while (left > p.lengths[i]) {
          left -= p.lengths[i];
          i += 1;
        }
        var pt = p.route[i].getPointAtLength(left);
        p.dot.setAttribute("cx", pt.x);
        p.dot.setAttribute("cy", pt.y);
        // Fade in on the first wire, out on the last.
        var fade = Math.min(1, p.t / 40, (p.total - p.t) / 40);
        p.dot.setAttribute("opacity", fade.toFixed(2));
        return true;
      });
      frame = window.requestAnimationFrame(function (next) { tick(next, now); });
    }

    function run() {
      var should = visible && WIDE.matches && !CALM.matches && !document.hidden;
      if (should && !frame) {
        frame = window.requestAnimationFrame(function (now) { tick(now, now); });
      } else if (!should && frame) {
        window.cancelAnimationFrame(frame);
        frame = null;
      }
    }

    nodes.forEach(function (node) {
      var id = node.getAttribute("data-pos-node");
      node.addEventListener("mouseenter", function () { if (!pinnedId) setFocus(id); });
      node.addEventListener("mouseleave", function () { if (!pinnedId) setFocus(null); });
      node.addEventListener("focus", function () { if (!pinnedId) setFocus(id); });
      node.addEventListener("blur", function () { if (!pinnedId) setFocus(null); });
      node.addEventListener("click", function () {
        pinnedId = pinnedId === id ? null : id;
        setFocus(pinnedId || id);
      });
    });

    draw();

    if ("ResizeObserver" in window) {
      new ResizeObserver(function () { draw(); }).observe(stage);
    } else {
      window.addEventListener("resize", draw);
    }
    if (WIDE.addEventListener) {
      WIDE.addEventListener("change", function () { draw(); run(); });
    }
    document.addEventListener("visibilitychange", run);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          visible = entry.isIntersecting;
          if (visible) stage.classList.add("is-live");
          run();
        });
      }, { threshold: 0.2 }).observe(stage);
    } else {
      visible = true;
      stage.classList.add("is-live");
      run();
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    Array.prototype.forEach.call(document.querySelectorAll("[data-pos]"), initPos);
  });
})();
