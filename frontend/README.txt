PDFnest account menu + Help & Support fix (v2)

Replace in your frontend project:
- index.html -> frontend/index.html
- workspace.css -> frontend/workspace.css
- workspace.js -> frontend/js/workspace.js (use the existing workspace.js supplied in this folder if present; this package does not alter its logic)
- theme.js -> frontend/theme.js

What this fixes:
1. Removes the old hard-coded left:12px / bottom:88px menu position that kept placing the menu over the cursor.
2. Positions the menu using the actual sidebar account button coordinates, preferring the free area to the right.
3. Settings -> Open profile menu opens the same menu and is excluded from outside-click closing.
4. Help & Support opens the portfolio homepage in a new tab, waits briefly, then navigates to #contact.

Note: Smooth animated scrolling at the destination depends on the portfolio site's own CSS/JS. The staged homepage-then-contact navigation is implemented here. If the second navigation jumps instantly, share the Portfolio index.html/CSS and I can add native smooth scrolling there.
