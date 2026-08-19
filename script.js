const menuButton = document.querySelector(".menu-button");
const mobileMenu = document.querySelector("#mobile-menu");

function closeMenu() {
  menuButton.setAttribute("aria-expanded", "false");
  mobileMenu.hidden = true;
  document.body.classList.remove("menu-open");
}

menuButton.addEventListener("click", () => {
  const opening = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(opening));
  mobileMenu.hidden = !opening;
  document.body.classList.toggle("menu-open", opening);
});

mobileMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !mobileMenu.hidden) {
    closeMenu();
    menuButton.focus();
  }
});
window.matchMedia("(min-width: 901px)").addEventListener("change", (event) => {
  if (event.matches) closeMenu();
});

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const reveals = document.querySelectorAll(".reveal");
if (reduceMotion || !("IntersectionObserver" in window)) {
  reveals.forEach((element) => element.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  reveals.forEach((element, index) => {
    if (index < 3) element.style.transitionDelay = `${index * 90}ms`;
    observer.observe(element);
  });
}

/* ---------------------------------------------------------------------------
   Hero background — an ASCII deployment lattice that builds itself, then runs.

   Reference: oxide.computer's isometric rack drawings (Refero style 57399d2f),
   which build technical illustrations out of +, -, |, ` and . in grey, with
   terminal green reserved for live state. The "renders itself in real time"
   behaviour is borrowed from Midjourney's ASCII hero (1e85631f); none of its
   palette is.

   Canvas rather than DOM, because every character carries its own colour and
   alpha and a few thousand spans re-rendering per frame would not hold 60fps.
   The grey structure is baked to an offscreen canvas once it has finished
   drawing in, so the running loop only paints the characters near the front.

   Two beats: BUILD draws the lattice in, RUN sweeps a signal front through it
   on a loop. Alpha falls away to the left so the headline is never competing
   with it.
--------------------------------------------------------------------------- */
(() => {
  const canvas = document.querySelector(".hero-ascii");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  const FOG = [93, 94, 97];      // --fog,   the structure
  const GREEN = [0, 216, 146];   // --green, live state only
  const FONT_PX = 13;
  const CELL_H = 18;
  const BUILD_MS = 2600;
  const CYCLE_MS = 9000;
  const BAND = 0.1;              // half-width of the signal front, in sweep units

  let cols = 0, rows = 0, cellW = 0, dpr = 1, narrow = false;
  let grid = [];                 // characters
  let field = null;              // scattered background dots, dimmer than the structure
  let nodes = [];                // cells that latch green once the front passes
  let sweep = [];                // each cell's position along the sweep axis
  let baked = null;              // offscreen grey structure
  let started = 0, raf = 0, visible = true;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const ease = (t) => t * t * (3 - 2 * t);
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const step = (a, b, v) => clamp01((v - a) / (b - a));

  /* Alpha by position: nothing on the left where the copy sits, full strength
     on the right, and soft at the top and bottom edges so it never ends on a
     hard line. */
  function placement(x, y) {
    // On a phone the copy runs the full width, so the lattice is held further
    // right and carried at roughly half strength. On desktop the copy stops at
    // 780px and the structure can own the space beside it.
    const fade = ease(step(narrow ? 0.6 : 0.46, narrow ? 0.92 : 0.8, x / cols));
    const top = ease(step(0, 0.1, y / rows));
    const bottom = 1 - ease(step(0.76, 1, y / rows));
    return fade * top * bottom * (narrow ? 0.55 : 1);
  }

  function buildGrid() {
    grid = new Array(cols * rows).fill(" ");
    nodes = new Array(cols * rows).fill(false);
    field = new Uint8Array(cols * rows);
    const put = (x, y, c) => {
      x = Math.round(x); y = Math.round(y);
      if (x >= 0 && x < cols && y >= 0 && y < rows) grid[y * cols + x] = c;
    };

    // One isometric bay: a back face up-and-left of a front face, the two
    // corner-linked by dotted diagonals. Oxide draws the receding edges
    // dashed and the near edges solid, which is what reads as depth.
    const bay = (x, y, w, h, dx, dy) => {
      const face = (fx, fy, dashed) => {
        put(fx, fy, "+"); put(fx + w, fy, "+");
        put(fx, fy + h, "+"); put(fx + w, fy + h, "+");
        for (let i = 1; i < w; i++) {
          if (!dashed || i % 2) { put(fx + i, fy, "-"); put(fx + i, fy + h, "-"); }
        }
        for (let j = 1; j < h; j++) {
          if (!dashed || j % 2) { put(fx, fy + j, "|"); put(fx + w, fy + j, "|"); }
        }
      };
      face(x - dx, y - dy, true);
      face(x, y, false);
      const link = (ax, ay, bx, by) => {
        const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
        for (let s = 1; s < n; s++) {
          const t = s / n;
          put(ax + (bx - ax) * t, ay + (by - ay) * t, s % 2 ? "`" : ".");
        }
      };
      link(x - dx, y - dy, x, y);
      link(x - dx + w, y - dy, x + w, y);
      link(x - dx, y - dy + h, x, y + h);
      link(x - dx + w, y - dy + h, x + w, y + h);
      // interior bay dividers, so the shelf reads as populated
      for (let j = 1; j < h; j++) {
        if (j % 2) { put(x + Math.round(w / 3), y + j, "|"); put(x + Math.round((2 * w) / 3), y + j, "|"); }
      }
    };

    const dx = 7, dy = 3;
    const w = Math.min(46, Math.max(18, Math.round(cols * 0.3)));
    const h = 6;
    const x0 = Math.round(cols * 0.55);
    const y0 = dy + 2;
    for (let s = 0; y0 + s * (h + 1) + h < rows - 1; s++) bay(x0, y0 + s * (h + 1), w, h, dx, dy);

    // Sparse dot field around the structure — Oxide's background texture.
    for (let i = 0; i < cols * rows; i++) {
      if (grid[i] === " " && Math.random() < 0.03) { grid[i] = "."; field[i] = 1; }
    }

    // Sweep coordinate + the cells that latch. Corners only, so the trail
    // lands on structure rather than on the dot field.
    sweep = new Float32Array(cols * rows);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        sweep[i] = (x / cols) * 0.55 + (y / rows) * 0.45;
        if (grid[i] === "+" && Math.random() < 0.3) nodes[i] = true;
      }
    }
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    narrow = r.width < 700;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `${FONT_PX}px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.textBaseline = "top";
    cellW = ctx.measureText("M").width || 7.8;
    cols = Math.ceil(r.width / cellW) + 1;
    rows = Math.ceil(r.height / CELL_H) + 1;
    buildGrid();
    baked = null;
    started = 0;
    if (reduced.matches) paintStatic();
  }

  function bake() {
    baked = document.createElement("canvas");
    baked.width = canvas.width;
    baked.height = canvas.height;
    const b = baked.getContext("2d");
    b.setTransform(dpr, 0, 0, dpr, 0, 0);
    b.font = ctx.font;
    b.textBaseline = "top";
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const ch = grid[y * cols + x];
        if (ch === " ") continue;
        const a = placement(x, y) * (field[y * cols + x] ? 0.15 : 0.34);
        if (a < 0.012) continue;
        b.fillStyle = `rgba(${FOG[0]},${FOG[1]},${FOG[2]},${a.toFixed(3)})`;
        b.fillText(ch, x * cellW, y * CELL_H);
      }
    }
  }

  function paintStatic() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!baked) bake();
    ctx.drawImage(baked, 0, 0, canvas.width / dpr, canvas.height / dpr);
  }

  function frame(now) {
    raf = 0;
    if (!started) started = now;
    const t = now - started;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (t < BUILD_MS) {
      // BUILD: the lattice draws itself in, along the same diagonal the
      // signal will later run.
      const p = ease(t / BUILD_MS);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const ch = grid[i];
          if (ch === " ") continue;
          const d = p - sweep[i];
          if (d < 0) continue;
          const settle = clamp01(d / 0.12);
          const a = placement(x, y) * (field[i] ? 0.15 : 0.34) * settle;
          if (a < 0.012) continue;
          // characters land green and cool to grey as they settle
          const m = 1 - settle;
          const cr = Math.round(FOG[0] + (GREEN[0] - FOG[0]) * m);
          const cg = Math.round(FOG[1] + (GREEN[1] - FOG[1]) * m);
          const cb = Math.round(FOG[2] + (GREEN[2] - FOG[2]) * m);
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${(a * (1 + m)).toFixed(3)})`;
          ctx.fillText(ch, x * cellW, y * CELL_H);
        }
      }
    } else {
      // RUN: grey structure from the bake, then only the characters the
      // signal front is currently touching.
      if (!baked) bake();
      ctx.drawImage(baked, 0, 0, canvas.width / dpr, canvas.height / dpr);
      const p = ((t - BUILD_MS) % CYCLE_MS) / CYCLE_MS;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const ch = grid[i];
          if (ch === " ") continue;
          const base = placement(x, y);
          if (base < 0.05) continue;
          const d = p - sweep[i];
          let a = 0;
          if (d >= -BAND && d <= BAND) {
            a = base * ease(1 - Math.abs(d) / BAND) * 0.85;      // the front
          } else if (d > BAND && nodes[i]) {
            a = base * 0.4;                                       // committed trail
          }
          if (a < 0.02) continue;
          ctx.fillStyle = `rgba(${GREEN[0]},${GREEN[1]},${GREEN[2]},${a.toFixed(3)})`;
          ctx.fillText(ch, x * cellW, y * CELL_H);
        }
      }
    }
    if (visible && !reduced.matches) raf = requestAnimationFrame(frame);
  }

  function play() {
    if (!raf && visible && !reduced.matches) raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  resize();

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => { stop(); resize(); play(); }, 160);
  });

  // Nothing to compute while the hero is off screen.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      visible ? play() : stop();
    }, { threshold: 0 }).observe(canvas);
  }

  reduced.addEventListener("change", () => {
    stop();
    started = 0;
    reduced.matches ? paintStatic() : play();
  });

  reduced.matches ? paintStatic() : play();
})();
