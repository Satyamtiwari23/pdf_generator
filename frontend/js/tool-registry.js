/* ============================================================
   PDFnest — Tool registry (single source of truth)
   ------------------------------------------------------------
   Every tool declares what it ACCEPTS as { kind: [min, max] }.
   The dashboard (selected files) and the "Send to…" menu (a
   tool's output) both ask the same functions, so they always
   agree on which tools are relevant.

   kinds: pdf · image · docx · text
   ============================================================ */
(function () {
  "use strict";

  const INF = Infinity;

  const tools = [
    { id: "image_section/image-compressor.html",  name: "Image Compressor",     icon: "🗜️", category: "image",     desc: "Reduce image file size.",              accepts: { image: [1, INF] } },
    { id: "image_section/image-resizer.html",     name: "Image Resizer",        icon: "📐", category: "image",     desc: "Resize to exact dimensions.",          accepts: { image: [1, 1] } },
    { id: "image_section/image-to-text.html",     name: "Image to Text (OCR)",  icon: "🔍", category: "image",     desc: "Extract text from images.",            accepts: { image: [1, INF] } },
    { id: "image_section/remove-background.html", name: "Remove Background",    icon: "✂️", category: "image",     desc: "Remove an image background.",          accepts: { image: [1, 1] } },
    { id: "image_section/remove-watermark.html",  name: "Remove Watermark",     icon: "💧", category: "image",     desc: "Remove unwanted marks.",               accepts: { image: [1, 1] } },
    { id: "image_section/photo-editor.html",      name: "Photo Editor",         icon: "🎨", category: "image",     desc: "Edit, enhance or make a collage.",     accepts: { image: [1, INF] } },
    { id: "image_section/image-upscale.html",     name: "Image Upscale",        icon: "✨", category: "image",     desc: "Increase image dimensions.",           accepts: { image: [1, 1] } },
    { id: "image_section/image-converter.html",   name: "Image Type Converter", icon: "🔄", category: "converter", desc: "Convert image formats.",               accepts: { image: [1, 1] } },
    { id: "pdf_section/compress-pdf.html",        name: "Compress PDF",         icon: "🗜️", category: "pdf",       desc: "Reduce PDF file size.",                accepts: { pdf: [1, 1] } },
    { id: "pdf_section/edit-pdf.html",            name: "Edit PDF",             icon: "✏️", category: "pdf",       desc: "Add text and edits to PDF pages.",     accepts: { pdf: [1, 1] } },
    { id: "pdf_section/extract-images.html",      name: "Extract Images",       icon: "🖼️", category: "pdf",       desc: "Export PDF pages as images.",          accepts: { pdf: [1, 1] } },
    { id: "pdf_section/pdf-to-docx.html",         name: "PDF to DOCX",          icon: "📝", category: "converter", desc: "Convert PDF text into Word.",          accepts: { pdf: [1, 1] } },
    { id: "pdf_section/merge-pdf.html",           name: "Merge PDFs",           icon: "🔗", category: "pdf",       desc: "Combine multiple PDFs.",               accepts: { pdf: [1, INF] }, selectAccepts: { pdf: [2, INF] } },
    { id: "pdf_section/merge-pdf-images.html",    name: "Merge PDF + Images",   icon: "🧩", category: "pdf",       desc: "Combine one PDF with images.",         accepts: { pdf: [0, 1], image: [0, INF] }, selectAccepts: { pdf: [1, 1], image: [1, INF] } },
    { id: "pdf_section/images-to-pdf.html",       name: "Images to PDF",        icon: "📷", category: "converter", desc: "Turn images into one PDF.",            accepts: { image: [1, INF] } },
    { id: "pdf_section/word-to-pdf.html",         name: "Word to PDF",          icon: "📄", category: "converter", desc: "Convert a DOCX document to PDF.",      accepts: { docx: [1, 1] } },
    { id: "pdf_section/text-to-pdf.html",         name: "Text to PDF",          icon: "✍️", category: "converter", desc: "Create a PDF from text.",              accepts: { text: [1, 1] } },
    { id: "pdf_section/Chat-with-pdf.html",       name: "Chat with PDF",        icon: "💬", category: "pdf",       desc: "Ask questions, summarize, extract tables.", accepts: { pdf: [1, 1] } }
  ];

  /* ---------- file kind detection (File, Blob or {name,type}) ---------- */
  const IMAGE_EXT = new Set(["png", "jpg", "jpeg", "webp", "gif", "bmp", "avif", "heic", "heif", "ico"]);
  const TEXT_EXT = new Set(["txt", "md", "text"]);

  function kindOf(file, mimeHint) {
    const name = String((file && (file.name || file.fileName)) || "");
    const ext = (name.split(".").pop() || "").toLowerCase();
    const mime = String(mimeHint || (file && (file.type || file.mimeType)) || "").toLowerCase();
    if (mime === "application/pdf" || ext === "pdf") return "pdf";
    if (mime.startsWith("image/") || IMAGE_EXT.has(ext)) return "image";
    if (ext === "docx" || mime.includes("wordprocessingml")) return "docx";
    if (mime.startsWith("text/") || TEXT_EXT.has(ext)) return "text";
    return "other";
  }

  function countKinds(list) {
    const counts = {};
    list.forEach(k => { if (k && k !== "other") counts[k] = (counts[k] || 0) + 1; });
    return counts;
  }

  /* Does a tool accept exactly this mix of kinds?
     mode "select": files the person picked on the dashboard (stricter – e.g. Merge PDFs needs 2+ PDFs,
                    Merge PDF + Images needs a PDF AND images)
     default:       output sent from another tool (a lone PDF/image can be merged with more files there) */
  function fits(tool, counts, mode) {
    const rules = (mode === "select" && tool.selectAccepts) || tool.accepts;
    let total = 0;
    for (const kind in counts) {
      const rule = rules[kind];
      if (!rule || counts[kind] > rule[1]) return false;
      total += counts[kind];
    }
    for (const kind in rules) {
      if (rules[kind][0] > 0 && (counts[kind] || 0) < rules[kind][0]) return false;
    }
    return total > 0;
  }

  function forKinds(kinds, excludeId, mode) {
    const counts = countKinds(kinds);
    return tools.filter(t => t.id !== excludeId && fits(t, counts, mode));
  }

  /* outputs = [{ blob, fileName, mimeType }] */
  function forOutputs(outputs, excludeId) {
    return forKinds(outputs.map(o => kindOf({ name: o.fileName }, o.mimeType || (o.blob && o.blob.type))), excludeId);
  }

  /* Dashboard items = [{ file, info }] */
  function itemKind(item) {
    if (item.info && item.info.kind === "unsupported") return "other";
    return kindOf(item.file, item.file && item.file.type);
  }

  function describe(tool) {
    return Object.assign({}, tool, {
      types: Object.keys(tool.accepts),
      multi: Object.keys(tool.accepts).some(k => tool.accepts[k][1] > 1)
    });
  }

  window.PDFnestToolRegistry = {
    getAll: () => tools.map(describe),
    getPopular: () => [tools[8], tools[12], tools[1], tools[7], tools[14], tools[2]].map(describe),
    getById: id => { const t = tools.find(x => x.id === id); return t ? describe(t) : undefined; },
    getRelevant: items => forKinds(items.map(itemKind), null, "select").map(describe),
    itemKind,
    pick: (tool, items) => items.filter(item => !!tool.accepts[itemKind(item)]),
    kindOf,
    forKinds: (k, ex) => forKinds(k, ex).map(describe),
    forOutputs: (o, ex) => forOutputs(o, ex).map(describe)
  };
})();