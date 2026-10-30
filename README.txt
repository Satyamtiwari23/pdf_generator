PDFnest — focused UI and theme patch
====================================

WHAT CHANGED
- The account dropdown is attached to the sidebar account/status row and opens upward.
- The sidebar account row now displays the signed-in user's name and email.
- The existing account dropdown retains profile photo, change/delete photo, profile settings and logout controls.
- The top-right workspace control is the light/dark theme toggle (no top-right account dropdown).
- Dashboard greeting now uses the local time and the signed-in user's first name:
  Good morning / Good afternoon / Good evening.
- The date beside the greeting is populated automatically.
- One shared theme.js persists the preference in localStorage and applies it on the dashboard,
  authentication pages and all 17 PDF/image tools. Browser tabs synchronize through storage events.
- Existing tool implementations and their processing logic are preserved.

FILES
- index.html, workspace.css, style.css, theme.js
- auth-guard.js, tool-bridge.js, js/ support scripts
- image_section/ (8 tool pages)
- pdf_section/ (9 tool pages)
- login/signup/forgot/reset password pages (included unchanged except shared theme include)
- preview.html is a standalone demo-account preview of the updated dashboard.

PREVIEW
Open preview.html through a local static server from this folder, for example:
  python3 -m http.server 8000
Then visit http://localhost:8000/preview.html

INTEGRATION
This is a frontend patch only. Keep your existing backend and environment configuration.
Copy/merge the included files into the corresponding locations in your project. Do not replace
server.js, package files, deployment configuration, or environment variables.
