(function () {
  "use strict";

  const STORAGE_KEY = "pdfnest-theme";
  const DEFAULT_THEME = "light";

  /* ---------- text size (Settings → Text size) ---------- */
  const FONT_KEY = "pdfnest-font-scale";
  const FONT_MIN = 85, FONT_MAX = 150, FONT_DEFAULT = 100;

  function readFont() {
    try {
      const v = parseInt(localStorage.getItem(FONT_KEY), 10);
      return v >= FONT_MIN && v <= FONT_MAX ? v : FONT_DEFAULT;
    } catch (_) { return FONT_DEFAULT; }
  }

  function applyFont(percent) {
    const p = Math.min(FONT_MAX, Math.max(FONT_MIN, Number(percent) || FONT_DEFAULT));
    const root = document.documentElement;
    root.style.fontSize = p + "%";                     // every rem-based size scales with it
    root.style.setProperty("--font-scale", String(p / 100));
    root.style.setProperty("--sidebar-w", Math.round(248 * Math.min(p / 100, 1.3)) + "px");
    return p;
  }

  function setFont(percent) {
    const p = applyFont(percent);
    try { localStorage.setItem(FONT_KEY, String(p)); } catch (_) { }
    window.dispatchEvent(new CustomEvent("pdfnest:fontchange", { detail: { percent: p } }));
    return p;
  }

  applyFont(readFont());

  function readTheme() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === "dark" || value === "light" ? value : DEFAULT_THEME;
    } catch (_) {
      return DEFAULT_THEME;
    }
  }

  function applyTheme(theme) {
    const selected = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = selected;
    if (document.body) document.body.classList.toggle("dark-theme", selected === "dark");

    const icon = document.getElementById("themeIcon");
    const toggle = document.getElementById("themeToggle");
    if (icon) icon.textContent = selected === "dark" ? "☀" : "☾";
    if (toggle) {
      toggle.setAttribute("aria-label", selected === "dark" ? "Switch to light theme" : "Switch to dark theme");
      toggle.setAttribute("title", selected === "dark" ? "Switch to light theme" : "Switch to dark theme");
    }
  }

  function setTheme(theme) {
    const selected = theme === "dark" ? "dark" : "light";
    try { localStorage.setItem(STORAGE_KEY, selected); } catch (_) { }
    applyTheme(selected);
    window.dispatchEvent(new CustomEvent("pdfnest:themechange", { detail: { theme: selected } }));
  }

  function toggleTheme() {
    setTheme(document.body && document.body.classList.contains("dark-theme") ? "light" : "dark");
  }

  // Apply before first paint where possible, then again once the body exists.
  const initial = readTheme();
  document.documentElement.dataset.theme = initial;
  if (document.body) applyTheme(initial);

  function initialize() {
    applyTheme(readTheme());
    ["themeToggle", "settingsThemeToggle"].forEach(function (id) {
      const button = document.getElementById(id);
      if (button && button.dataset.pdfnestThemeBound !== "true") {
        button.dataset.pdfnestThemeBound = "true";
        button.addEventListener("click", toggleTheme);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }

  window.addEventListener("storage", function (event) {
    if (event.key === STORAGE_KEY) applyTheme(event.newValue === "dark" ? "dark" : "light");
    if (event.key === FONT_KEY) applyFont(readFont());
  });

  window.PDFnestFont = { get: readFont, set: setFont, apply: applyFont, default: FONT_DEFAULT };

  window.PDFnestTheme = {
    apply: applyTheme,
    set: setTheme,
    toggle: toggleTheme,
    current: function () { return document.body?.classList.contains("dark-theme") ? "dark" : "light"; }
  };
})();