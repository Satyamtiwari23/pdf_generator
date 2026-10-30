(function () {
  "use strict";
  const tools = [
    {id:"image_section/image-compressor.html",name:"Image Compressor",icon:"🗜️",category:"image",desc:"Reduce image file size.",types:["image"],multi:false},
    {id:"image_section/image-resizer.html",name:"Image Resizer",icon:"📐",category:"image",desc:"Resize to exact dimensions.",types:["image"],multi:false},
    {id:"image_section/image-to-text.html",name:"Image to Text (OCR)",icon:"🔍",category:"image",desc:"Extract text from images.",types:["image"],multi:false},
    {id:"image_section/remove-background.html",name:"Remove Background",icon:"✂️",category:"image",desc:"Remove an image background.",types:["image"],multi:false},
    {id:"image_section/remove-watermark.html",name:"Remove Watermark",icon:"💧",category:"image",desc:"Remove unwanted marks.",types:["image"],multi:false},
    {id:"image_section/photo-editor.html",name:"Photo Editor",icon:"🎨",category:"image",desc:"Edit and enhance photos.",types:["image"],multi:false},
    {id:"image_section/image-upscale.html",name:"Image Upscale",icon:"✨",category:"image",desc:"Increase image dimensions.",types:["image"],multi:false},
    {id:"image_section/image-converter.html",name:"Image Type Converter",icon:"🔄",category:"converter",desc:"Convert image formats.",types:["image"],multi:false},
    {id:"pdf_section/compress-pdf.html",name:"Compress PDF",icon:"🗜️",category:"pdf",desc:"Reduce PDF file size.",types:["pdf"],multi:false},
    {id:"pdf_section/edit-pdf.html",name:"Edit PDF",icon:"✏️",category:"pdf",desc:"Add text and edits to PDF pages.",types:["pdf"],multi:false},
    {id:"pdf_section/extract-images.html",name:"Extract Images",icon:"🖼️",category:"pdf",desc:"Export PDF pages as images.",types:["pdf"],multi:false},
    {id:"pdf_section/pdf-to-docx.html",name:"PDF to DOCX",icon:"📝",category:"converter",desc:"Convert PDF text into Word.",types:["pdf"],multi:false},
    {id:"pdf_section/merge-pdf.html",name:"Merge PDFs",icon:"🔗",category:"pdf",desc:"Combine multiple PDFs.",types:["pdf"],multi:true,requires:"2+pdf"},
    {id:"pdf_section/merge-pdf-images.html",name:"Merge PDF + Images",icon:"🧩",category:"pdf",desc:"Combine one PDF with multiple images.",types:["pdf","image"],multi:true,requires:"pdf+images"},
    {id:"pdf_section/images-to-pdf.html",name:"Images to PDF",icon:"📷",category:"converter",desc:"Turn multiple images into one PDF.",types:["image"],multi:true,requires:"2+images"},
    {id:"pdf_section/word-to-pdf.html",name:"Word to PDF",icon:"📄",category:"converter",desc:"Convert DOCX documents to PDF.",types:["document"],multi:false},
    {id:"pdf_section/text-to-pdf.html",name:"Text to PDF",icon:"✍️",category:"converter",desc:"Create a PDF from text.",types:["document"],multi:false}
  ];
  window.PDFnestToolRegistry = {
    getAll: () => tools.slice(),
    getPopular: () => [tools[8],tools[12],tools[1],tools[7],tools[14],tools[2]],
    getById: id => tools.find(t=>t.id===id),
    getRelevant: items => {
      const pdfs=items.filter(x=>x.info.kind==="pdf"), images=items.filter(x=>x.info.kind==="image"), docs=items.filter(x=>x.info.kind==="document");
      if (items.length===1) return tools.filter(t=>!t.requires && t.types.includes(items[0].info.kind));
      const result=[];
      if (pdfs.length>=2 && pdfs.length===items.length) result.push(tools.find(t=>t.id==="pdf_section/merge-pdf.html"));
      if (images.length>=2 && images.length===items.length) result.push(tools.find(t=>t.id==="pdf_section/images-to-pdf.html"));
      if (pdfs.length===1 && images.length>=1 && pdfs.length+images.length===items.length) result.push(tools.find(t=>t.id==="pdf_section/merge-pdf-images.html"));
      if (docs.length===1 && items.length===1) result.push(tools.find(t=>t.id==="pdf_section/word-to-pdf.html"));
      return result.filter(Boolean);
    }
  };
})();