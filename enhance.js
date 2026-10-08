/*
 * Animation layer · Motion + canvas-confetti, layered over app.js.
 * ---------------------------------------------------------------------------
 * app.js is untouched by this file apart from one hand-off: it fires
 * "kyb:render" after each render. This file turns itself on by setting
 * <html data-motion="enhanced"> once Motion has loaded, so if the vendored
 * script is ever missing the page falls back to plain CSS and still works.
 *
 *   Motion (global `Motion`, vendored)    entrances, staggers, progress fills
 *   canvas-confetti (global `confetti`)   one burst when the application is approved
 *
 * Rules: only transform and opacity are animated (progress bars scale instead
 * of changing width), and everything is skipped under prefers-reduced-motion.
 * No network calls: both libraries are same-origin files in vendor/.
 */
(function () {
  "use strict";
  if (typeof Motion === "undefined" || !Motion.animate) return;
  const { animate, stagger } = Motion;

  const root = document.getElementById("app");
  const html = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const moving = () => !reduced.matches;

  const SPRING = { type: "spring", duration: 0.35, bounce: 0.08 };
  const FADE = { duration: 0.22, ease: "easeOut" };

  // Elements that enter the page. Matching is by class on nodes the renderer
  // inserts, so expanding a card or opening a dialog animates and a plain
  // re-render of existing nodes does not.
  const ENTER = ".card, .approved, .stats, .doc, .status, .person, .person-body, .popover-body, .note-pop, .proto-panel, .callout";
  const OVERLAY = ".backdrop";

  function enter(batch) {
    batch.forEach((el, i) => {
      const delay = Math.min(i * 0.03, 0.1);
      animate(el, { opacity: [0, 1], y: [6, 0] }, Object.assign({ delay: delay }, SPRING)).finished.catch(() => {});
    });
  }

  // Exits. The renderer deletes closed dialogs outright, so the removed node is
  // adopted by <body> as an inert ghost, animated out, then dropped. Only the
  // fixed-position overlays qualify: a popover is positioned by its parent, and
  // the parent is gone once the node is.
  function exit(n) {
    n.setAttribute("aria-hidden", "true");
    n.setAttribute("inert", "");
    n.classList.add("ghost");
    document.body.appendChild(n);
    const dlg = n.querySelector(".dialog");
    if (dlg) animate(dlg, { opacity: [1, 0], y: [0, 10], scale: [1, 0.98] }, { duration: 0.16, ease: "easeIn" });
    animate(n, { opacity: [1, 0] }, { duration: 0.18, ease: "easeIn" }).finished.then(() => n.remove(), () => n.remove());
  }

  new MutationObserver((records) => {
    if (!moving()) return;
    records.forEach((r) => r.removedNodes.forEach((n) => {
      // A node the renderer merely moved is back in the page: not an exit.
      if (n.nodeType === 1 && !n.isConnected && n.matches(OVERLAY)) exit(n);
    }));
    const batch = [];
    records.forEach((r) => r.addedNodes.forEach((n) => {
      if (n.nodeType !== 1) return;
      if (n.matches(OVERLAY)) {
        animate(n, { opacity: [0, 1] }, FADE);
        const dlg = n.querySelector(".dialog");
        if (dlg) animate(dlg, { opacity: [0, 1], y: [16, 0], scale: [0.97, 1] }, SPRING);
        return;
      }
      if (n.matches(ENTER)) batch.push(n);
      // Cards that arrive inside a freshly added wrapper (a whole new step).
      else n.querySelectorAll(ENTER).forEach((c) => batch.push(c));
    }));
    // A node inside an animating parent would double up, so only the outermost move.
    enter(batch.filter((el) => !batch.some((o) => o !== el && o.contains(el))));
  }).observe(root, { childList: true, subtree: true });

  // Progress fills. app.js sets an inline width; in Enhanced the stylesheet pins
  // the width to 100% and these scale on the X axis instead.
  const shown = new WeakMap();
  function syncBars(instant) {
    root.querySelectorAll("[data-width]").forEach((el) => {
      const to = Math.max(0, Math.min(100, Number(el.getAttribute("data-width")) || 0)) / 100;
      const from = shown.has(el) ? shown.get(el) : 0;
      shown.set(el, to);
      if (instant || reduced.matches || from === to) { el.style.transform = "scaleX(" + to + ")"; return; }
      animate(el, { transform: ["scaleX(" + from + ")", "scaleX(" + to + ")"] }, { duration: 0.45, ease: [0.22, 1, 0.36, 1] });
    });
  }

  // Confetti draws on its own canvas with the worker off: the CSP has no
  // worker-src, so the default blob worker would be blocked.
  let burst = null;
  function celebrate() {
    if (typeof confetti === "undefined" || reduced.matches) return;
    if (!burst) {
      const canvas = document.createElement("canvas");
      canvas.className = "confetti";
      canvas.setAttribute("aria-hidden", "true");
      document.body.appendChild(canvas);
      burst = confetti.create(canvas, { resize: true, useWorker: false });
    }
    const colors = ["#6923f4", "#9b6bf8", "#c9b0fb", "#ffffff"];
    burst({ particleCount: 70, spread: 70, startVelocity: 38, origin: { x: 0.5, y: 0.35 }, colors: colors, disableForReducedMotion: true });
    setTimeout(() => burst({ particleCount: 40, spread: 100, startVelocity: 28, origin: { x: 0.5, y: 0.35 }, colors: colors, disableForReducedMotion: true }), 180);
  }

  let was = { screen: null };
  document.addEventListener("kyb:render", (e) => {
    syncBars(false);
    if (e.detail.screen === "approved" && was.screen !== "approved" && was.screen !== null) celebrate();
    was = { screen: e.detail.screen };
  });

  // Switch the stylesheet's enhanced rules on, then draw the bars that app.js
  // already rendered (the first render happens before this file loads).
  html.setAttribute("data-motion", "enhanced");
  syncBars(true);
})();
