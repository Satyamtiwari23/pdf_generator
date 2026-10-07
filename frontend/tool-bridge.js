/* ============================================================
   PDFnest — Cross-tool file handoff bridge
   ============================================================
   Lets any tool send its output directly to another tool
   without downloading. Uses IndexedDB for storage and
   sessionStorage for coordination.
   ============================================================ */

(function () {
    'use strict';

    const DB_NAME = 'pdfnest-bridge';
    const STORE = 'pending';
    const FLAG_PREFIX = 'pdfnest-incoming-';
    const CURRENT_TOOL_KEY = 'pdfnest-current-tool';

    /* ---------- IndexedDB helpers ---------- */
    function openDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => {
                if (!req.result.objectStoreNames.contains(STORE)) {
                    req.result.createObjectStore(STORE, { keyPath: 'id' });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function dbPut(entry) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put(entry);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async function dbGet(id) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).get(id);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    }

    async function dbDel(id) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    /* ---------- Detect current tool from URL ---------- */
    function getCurrentToolId() {
        const path = window.location.pathname;
        const m = path.match(/(image_section|pdf_section|converter_section)\/([^/?#]+\.html)/);
        if (m) return m[1] + '/' + m[2];
        return (path.split('/').pop() || 'index.html');
    }

    const TOOLS = {

        image: [
            {
                id: 'image_section/image-compressor.html',
                icon: '🗜️',
                name: 'Compress image',
                desc: 'Reduce file size'
            },

            {
                id: 'image_section/remove-background.html',
                icon: '✂️',
                name: 'Remove background',
                desc: 'AI subject cutout'
            },

            {
                id: 'image_section/remove-watermark.html',
                icon: '💧',
                name: 'Remove watermark',
                desc: 'Inpaint and clean'
            },

            {
                id: 'image_section/image-upscale.html',
                icon: '✨',
                name: 'Upscale image',
                desc: 'Enlarge to 4K/8K'
            },

            {
                id: 'image_section/image-converter.html',
                icon: '🔄',
                name: 'Convert image',
                desc: 'Change format'
            },

            {
                id: 'pdf_section/images-to-pdf.html',
                icon: '🖼️',
                name: 'Images → PDF',
                desc: 'Build a PDF'
            },

            {
                id: 'pdf_section/merge-pdf-images.html',
                icon: '🧩',
                name: 'Merge with PDF',
                desc: 'Insert into a PDF'
            }
        ],

        pdf: [
            {
                id: 'pdf_section/merge-pdf.html',
                icon: '🔗',
                name: 'Merge PDFs',
                desc: 'Combine PDFs'
            },

            {
                id: 'pdf_section/merge-pdf-images.html',
                icon: '🧩',
                name: 'Merge PDF + images',
                desc: 'Add images to a PDF'
            },

            {
                id: 'pdf_section/compress-pdf.html',
                icon: '🗜️',
                name: 'Compress PDF',
                desc: 'Reduce PDF size'
            },

            {
                id: 'pdf_section/edit-pdf.html',
                icon: '✏️',
                name: 'Edit PDF',
                desc: 'Text, images, shapes'
            },

            {
                id: 'pdf_section/extract-images.html',
                icon: '🖼️',
                name: 'Extract images',
                desc: 'Save pages as images'
            }
        ]

    };

    /* ============================================================
       PUBLIC API
       ============================================================ */
    const bridge = {
        /* -- Send a file to another tool and redirect -- */
        async sendToTool(targetToolId, blob, fileName, mimeType) {
            if (!blob) throw new Error('Nothing to send');

            const id = 'pending-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

            try {
                await dbPut({
                    id,
                    blob,
                    fileName: fileName || 'file',
                    mimeType: mimeType || blob.type || 'application/octet-stream',
                    createdAt: Date.now()
                });
            } catch (err) {
                console.error('Bridge: failed to store file', err);
                throw new Error('Could not prepare file for transfer');
            }

            // Flag for the destination
            sessionStorage.setItem(FLAG_PREFIX + targetToolId, id);

            // Redirect
            const isSubfolder = /\/(image_section|pdf_section|converter_section)\//.test(window.location.pathname);
            const prefix = isSubfolder ? '../' : '';
            window.location.href = prefix + targetToolId;
        },

        /* -- Check for an incoming file on this tool -- */
        async consumeIncoming() {
            const toolId = getCurrentToolId();
            const id = sessionStorage.getItem(FLAG_PREFIX + toolId);
            if (!id) return null;

            sessionStorage.removeItem(FLAG_PREFIX + toolId);

            let entry = null;
            try {
                entry = await dbGet(id);
            } catch (err) {
                console.error('Bridge: read failed', err);
            }

            // Always clean up
            dbDel(id).catch(() => { });

            if (!entry) return null;

            return {
                blob: entry.blob,
                fileName: entry.fileName,
                mimeType: entry.mimeType
            };
        },

        /* -- List tools that can receive a given output type -- */
        listTargets(outputType) {
            return (TOOLS[outputType] || []).filter(t => t.id !== getCurrentToolId());
        },

        /* -- Read user avatar / initial for the menu header -- */
        getCurrentToolId,

        /* ============================================================
           UI: inject a "Send to..." button into a footer container
           ============================================================ */
        injectSendToButton(footerEl, getOutput) {
            if (!footerEl || footerEl.querySelector('.send-to-wrap')) return;

            const wrap = document.createElement('div');
            wrap.className = 'send-to-wrap';

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-ghost send-to-btn';
            btn.innerHTML = '<span>📤</span> Send to…';
            wrap.appendChild(btn);

            const menu = document.createElement('div');
            menu.className = 'send-to-menu';
            wrap.appendChild(menu);

            btn.addEventListener('click', async (e) => {
                e.stopPropagation();

                const output = await Promise.resolve(getOutput());
                if (!output || !output.blob) {
                    btn.textContent = '⚠ Nothing to send';
                    setTimeout(() => { btn.innerHTML = '<span>📤</span> Send to…'; }, 1600);
                    return;
                }

                // Decide category from mime type
                const type = (output.mimeType || output.blob.type || '').toLowerCase();
                const cat = type.startsWith('image/') ? 'image' : 'pdf';
                const targets = bridge.listTargets(cat);

                menu.innerHTML = '';
                const header = document.createElement('div');
                header.className = 'send-to-head';
                header.innerHTML =
                    '<span class="send-to-head-icon">' + (cat === 'image' ? '🖼️' : '📕') + '</span>' +
                    '<span><strong>Send this ' + (cat === 'image' ? 'image' : 'PDF') + ' to…</strong>' +
                    '<small>' + (output.fileName || output.blob.type) + '</small></span>';
                menu.appendChild(header);

                if (!targets.length) {
                    const empty = document.createElement('div');
                    empty.className = 'send-to-empty';
                    empty.textContent = 'No other tools available.';
                    menu.appendChild(empty);
                } else {
                    targets.forEach(t => {
                        const item = document.createElement('button');
                        item.type = 'button';
                        item.className = 'send-to-item';
                        item.innerHTML =
                            '<span class="send-to-icon">' + t.icon + '</span>' +
                            '<span class="send-to-info">' +
                            '<span class="send-to-name">' + t.name + '</span>' +
                            '<span class="send-to-desc">' + t.desc + '</span>' +
                            '</span>' +
                            '<span class="send-to-arrow">→</span>';
                        item.addEventListener('click', async (ev) => {
                            ev.stopPropagation();
                            menu.classList.remove('show');
                            btn.innerHTML = '<span>🚀</span> Sending…';
                            try {
                                await bridge.sendToTool(t.id, output.blob, output.fileName, output.mimeType);
                            } catch (err) {
                                console.error(err);
                                btn.innerHTML = '<span>⚠</span> ' + err.message;
                                setTimeout(() => { btn.innerHTML = '<span>📤</span> Send to…'; }, 2200);
                            }
                        });
                        menu.appendChild(item);
                    });
                }

                menu.classList.toggle('show');
            });

            // Close on outside click
            document.addEventListener('click', (e) => {
                if (!wrap.contains(e.target)) menu.classList.remove('show');
            });

            footerEl.insertBefore(wrap, footerEl.firstChild);
        }
    };

    window.ToolBridge = bridge;
})();