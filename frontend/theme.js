(function () {
  "use strict";

  const STORAGE_KEY = "pdfnest-theme";
  const DEFAULT_THEME = "light";

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
  });

  window.PDFnestTheme = {
    apply: applyTheme,
    set: setTheme,
    toggle: toggleTheme,
    current: function () { return document.body?.classList.contains("dark-theme") ? "dark" : "light"; }
  };
})();