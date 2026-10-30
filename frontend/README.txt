PDFnest fixes:
- Removed the pencil/edit icon overlay from the profile avatar.
- Fixed Logout: no longer calls an undefined closeAccountMenu() function; clears local session and redirects to login.html.
- Help & Support: shows a toast saying "Visit the Contact section of our website", waits 1 second, then opens the Portfolio homepage.

Replace:
index.html -> frontend/index.html
workspace.css -> frontend/workspace.css
workspace.js -> frontend/js/workspace.js
theme.js -> frontend/theme.js
