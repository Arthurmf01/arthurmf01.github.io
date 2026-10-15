/**
 * Shared vanilla JS for the site. No dependencies, no trackers.
 *
 * 1. Mobile nav toggle — hamburger button shows/hides the nav list at
 *    narrow viewports. Markup contract:
 *      <button class="nav-toggle" data-nav-toggle aria-expanded="false" aria-controls="site-nav">
 *        <span class="nav-toggle__bar"></span>
 *        <span class="visually-hidden">Menu</span>
 *      </button>
 *      <nav class="site-nav" id="site-nav" data-site-nav>...</nav>
 *
 * 2. Scatter-to-consolidate channel toggle — Specifications acceptance
 *    criterion 12. Markup contract:
 *      <div class="channel-demo" data-channel-demo>
 *        <div class="channel-stage" data-channel-stage>
 *          <div class="channel-card" data-channel="whatsapp">...</div>
 *          <div class="channel-card" data-channel="gmail">...</div>
 *          ... more scattered cards ...
 *          <div class="channel-card channel-card--target" data-channel="consolidated">...</div>
 *        </div>
 *        <button type="button" class="btn btn--primary" data-channel-toggle
 *                data-label-expand="Bring it together"
 *                data-label-collapse="Back to five channels">
 *          Bring it together
 *        </button>
 *      </div>
 *    Clicking the button toggles the `is-consolidated` class on the
 *    `[data-channel-stage]` element and swaps the button label using the
 *    data-label-* attributes (falls back to generic labels if absent).
 *
 * 3. Sub-nav scroll-spy and progress line (career chapters).
 * 4. Scroll reveal: `.reveal` gains `.is-seen` when it enters the viewport.
 * 5. Scope ladder: `[data-ladder]` tabs light up `[data-from]` chips.
 * 6. Africa map: `[data-africa]` paths and chips share one selection.
 * 7. Click-to-focus rows: `[data-focus-list]`.
 * 8. Gallery lightbox: `[data-gallery]` buttons open a native <dialog>.
 * 9. Tabs: `[data-tabs]` switches panels named by aria-controls.
 */

