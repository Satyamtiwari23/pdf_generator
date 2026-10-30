PDFnest upload and All Tools fix

Replace these files in your existing frontend project:
- index.html                 -> frontend/index.html
- workspace.css              -> frontend/workspace.css
- theme.js                   -> frontend/theme.js
- js/workspace.js            -> frontend/js/workspace.js
- js/file-detector.js        -> frontend/js/file-detector.js
- js/tool-registry.js        -> frontend/js/tool-registry.js

Keep your existing tool HTML files and their folders (pdf_section/, image_section/, etc.).
Do not delete those folders.

After replacement, commit and push from the project root:
git add .
git commit -m "Fix PDFnest file upload and tools catalog"
git push origin main

Then hard refresh the deployed site with Cmd + Shift + R.
