(function () {
  "use strict";
  const EXT = name => (String(name || "").split(".").pop() || "").toLowerCase();
  const IMAGE_EXT = new Set(["png","jpg","jpeg","webp","gif","bmp","avif","heic","heif"]);
  const DOC_EXT = new Set(["docx","doc","txt","rtf","odt"]);
  async function detect(file) {
    const ext = EXT(file.name);
    const mime = (file.type || "").toLowerCase();
    if (mime === "application/pdf" || ext === "pdf") {
      const head = new Uint8Array(await file.slice(0,5).arrayBuffer());
      if (new TextDecoder().decode(head) !== "%PDF-") return {kind:"unsupported",label:"Invalid PDF",mime};
      return {kind:"pdf",label:"PDF",mime:"application/pdf"};
    }
    if (mime.startsWith("image/") || IMAGE_EXT.has(ext)) return {kind:"image",label:"Image",mime:mime || `image/${ext}`};
    if (DOC_EXT.has(ext) || mime.includes("word") || mime.startsWith("text/")) return {kind:"document",label:"Document",mime};
    return {kind:"unsupported",label:"Other file",mime};
  }
  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} KB`;
    if (bytes < 1024*1024*1024) return `${(bytes/1024/1024).toFixed(2)} MB`;
    return `${(bytes/1024/1024/1024).toFixed(2)} GB`;
  }
  window.PDFnestFileDetector = {detect,formatBytes};
})();