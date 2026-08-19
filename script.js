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
   Hero background — the ACE engagement lattice.

   Four stages, chained top to bottom: Diagnostic, AI opportunity, Blueprint,
   Deployment. Each is an isometric bay drawn in ASCII with an interior cell
   grid; a signal runs the chain, filling one bay at a time and travelling the
   connector between them. Completed bays hold a committed state, so by the
   last stage the whole run is legible at a glance.

   Reference: oxide.computer's isometric rack drawings (Refero 57399d2f) —
   wireframe geometry from + - | ` . in grey, terminal green reserved for live
   state, no glow and no gradient. The "renders itself in real time" opening is
   borrowed from Midjourney's ASCII hero (1e85631f); none of its palette is.

   Canvas rather than DOM: every character carries its own colour and alpha,
   and a few thousand spans re-rendering per frame will not hold 60fps. The
   grey structure is baked to an offscreen canvas once it has drawn in, so each
   running frame only paints characters that are actually lit.

   Legibility lives in the per-character alpha rather than a CSS mask, because
   a mask cannot know how wide the copy is at a given breakpoint.
--------------------------------------------------------------------------- */
(() => {
  const canvas = document.querySelector(".hero-ascii");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  const FOG = [93, 94, 97];
  const GREEN = [0, 216, 146];
  const FONT_PX = 13;
  const CELL_H = 18;

  const STAGES = ["Diagnostic", "AI Opportunity", "Blueprint", "Deployment"];
  const BUILD_MS = 2600;
  const FILL_MS = 2100;   // one bay populating
  const LINK_MS = 520;    // signal travelling to the next bay
  const HOLD_MS = 1600;   // whole chain lit
  const FADE_MS = 1100;   // release back to grey
  const RUN_MS = STAGES.length * (FILL_MS + LINK_MS) + HOLD_MS + FADE_MS;

  // Character roles, so the renderer can treat structure, labels and cells
  // differently without re-parsing glyphs.
  const R = { NONE: 0, DUST: 1, BOX: 2, LABEL: 3, ORD: 4, CELL: 5, LINK: 6 };

  let cols = 0, rows = 0, cellW = 0, dpr = 1, narrow = false;
  let grid = null, role = null, stageOf = null;
  let stages = [];
  let baked = null, started = 0, raf = 0, visible = true;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const step = (a, b, v) => clamp01((v - a) / (b - a));
  const smooth = (t) => t * t * (3 - 2 * t);
  const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* Held clear of the copy. Desktop headline stops at 780px so the field can
     start at 46% of the width; under 700px the copy runs full width, so it is
     pushed further right and carried at about half strength. */
  function placement(x, y) {
    const fade = smooth(step(narrow ? 0.62 : 0.6, narrow ? 0.93 : 0.76, x / cols));
    const top = smooth(step(0, 0.06, y / rows));
    const bottom = 1 - smooth(step(0.94, 1, y / rows));
    return fade * top * bottom * (narrow ? 0.42 : 1);
  }

  function build() {
    grid = new Array(cols * rows).fill(" ");
    role = new Uint8Array(cols * rows);
    stageOf = new Int8Array(cols * rows).fill(-1);
    stages = [];

    const put = (x, y, ch, r, si) => {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || x >= cols || y < 0 || y >= rows) return -1;
      const i = y * cols + x;
      grid[i] = ch; role[i] = r; stageOf[i] = si;
      return i;
    };

    const stride = Math.max(7, Math.floor((rows - 3) / STAGES.length));
    const bayH = Math.min(6, Math.max(3, stride - 6));
    const dx = 5, dy = 2;
    // Placed from the longest label rather than a fixed fraction, so the
    // stage names never run off the right edge on a narrow viewport.
    // cols overshoots the visible width by one, so keep two clear.
    const naming = (n) => (narrow ? n.replace(/^AI /, "") : n);
    const labelSpan = 4 + Math.max(...STAGES.map((n) => naming(n).length));
    const x0 = Math.max(1, Math.min(cols - labelSpan - 2, Math.round(cols * (narrow ? 0.62 : 0.69))));
    const bayW = Math.max(16, Math.min(44, cols - x0 - 3));
    const block = stride * (STAGES.length - 1) + (1 + dy + bayH + 1);
    const yTop = Math.max(1, Math.floor((rows - block) / 2));

    STAGES.forEach((name, si) => {
      const yLabel = yTop + si * stride;
      const yBox = yLabel + 1 + dy;
      const st = { box: [], label: [], ord: [], cells: [], link: [] };

      // label: ordinal, then the stage name, in the mono voice used elsewhere
      const ord = String(si + 1).padStart(2, "0");
      [...ord].forEach((c, k) => st.ord.push(put(x0 + k, yLabel, c, R.ORD, si)));
      [...naming(name).toUpperCase()].forEach((c, k) => {
        if (c !== " ") st.label.push(put(x0 + 4 + k, yLabel, c, R.LABEL, si));
      });

      // isometric bay: dashed back face up-left, solid front face
      const face = (fx, fy, dashed) => {
        st.box.push(put(fx, fy, "+", R.BOX, si), put(fx + bayW, fy, "+", R.BOX, si));
        st.box.push(put(fx, fy + bayH, "+", R.BOX, si), put(fx + bayW, fy + bayH, "+", R.BOX, si));
        for (let i = 1; i < bayW; i++) {
          if (!dashed || i % 2) {
            st.box.push(put(fx + i, fy, "-", R.BOX, si), put(fx + i, fy + bayH, "-", R.BOX, si));
          }
        }
        for (let j = 1; j < bayH; j++) {
          if (!dashed || j % 2) {
            st.box.push(put(fx, fy + j, "|", R.BOX, si), put(fx + bayW, fy + j, "|", R.BOX, si));
          }
        }
      };
      face(x0 - dx, yBox - dy, true);
      face(x0, yBox, false);
      const link = (ax, ay, bx, by) => {
        const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
        for (let k = 1; k < n; k++) {
          const t = k / n;
          st.box.push(put(ax + (bx - ax) * t, ay + (by - ay) * t, k % 2 ? "`" : ".", R.BOX, si));
        }
      };
      link(x0 - dx, yBox - dy, x0, yBox);
      link(x0 - dx + bayW, yBox - dy, x0 + bayW, yBox);
      link(x0 - dx, yBox - dy + bayH, x0, yBox + bayH);
      link(x0 - dx + bayW, yBox - dy + bayH, x0 + bayW, yBox + bayH);

      // interior cell grid — the bay's work, filling left to right. The
      // occluded back-face edges cross this rectangle, so clear it first.
      for (let j = 1; j < bayH; j++) {
        for (let i = 1; i < bayW; i++) {
          const ci = (yBox + j) * cols + (x0 + i);
          if (ci >= 0 && ci < cols * rows) { grid[ci] = " "; role[ci] = R.NONE; stageOf[ci] = -1; }
        }
      }
      for (let j = 1; j < bayH; j++) {
        for (let i = 2; i < bayW - 1; i += 2) {
          st.cells.push(put(x0 + i, yBox + j, "-", R.CELL, si));
        }
      }

      // connector down to the next bay
      if (si < STAGES.length - 1) {
        const cx = x0 + Math.round(bayW / 2);
        for (let y = yBox + bayH + 1; y < yLabel + stride; y++) {
          st.link.push(put(cx, y, "|", R.LINK, si));
        }
      }

      st.box = st.box.filter((i) => i >= 0);
      st.cells = st.cells.filter((i) => i >= 0);
      st.link = st.link.filter((i) => i >= 0);
      st.label = st.label.filter((i) => i >= 0);
      st.ord = st.ord.filter((i) => i >= 0);
      stages.push(st);
    });

    // sparse dust, well below the structure
    for (let i = 0; i < cols * rows; i++) {
      if (grid[i] === " " && Math.random() < 0.028) { grid[i] = "."; role[i] = R.DUST; }
    }
  }

  const baseAlpha = (r) =>
    r === R.DUST ? 0.13 : r === R.LABEL ? 0.48 : r === R.ORD ? 0.5 : r === R.CELL ? 0.2 : 0.32;

  function paint(i, x, y, mix, boost) {
    const ch = grid[i];
    if (ch === " ") return;
    const a = placement(x, y) * baseAlpha(role[i]) * (1 + boost);
    if (a < 0.012) return;
    const r = Math.round(FOG[0] + (GREEN[0] - FOG[0]) * mix);
    const g = Math.round(FOG[1] + (GREEN[1] - FOG[1]) * mix);
    const b = Math.round(FOG[2] + (GREEN[2] - FOG[2]) * mix);
    ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(a, 0.95).toFixed(3)})`;
    ctx.fillText(ch, Math.round(x * cellW), y * CELL_H);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    narrow = rect.width < 700;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `${FONT_PX}px "IBM Plex Mono", ui-monospace, Menlo, monospace`;
    ctx.textBaseline = "top";
    if ("textRendering" in ctx) ctx.textRendering = "geometricPrecision";
    cellW = ctx.measureText("M").width || 7.8;
    cols = Math.ceil(rect.width / cellW) + 1;
    rows = Math.ceil(rect.height / CELL_H) + 1;
    build();
    baked = null;
    started = 0;
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
        const i = y * cols + x;
        if (grid[i] === " ") continue;
        const a = placement(x, y) * baseAlpha(role[i]);
        if (a < 0.012) continue;
        b.fillStyle = `rgba(${FOG[0]},${FOG[1]},${FOG[2]},${a.toFixed(3)})`;
        b.fillText(grid[i], Math.round(x * cellW), y * CELL_H);
      }
    }
  }

  // Where the run is: which stage is filling, how far, and how lit each
  // completed stage still is.
  function runState(t) {
    const span = FILL_MS + LINK_MS;
    const chain = STAGES.length * span;
    const active = t < chain ? Math.floor(t / span) : -1;
    const within = t < chain ? (t % span) / span : 1;
    const fillP = clamp01(within / (FILL_MS / span));
    const linkP = clamp01((within - FILL_MS / span) / (LINK_MS / span));
    const release = t > chain + HOLD_MS ? clamp01((t - chain - HOLD_MS) / FADE_MS) : 0;
    return { active, fillP: inOut(fillP), linkP, release };
  }

  function frame(now) {
    raf = 0;
    if (!started) started = now;
    const t = now - started;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (t < BUILD_MS) {
      // the lattice draws itself in, landing green and cooling to grey
      const p = smooth(t / BUILD_MS);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          if (grid[i] === " ") continue;
          const d = p - ((x / cols) * 0.5 + (y / rows) * 0.5);
          if (d < 0) continue;
          const settle = clamp01(d / 0.12);
          const m = 1 - settle;
          const a = placement(x, y) * baseAlpha(role[i]) * settle;
          if (a < 0.012) continue;
          const r = Math.round(FOG[0] + (GREEN[0] - FOG[0]) * m);
          const g = Math.round(FOG[1] + (GREEN[1] - FOG[1]) * m);
          const b = Math.round(FOG[2] + (GREEN[2] - FOG[2]) * m);
          ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(a * (1 + m), 0.95).toFixed(3)})`;
          ctx.fillText(grid[i], Math.round(x * cellW), y * CELL_H);
        }
      }
    } else {
      if (!baked) bake();
      ctx.drawImage(baked, 0, 0, canvas.width / dpr, canvas.height / dpr);

      const { active, fillP, linkP, release } = runState((t - BUILD_MS) % RUN_MS);
      const held = 1 - release;

      stages.forEach((st, si) => {
        const done = active < 0 ? 1 : si < active ? 1 : 0;
        const live = si === active;
        if (!done && !live) return;

        // committed stages stay lit at half; the live one is at full
        const lit = live ? 1 : 0.5;
        const draw = (idx, mix, boost) => {
          const x = idx % cols, y = (idx / cols) | 0;
          paint(idx, x, y, mix, boost);
        };

        st.box.forEach((i) => draw(i, 1, (live ? 0.85 : 0.45) * held * lit));
        st.ord.forEach((i) => draw(i, 1, (live ? 1.3 : 0.7) * held));
        st.label.forEach((i) => draw(i, 1, (live ? 1.1 : 0.5) * held));

        // interior cells populate left to right while the stage is live
        const n = st.cells.length;
        const upto = live ? Math.floor(fillP * n) : n;
        for (let k = 0; k < upto; k++) {
          const idx = st.cells[k];
          const x = idx % cols, y = (idx / cols) | 0;
          grid[idx] = "#";
          const edge = live ? 1 - clamp01((upto - k) / 6) : 0;
          paint(idx, x, y, 1, (1.6 + edge * 1.4) * held * lit);
        }
        for (let k = upto; k < n; k++) grid[st.cells[k]] = "-";

        // the connector carries the signal to the next bay
        if (st.link.length) {
          const reach = live ? linkP : 1;
          const m = Math.floor(reach * st.link.length);
          for (let k = 0; k < m; k++) {
            const idx = st.link[k];
            const x = idx % cols, y = (idx / cols) | 0;
            const headroom = 1 - clamp01((m - k) / 3);
            paint(idx, x, y, 1, (0.9 + headroom * 1.6) * held * lit);
          }
        }
      });
    }
    if (visible && !reduced.matches) raf = requestAnimationFrame(frame);
  }

  function paintStatic() {
    // Reduced motion gets the finished chain: structure plus every bay filled,
    // held at the committed level. No loop is ever started.
    stages.forEach((st) => st.cells.forEach((i) => { grid[i] = "#"; }));
    baked = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    bake();
    ctx.drawImage(baked, 0, 0, canvas.width / dpr, canvas.height / dpr);
    stages.forEach((st) => {
      const go = (arr, boost) => arr.forEach((i) => paint(i, i % cols, (i / cols) | 0, 1, boost));
      go(st.cells, 0.5); go(st.ord, 0.4); go(st.label, 0.25); go(st.box, 0.15); go(st.link, 0.3);
    });
  }

  const play = () => { if (!raf && visible && !reduced.matches) raf = requestAnimationFrame(frame); };
  const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };

  resize();

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      stop(); resize();
      reduced.matches ? paintStatic() : play();
    }, 160);
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      visible ? play() : stop();
    }, { threshold: 0 }).observe(canvas);
  }

  reduced.addEventListener("change", () => {
    stop(); started = 0; baked = null;
    reduced.matches ? paintStatic() : play();
  });

  reduced.matches ? paintStatic() : play();
})();
