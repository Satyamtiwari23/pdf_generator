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

  /* ---------- collapsible sidebar (laptop / desktop) ---------- */
  const SIDEBAR_KEY = "pdfnest-sidebar";
  function readSidebarCollapsed() {
    try { return localStorage.getItem(SIDEBAR_KEY) === "collapsed"; } catch (_) { return false; }
  }
  function syncSidebarButton() {
    const btn = document.getElementById("sidebarCollapseBtn");
    if (!btn) return;
    const collapsed = document.documentElement.classList.contains("sidebar-collapsed");
    btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
    btn.setAttribute("aria-label", collapsed ? "Show sidebar" : "Hide sidebar");
    btn.setAttribute("title", collapsed ? "Show sidebar" : "Hide sidebar");
  }
  function setSidebarCollapsed(collapsed) {
    document.documentElement.classList.toggle("sidebar-collapsed", !!collapsed);
    try { localStorage.setItem(SIDEBAR_KEY, collapsed ? "collapsed" : "open"); } catch (_) { }
    syncSidebarButton();
  }
  function initSidebarToggle() {
    const bar = document.querySelector(".workspace-topbar");
    if (!bar || document.getElementById("sidebarCollapseBtn")) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "sidebarCollapseBtn";
    btn.className = "topbar-icon sidebar-collapse-btn";
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/></svg>';
    btn.addEventListener("click", function () {
      setSidebarCollapsed(!document.documentElement.classList.contains("sidebar-collapsed"));
    });
    const mobileBtn = bar.querySelector(".mobile-menu-btn");
    if (mobileBtn) mobileBtn.after(btn); else bar.insertBefore(btn, bar.firstChild);
    syncSidebarButton();
  }
  if (readSidebarCollapsed()) document.documentElement.classList.add("sidebar-collapsed");

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
    initSidebarToggle();
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
    if (event.key === SIDEBAR_KEY) { document.documentElement.classList.toggle("sidebar-collapsed", readSidebarCollapsed()); syncSidebarButton(); }
  });

  window.PDFnestSidebar = { collapse: () => setSidebarCollapsed(true), expand: () => setSidebarCollapsed(false), toggle: () => setSidebarCollapsed(!document.documentElement.classList.contains("sidebar-collapsed")) };
  window.PDFnestFont = { get: readFont, set: setFont, apply: applyFont, default: FONT_DEFAULT };

  window.PDFnestTheme = {
    apply: applyTheme,
    set: setTheme,
    toggle: toggleTheme,
    current: function () { return document.body?.classList.contains("dark-theme") ? "dark" : "light"; }
  };
})();