(function () {
  "use strict";

  function initNavToggle() {
    var toggles = document.querySelectorAll("[data-nav-toggle]");

    toggles.forEach(function (toggle) {
      var targetId = toggle.getAttribute("aria-controls");
      var nav = targetId
        ? document.getElementById(targetId)
        : toggle.parentElement
        ? toggle.parentElement.querySelector("[data-site-nav]")
        : null;

      if (!nav) {
        nav = document.querySelector("[data-site-nav]");
      }

      if (!nav) {
        return;
      }

      toggle.addEventListener("click", function () {
        var isOpen = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });
    });
  }

  function initChannelToggles() {
    var demos = document.querySelectorAll("[data-channel-demo]");

    demos.forEach(function (demo) {
      var stage = demo.querySelector("[data-channel-stage]");
      var button = demo.querySelector("[data-channel-toggle]");

      if (!stage || !button) {
        return;
      }

      var expandLabel = button.getAttribute("data-label-expand") || "Bring it together";
      var collapseLabel =
        button.getAttribute("data-label-collapse") || "Back to the scattered view";

      button.setAttribute("aria-pressed", "false");

      button.addEventListener("click", function () {
        var isConsolidated = stage.classList.toggle("is-consolidated");
        button.setAttribute("aria-pressed", isConsolidated ? "true" : "false");
        button.textContent = isConsolidated ? collapseLabel : expandLabel;
      });
    });
  }

  // 3. Sub-nav scroll-spy — fills the active dot on the career table-of-contents
  //    as the matching section scrolls into view. Markup contract:
  //      <nav class="subnav" data-subnav-spy>
  //        ... <a class="subnav__link" href="#hec">...</a> ...
  //      </nav>
  //    plus sections carrying the matching ids (e.g. id="hec"). No-op when
  //    IntersectionObserver is unavailable or no links/sections match.
  function initSubnavSpy() {
    var navs = document.querySelectorAll("[data-subnav-spy]");

    navs.forEach(function (nav) {
      var links = Array.prototype.slice.call(
        nav.querySelectorAll("a[href^='#']")
      );

      if (!links.length || !("IntersectionObserver" in window)) {
        return;
      }

      var linkById = {};
      var targets = [];

      links.forEach(function (link) {
        var id = link.getAttribute("href").slice(1);
        var section = id ? document.getElementById(id) : null;
        if (section) {
          linkById[id] = link;
          targets.push(section);
        }
      });

      if (!targets.length) {
        return;
      }

      var scroller = nav.querySelector(".subnav__scroll");
      var activeId = null;

      function setActive(id) {
        if (id === activeId) {
          return;
        }
        activeId = id;
        links.forEach(function (link) {
          link.classList.remove("is-active");
          link.removeAttribute("aria-current");
        });
        var link = linkById[id];
        if (!link) {
          return;
        }
        link.classList.add("is-active");
        link.setAttribute("aria-current", "true");
        // Keep the active pill visible on narrow screens (scroll the rail only,
        // never the page).
        if (scroller && scroller.scrollWidth > scroller.clientWidth) {
          scroller.scrollTo({
            left: link.offsetLeft - (scroller.clientWidth - link.offsetWidth) / 2,
            behavior: reducedMotion() ? "auto" : "smooth"
          });
        }
      }

      // Progress line: how far the reader is through the chapters.
      var ticking = false;
      function updateProgress() {
        ticking = false;
        var first = targets[0].getBoundingClientRect().top + window.scrollY;
        var lastRect = targets[targets.length - 1].getBoundingClientRect();
        var end = lastRect.bottom + window.scrollY - window.innerHeight;
        var progress = (window.scrollY - first + window.innerHeight * 0.5) / (end - first + window.innerHeight * 0.5);
        nav.style.setProperty("--progress", Math.max(0, Math.min(1, progress)).toFixed(4));
      }
      window.addEventListener(
        "scroll",
        function () {
          if (!ticking) {
            ticking = true;
            window.requestAnimationFrame(updateProgress);
          }
        },
        { passive: true }
      );
      updateProgress();

      // Track every target's current intersection ratio and activate whichever
      // one is most in view, recomputed on every observer firing. A simpler
      // "last isIntersecting entry wins" approach lags behind by a section or
      // two on tall cards where several targets can be intersecting at once.
      var ratios = {};

      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            ratios[entry.target.id] = entry.isIntersecting
              ? entry.intersectionRatio
              : 0;
          });

          var bestId = null;
          var bestRatio = 0;
          targets.forEach(function (section) {
            var ratio = ratios[section.id] || 0;
            if (ratio > bestRatio) {
              bestRatio = ratio;
              bestId = section.id;
            }
          });

          if (bestId) {
            setActive(bestId);
          }
        },
        { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
      );

      targets.forEach(function (section) {
        observer.observe(section);
      });
    });
  }

  function reducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // Runs `callback` once, the first time `element` scrolls into view.
  function onFirstView(element, callback, threshold) {
    if (!("IntersectionObserver" in window)) {
      callback();
      return;
    }
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            observer.disconnect();
            callback();
          }
        });
      },
      { threshold: threshold || 0.35 }
    );
    observer.observe(element);
  }

  function initReveal() {
    var items = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

    if (!("IntersectionObserver" in window)) {
      items.forEach(function (item) {
        item.classList.add("is-seen");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-seen");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );

    items.forEach(function (item) {
      observer.observe(item);
    });
  }

  function initLadders() {
    var ladders = document.querySelectorAll("[data-ladder]");

    ladders.forEach(function (ladder) {
      var tabs = Array.prototype.slice.call(ladder.querySelectorAll("[role='tab']"));
      var chips = Array.prototype.slice.call(ladder.querySelectorAll("[data-from]"));
      var caption = ladder.querySelector("[data-ladder-caption]");
      var slots = {
        headline: ladder.querySelector("[data-ladder-headline]"),
        body: ladder.querySelector("[data-ladder-body]"),
        num: ladder.querySelector("[data-ladder-num]"),
        label: ladder.querySelector("[data-ladder-label]")
      };
      var autoplay = null;

      if (!tabs.length || !caption) {
        return;
      }

      function select(index, moveFocus) {
        tabs.forEach(function (tab, i) {
          var selected = i === index;
          tab.setAttribute("aria-selected", selected ? "true" : "false");
          tab.tabIndex = selected ? 0 : -1;
          if (selected && moveFocus) {
            tab.focus();
          }
        });

        var fresh = 0;
        chips.forEach(function (chip) {
          var from = Number(chip.getAttribute("data-from"));
          var isNew = from === index;
          chip.classList.toggle("is-on", from <= index);
          chip.classList.toggle("is-new", isNew);
          chip.style.setProperty("--d", isNew ? (fresh++ * 0.07).toFixed(2) + "s" : "0s");
        });

        var tab = tabs[index];
        slots.headline.textContent = tab.getAttribute("data-headline");
        slots.body.textContent = tab.getAttribute("data-body");
        slots.num.textContent = tab.getAttribute("data-num");
        slots.label.textContent = tab.getAttribute("data-label");

        // Restart the caption entrance animation.
        caption.classList.remove("is-swapping");
        void caption.offsetWidth;
        caption.classList.add("is-swapping");
      }

      function stopAutoplay() {
        if (autoplay) {
          window.clearTimeout(autoplay);
          autoplay = null;
        }
      }

      tabs.forEach(function (tab, index) {
        tab.addEventListener("click", function () {
          stopAutoplay();
          select(index, false);
        });

        tab.addEventListener("keydown", function (event) {
          var next = null;
          if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            next = (index + 1) % tabs.length;
          } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            next = (index - 1 + tabs.length) % tabs.length;
          } else if (event.key === "Home") {
            next = 0;
          } else if (event.key === "End") {
            next = tabs.length - 1;
          }
          if (next !== null) {
            event.preventDefault();
            stopAutoplay();
            select(next, true);
          }
        });
      });

      select(0, false);

      // Climb the ladder once when it first scrolls into view, then hand over.
      if (!reducedMotion()) {
        onFirstView(ladder, function () {
          var step = 0;
          (function climb() {
            autoplay = window.setTimeout(function () {
              step += 1;
              select(step, false);
              if (step < tabs.length - 1) {
                climb();
              } else {
                autoplay = null;
              }
            }, 1500);
          })();
        }, 0.5);
      }
    });
  }

  function initAfricaMaps() {
    var maps = document.querySelectorAll("[data-africa]");

    maps.forEach(function (map) {
      var dataNode = map.querySelector("[data-africa-data]");
      var panel = map.querySelector("[data-africa-panel]");
      var shapes = Array.prototype.slice.call(map.querySelectorAll(".africa__country"));
      var chips = Array.prototype.slice.call(map.querySelectorAll(".africa__chip"));
      var slots = {
        kicker: map.querySelector("[data-africa-kicker]"),
        name: map.querySelector("[data-africa-name]"),
        detail: map.querySelector("[data-africa-detail]"),
        note: map.querySelector("[data-africa-note]")
      };
      var photo = {
        box: map.querySelector("[data-africa-photo]"),
        img: map.querySelector("[data-africa-photo-img]"),
        cap: map.querySelector("[data-africa-photo-cap]")
      };
      var data;
      var selected = null;

      if (!dataNode || !panel) {
        return;
      }

      try {
        data = JSON.parse(dataNode.textContent);
      } catch (error) {
        return;
      }

      var defaults = {
        kicker: slots.kicker.textContent,
        name: slots.name.textContent,
        detail: slots.detail.textContent,
        note: slots.note.textContent
      };

      /* The route from London to the selected country, and a pin on each country with a photo. */
      var svgNode = map.querySelector(".africa__svg");
      var SVG_NS = "http://www.w3.org/2000/svg";
      var london = { x: 183, y: -91 };
      var route = null;
      var hovering = false;

      function centre(id) {
        var shape = map.querySelector('.africa__country[data-id="' + id + '"]');
        if (!shape || !shape.getBBox) {
          return null;
        }
        var box = shape.getBBox();
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      }

      if (svgNode && svgNode.createSVGPoint) {
        var layer = document.createElementNS(SVG_NS, "g");
        layer.setAttribute("class", "africa__route");
        route = document.createElementNS(SVG_NS, "path");
        route.setAttribute("class", "africa__route-line");
        layer.appendChild(route);
        var home = document.createElementNS(SVG_NS, "circle");
        home.setAttribute("class", "africa__london");
        home.setAttribute("cx", london.x);
        home.setAttribute("cy", london.y);
        home.setAttribute("r", 7);
        layer.appendChild(home);
        var homeLabel = document.createElementNS(SVG_NS, "text");
        homeLabel.setAttribute("class", "africa__london-label");
        homeLabel.setAttribute("x", london.x + 13);
        homeLabel.setAttribute("y", london.y + 7);
        homeLabel.textContent = "London";
        layer.appendChild(homeLabel);
        var homeHit = document.createElementNS(SVG_NS, "circle");
        homeHit.setAttribute("class", "africa__london-hit");
        homeHit.setAttribute("cx", london.x);
        homeHit.setAttribute("cy", london.y);
        homeHit.setAttribute("r", 26);
        homeHit.addEventListener("mouseenter", function () {
          window.clearTimeout(leaveTimer);
          if (!selected || (hovering && selected !== "LON")) {
            selected = "LON";
            hovering = true;
            render();
          }
        });
        homeHit.addEventListener("mouseleave", function () {
          if (hovering && selected === "LON") {
            hoverClose();
          }
        });
        homeHit.addEventListener("click", function () {
          hovering = false;
          selected = "LON";
          render();
        });
        layer.appendChild(homeHit);
        Object.keys(data).forEach(function (id) {
          var at = data[id].photos ? centre(id) : null;
          if (!at) {
            return;
          }
          var pin = document.createElementNS(SVG_NS, "circle");
          pin.setAttribute("class", "africa__pin");
          pin.setAttribute("cx", at.x);
          pin.setAttribute("cy", at.y);
          pin.setAttribute("r", 6);
          layer.appendChild(pin);
        });
        svgNode.appendChild(layer);
      }

      function showRoute(id) {
        if (!route) {
          return;
        }
        var to = id ? centre(id) : null;
        if (!to) {
          route.setAttribute("d", "");
          return;
        }
        var bend = (to.x - london.x) * 0.25 + 40;
        route.setAttribute("d", "M" + london.x + " " + london.y + " Q" + (to.x + bend) + " " + (london.y + (to.y - london.y) * 0.35) + " " + to.x + " " + to.y);
        var length = route.getTotalLength();
        route.style.transition = "none";
        route.style.strokeDasharray = length;
        route.style.strokeDashoffset = reducedMotion() ? 0 : length;
        if (!reducedMotion()) {
          void route.getBoundingClientRect();
          route.style.transition = "stroke-dashoffset 0.9s cubic-bezier(0.22, 1, 0.36, 1)";
          route.style.strokeDashoffset = 0;
        }
      }

      var shots = [];
      var shot = 0;
      var nextButton = map.querySelector("[data-africa-photo-next]");

      function drawPhoto() {
        var item = shots[shot];
        photo.img.src = item.src;
        photo.img.alt = item.alt || "";
        photo.cap.textContent = item.cap || "";
        photo.box.classList.toggle("africa__photo--tall", !!item.tall);
        if (nextButton) {
          nextButton.hidden = shots.length < 2;
          nextButton.textContent = "Photo " + (shot + 1) + " of " + shots.length + " \u2192";
        }
      }

      function showPhoto(country) {
        if (!photo.box || !photo.img) {
          return;
        }
        shots = (country && country.photos) || [];
        shot = 0;
        photo.box.hidden = !shots.length;
        if (shots.length) {
          drawPhoto();
        }
      }

      if (nextButton) {
        nextButton.addEventListener("click", function () {
          shot = (shot + 1) % shots.length;
          drawPhoto();
        });
      }

      function render() {
        var country = selected ? data[selected] : null;

        shapes.forEach(function (shape) {
          shape.classList.toggle("is-selected", shape.getAttribute("data-id") === selected);
        });
        chips.forEach(function (chip) {
          chip.setAttribute("aria-pressed", chip.getAttribute("data-id") === selected ? "true" : "false");
        });

        if (selected === "LON") {
          slots.kicker.textContent = "Home base";
          slots.name.textContent = "London";
          slots.detail.textContent = "I was the bridge between Europe and Africa: based in London, on a plane to the continent one week a month on average for five years.";
          slots.note.textContent = "We also brought local experts over to be trained at our London training centre.";
          showPhoto(null);
          showRoute(null);
        } else if (country) {
          slots.kicker.textContent = country.region;
          slots.name.textContent = country.name;
          slots.detail.textContent =
            country.count + (country.count === 1 ? " customer" : " customers") +
            (country.sectors ? " · " + country.sectors : "");
          slots.note.textContent = country.note || "";
          showPhoto(country);
          showRoute(selected);
        } else {
          showRoute(null);
          slots.kicker.textContent = defaults.kicker;
          slots.name.textContent = defaults.name;
          slots.detail.textContent = defaults.detail;
          slots.note.textContent = defaults.note;
          showPhoto(null);
        }

        panel.hidden = !selected;
        panel.classList.remove("is-swapping");
        void panel.offsetWidth;
        panel.classList.add("is-swapping");
        place();
      }

      /* The grey pop-out sits next to the selected place on wide screens and
         drops into the flow under the map on narrow ones. */
      function place() {
        var wide = window.matchMedia("(min-width: 620px)").matches;
        var at = selected === "LON" ? london : selected ? centre(selected) : null;
        panel.classList.toggle("is-anchored", !!(wide && at && svgNode && svgNode.getScreenCTM));
        if (!panel.classList.contains("is-anchored")) {
          panel.style.left = panel.style.top = "";
          return;
        }
        var point = svgNode.createSVGPoint();
        point.x = at.x;
        point.y = at.y;
        var screen = point.matrixTransform(svgNode.getScreenCTM());
        var box = map.getBoundingClientRect();
        var x = screen.x - box.left;
        var y = screen.y - box.top;
        var width = panel.offsetWidth;
        var height = panel.offsetHeight;
        var left = x < box.width / 2 ? x + 22 : x - 22 - width;
        var top = y - height / 2;
        if (selected === "LON") {
          left = x - 20;
          top = y + 20;
        }
        left = Math.max(8, Math.min(left, box.width - width - 8));
        var floor = svgNode.getBoundingClientRect().bottom - box.top;
        top = Math.max(8, Math.min(top, floor - height - 8));
        panel.style.left = left + "px";
        panel.style.top = top + "px";
        panel.style.transformOrigin = (x - left) + "px " + (y - top) + "px";
      }

      function close() {
        if (selected) {
          selected = null;
          render();
        }
      }

      var closeButton = map.querySelector("[data-africa-close]");
      if (closeButton) {
        closeButton.addEventListener("click", close);
      }
      map.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
          close();
        }
      });
      document.addEventListener("click", function (event) {
        if (selected && !map.contains(event.target)) {
          close();
        }
      });
      window.addEventListener("resize", place);
      if (photo.img) {
        photo.img.addEventListener("load", place);
      }

      function toggle(id) {
        // A click on a pop-out that hover opened pins it instead of closing it.
        if (hovering && selected === id) {
          hovering = false;
          return;
        }
        hovering = false;
        selected = selected === id ? null : id;
        render();
      }

      /* Countries with photos open on hover. The pop-out stays while the
         pointer is on the country or on the pop-out itself. */
      var leaveTimer = null;

      function hoverClose() {
        window.clearTimeout(leaveTimer);
        leaveTimer = window.setTimeout(function () {
          if (hovering) {
            hovering = false;
            selected = null;
            render();
          }
        }, 280);
      }

      panel.addEventListener("mouseenter", function () {
        window.clearTimeout(leaveTimer);
      });
      panel.addEventListener("mouseleave", function () {
        if (hovering) {
          hoverClose();
        }
      });

      shapes.forEach(function (shape, index) {
        var id = shape.getAttribute("data-id");
        shape.style.setProperty("--d", (index * 0.09).toFixed(2) + "s");
        shape.addEventListener("click", function () {
          toggle(id);
        });
        if (data[id] && data[id].photos) {
          shape.addEventListener("mouseenter", function () {
            window.clearTimeout(leaveTimer);
            if (!selected || hovering) {
              if (selected !== id) {
                selected = id;
                hovering = true;
                render();
              }
            }
          });
          shape.addEventListener("mouseleave", function () {
            if (hovering && selected === id) {
              hoverClose();
            }
          });
        }
      });

      chips.forEach(function (chip) {
        chip.addEventListener("click", function () {
          toggle(chip.getAttribute("data-id"));
        });
      });

      // The blank map lights up, market by market, when it scrolls into view.
      onFirstView(map, function () {
        map.classList.add("is-lit");
      }, 0.3);
    });
  }

  function initFocusLists() {
    var lists = document.querySelectorAll("[data-focus-list]");

    lists.forEach(function (list) {
      var rows = Array.prototype.slice.call(list.querySelectorAll("button"));

      rows.forEach(function (row) {
        row.setAttribute("aria-pressed", "false");
        row.addEventListener("click", function () {
          var wasFocused = row.classList.contains("is-focused");
          rows.forEach(function (other) {
            other.classList.remove("is-focused");
            other.setAttribute("aria-pressed", "false");
          });
          if (!wasFocused) {
            row.classList.add("is-focused");
            row.setAttribute("aria-pressed", "true");
          }
          list.classList.toggle("has-focus", !wasFocused);
        });
      });
    });
  }

  function initGalleries() {
    var galleries = document.querySelectorAll("[data-gallery]");

    galleries.forEach(function (gallery) {
      var dialog = document.getElementById(gallery.getAttribute("data-gallery"));
      var items = Array.prototype.slice.call(gallery.querySelectorAll("[data-full]"));
      if (!dialog || typeof dialog.showModal !== "function" || !items.length) {
        return;
      }
      var image = dialog.querySelector("img");
      var slots = {
        title: dialog.querySelector("[data-lightbox-title]"),
        place: dialog.querySelector("[data-lightbox-place]"),
        date: dialog.querySelector("[data-lightbox-date]"),
        count: dialog.querySelector("[data-lightbox-count]")
      };
      var current = 0;

      function show(index) {
        current = (index + items.length) % items.length;
        var item = items[current];
        image.src = item.getAttribute("data-full");
        image.alt = item.getAttribute("data-title") || "";
        slots.title.textContent = item.getAttribute("data-title") || "";
        slots.place.textContent = item.getAttribute("data-place") || "";
        slots.date.textContent = item.getAttribute("data-date") || "";
        slots.count.textContent = current + 1 + " / " + items.length;
      }

      items.forEach(function (item, index) {
        item.addEventListener("click", function () {
          show(index);
          dialog.showModal();
        });
      });

      // Backdrop or close button dismisses; arrows step through; Esc is native.
      dialog.addEventListener("click", function (event) {
        if (event.target === dialog || event.target.closest("[data-lightbox-close]")) {
          dialog.close();
        } else if (event.target.closest("[data-lightbox-prev]")) {
          show(current - 1);
        } else if (event.target.closest("[data-lightbox-next]")) {
          show(current + 1);
        }
      });

      dialog.addEventListener("keydown", function (event) {
        if (event.key === "ArrowLeft") {
          show(current - 1);
        } else if (event.key === "ArrowRight") {
          show(current + 1);
        }
      });

      dialog.addEventListener("close", function () {
        items[current].focus();
      });
    });
  }

  // Generic two-or-more-way switch: tabs point at panels via aria-controls.
  function initTabs() {
    var groups = document.querySelectorAll("[data-tabs]");

    groups.forEach(function (group) {
      var tabs = Array.prototype.slice.call(group.querySelectorAll("[role='tab']"));

      function select(index, moveFocus) {
        tabs.forEach(function (tab, i) {
          var selected = i === index;
          var panel = document.getElementById(tab.getAttribute("aria-controls"));
          tab.setAttribute("aria-selected", selected ? "true" : "false");
          tab.tabIndex = selected ? 0 : -1;
          if (panel) {
            panel.hidden = !selected;
          }
          if (selected && moveFocus) {
            tab.focus();
          }
        });
      }

      tabs.forEach(function (tab, index) {
        tab.addEventListener("click", function () {
          select(index, false);
        });
        tab.addEventListener("keydown", function (event) {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            var step = event.key === "ArrowRight" ? 1 : -1;
            select((index + step + tabs.length) % tabs.length, true);
          }
        });
      });

      select(0, false);
    });
  }

  // Quote: split into words so they can fade in one after another when scrolled into view
  function initVoices() {
    var voices = Array.prototype.slice.call(document.querySelectorAll("[data-voice]"));

    voices.forEach(function (voice) {
      var quote = voice.querySelector("[data-voice-quote]");
      if (!quote || reducedMotion()) {
        return;
      }
      var words = quote.textContent.trim().split(/\s+/);
      quote.setAttribute("aria-label", quote.textContent.trim());
      quote.textContent = "";
      words.forEach(function (word, index) {
        var span = document.createElement("span");
        span.className = "voice__word";
        span.setAttribute("aria-hidden", "true");
        span.style.setProperty("--i", index);
        span.textContent = word + " ";
        quote.appendChild(span);
      });
      voice.classList.add("is-armed");
      onFirstView(voice, function () {
        voice.classList.add("is-spoken");
      }, 0.5);
    });
  }

  // Flip cards: a button turns the card over; the hidden face is kept out of the accessibility tree
  function initFlipCards() {
    var cards = Array.prototype.slice.call(document.querySelectorAll("[data-flip]"));

    cards.forEach(function (card) {
      var button = card.parentNode.querySelector("[data-flip-btn]");
      var front = card.querySelector(".flip__face--front");
      var back = card.querySelector(".flip__face--back");
      if (!button || !front || !back) {
        return;
      }

      function toggle() {
        var flipped = card.classList.toggle("is-flipped");
        button.setAttribute("aria-pressed", flipped ? "true" : "false");
        button.textContent = flipped ? "Flip it back" : "Flip the card";
        front.setAttribute("aria-hidden", flipped ? "true" : "false");
        back.setAttribute("aria-hidden", flipped ? "false" : "true");
      }

      button.addEventListener("click", toggle);
      card.addEventListener("click", toggle);
    });
  }

  // Analytics with consent: Google Analytics loads only after the visitor accepts.
  // Paste the GA4 measurement ID ("G-...") below; while it is empty, no banner shows and nothing loads.
  var GA_ID = "";
  var CONSENT_KEY = "af-cookie-consent";

  function readConsent() {
    try { return window.localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }

  function writeConsent(value) {
    try { window.localStorage.setItem(CONSENT_KEY, value); } catch (e) { /* private mode: ask again next visit */ }
  }

  function loadAnalytics() {
    if (window.gtag) {
      return;
    }
    var tag = document.createElement("script");
    tag.async = true;
    tag.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
    document.head.appendChild(tag);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", GA_ID);
  }

  function showConsentBanner() {
    if (document.querySelector("[data-consent]")) {
      return;
    }
    var banner = document.createElement("div");
    banner.className = "consent";
    banner.setAttribute("data-consent", "");
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", "Cookie consent");
    banner.innerHTML =
      '<p class="consent__text">May I use Google Analytics cookies to see how this site is read? Nothing is shared or sold, and the site works the same either way.</p>' +
      '<div class="consent__actions">' +
      '<button type="button" class="btn btn--secondary btn--sm" data-consent-choice="denied">No thanks</button>' +
      '<button type="button" class="btn btn--primary btn--sm" data-consent-choice="granted">Accept</button>' +
      "</div>";
    banner.addEventListener("click", function (event) {
      var choice = event.target.getAttribute("data-consent-choice");
      if (!choice) {
        return;
      }
      writeConsent(choice);
      banner.remove();
      if (choice === "granted") {
        loadAnalytics();
      }
    });
    document.body.appendChild(banner);
  }

  function initConsent() {
    if (!GA_ID) {
      return;
    }
    var footerNav = document.querySelector(".site-footer nav");
    if (footerNav) {
      var settings = document.createElement("button");
      settings.type = "button";
      settings.className = "consent__reopen";
      settings.textContent = "Cookies";
      settings.addEventListener("click", showConsentBanner);
      footerNav.appendChild(settings);
    }
    var consent = readConsent();
    if (consent === "granted") {
      loadAnalytics();
    } else if (consent !== "denied") {
      showConsentBanner();
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initNavToggle();
    initChannelToggles();
    initSubnavSpy();
    initReveal();
    initLadders();
    initAfricaMaps();
    initFocusLists();
    initGalleries();
    initTabs();
    initFlipCards();
    initVoices();
    initConsent();
  });
})();
