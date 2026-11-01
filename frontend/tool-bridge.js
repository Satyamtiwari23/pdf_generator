/* ============================================================
   PDFnest — Cross-tool file handoff bridge
   ------------------------------------------------------------
   • sendFilesToTool()   – hand one or many files to another tool
   • consumeIncomingFiles() – receive them on the destination page
   • injectSendToButton()   – "Send to…" menu that lists ONLY the
     tools able to accept the actual output (type + count),
     using js/tool-registry.js
   Files travel through IndexedDB; sessionStorage holds a flag.
   ============================================================ */
(function () {
  'use strict';

  const DB_NAME = 'pdfnest-bridge';
  const STORE = 'pending';
  const FLAG_PREFIX = 'pdfnest-incoming-';

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
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
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

  /* ---------- current tool id, e.g. "pdf_section/merge-pdf.html" ---------- */
  const SECTION_RE = /(image_section|pdf_section|converter_section)\/([^/?#]+\.html)/;
  function getCurrentToolId() {
    const m = window.location.pathname.match(SECTION_RE);
    if (m) return m[1] + '/' + m[2];
    return window.location.pathname.split('/').pop() || 'index.html';
  }
  function pathPrefix() {
    return /\/(image_section|pdf_section|converter_section)\//.test(window.location.pathname) ? '../' : '';
  }
  const registry = () => window.PDFnestToolRegistry || null;

  /* ---------- normalise anything a tool returns into [{blob,fileName,mimeType}] ---------- */
  function normalise(out) {
    if (!out) return [];
    const list = Array.isArray(out) ? out : (out.files ? out.files : [out]);
    return list
      .filter(x => x && x.blob)
      .map(x => ({
        blob: x.blob,
        fileName: x.fileName || x.blob.name || 'file',
        mimeType: x.mimeType || x.blob.type || 'application/octet-stream'
      }));
  }

  /* ============================================================
     RECEIVING
     consumeIncoming() is memoised: the first call reads and clears
     the hand-off, later calls on the same page get the same data.
     (Pages used to call it twice – the 2nd call saw nothing.)
     ============================================================ */
  let incomingPromise = null;

  function consumeIncoming() {
    if (incomingPromise) return incomingPromise;
    incomingPromise = (async () => {
      const toolId = getCurrentToolId();
      const id = sessionStorage.getItem(FLAG_PREFIX + toolId);
      if (!id) return null;
      sessionStorage.removeItem(FLAG_PREFIX + toolId);

      let entry = null;
      try { entry = await dbGet(id); } catch (err) { console.error('Bridge: read failed', err); }
      dbDel(id).catch(() => { });
      if (!entry) return null;

      const files = entry.files || [{ blob: entry.blob, fileName: entry.fileName, mimeType: entry.mimeType }];
      const first = files[0] || {};
      return {
        blob: first.blob, fileName: first.fileName, mimeType: first.mimeType,
        files
      };
    })();
    return incomingPromise;
  }

  /* All received files as real File objects (empty array if nothing was sent) */
  async function consumeIncomingFiles() {
    const incoming = await consumeIncoming();
    if (!incoming) return [];
    return normalise(incoming.files).map(f => new File([f.blob], f.fileName, { type: f.mimeType }));
  }

  /* ============================================================
     SENDING
     ============================================================ */
  async function sendFilesToTool(targetToolId, files) {
    const batch = normalise(files);
    if (!batch.length) throw new Error('Nothing to send');

    const id = 'pending-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    try {
      await dbPut({ id, files: batch, createdAt: Date.now() });
    } catch (err) {
      console.error('Bridge: failed to store files', err);
      throw new Error('Could not prepare files for transfer');
    }
    sessionStorage.setItem(FLAG_PREFIX + targetToolId, id);
    window.location.href = pathPrefix() + targetToolId;
  }

  function sendToTool(targetToolId, blob, fileName, mimeType) {
    return sendFilesToTool(targetToolId, [{ blob, fileName, mimeType }]);
  }

  /* ============================================================
     "SEND TO…" MENU
     ============================================================ */
  const NOUN = {
    pdf: ['PDF', 'PDFs', '📕'], image: ['image', 'images', '🖼️'],
    docx: ['Word file', 'Word files', '📄'], text: ['text file', 'text files', '📝']
  };

  let pop = null;
  function closePop() {
    if (!pop) return;
    pop.remove(); pop = null;
    document.removeEventListener('click', onDocClick, true);
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', closePop);
    window.removeEventListener('scroll', onScroll, true);
  }
  function onDocClick(e) { if (pop && !pop.contains(e.target) && !(pop._anchor && pop._anchor.contains(e.target))) closePop(); }
  function onKey(e) { if (e.key === 'Escape') closePop(); }
  function onScroll(e) { if (pop && !pop.contains(e.target)) closePop(); }

  function openPop(anchor, outs, onSending) {
    closePop();
    const reg = registry();
    const kinds = outs.map(o => reg ? reg.kindOf({ name: o.fileName }, o.mimeType) : 'other');
    const kind = kinds.every(k => k === kinds[0]) ? kinds[0] : null;
    const noun = NOUN[kind] || ['file', 'files', '📁'];
    const many = outs.length > 1;
    const targets = reg ? reg.forOutputs(outs, getCurrentToolId()) : [];

    pop = document.createElement('div');
    pop.className = 'send-to-pop';
    pop.setAttribute('role', 'menu');
    pop._anchor = anchor;

    const head = document.createElement('div');
    head.className = 'send-to-head';
    head.innerHTML =
      '<span class="send-to-head-icon">' + noun[2] + '</span>' +
      '<span><strong></strong><small></small></span>';
    head.querySelector('strong').textContent = many
      ? 'Send all ' + outs.length + ' ' + noun[1] + ' to…'
      : 'Send this ' + noun[0] + ' to…';
    head.querySelector('small').textContent = many ? 'Only tools that accept ' + outs.length + ' files are shown' : outs[0].fileName;
    pop.appendChild(head);

    if (!targets.length) {
      const empty = document.createElement('div');
      empty.className = 'send-to-empty';
      empty.textContent = many ? 'No tool accepts this many files together.' : 'No other tool accepts this file.';
      pop.appendChild(empty);
    }
    targets.forEach(t => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'send-to-item';
      item.setAttribute('role', 'menuitem');
      item.innerHTML =
        '<span class="send-to-icon"></span>' +
        '<span class="send-to-info"><span class="send-to-name"></span><span class="send-to-desc"></span></span>' +
        '<span class="send-to-arrow">→</span>';
      item.querySelector('.send-to-icon').textContent = t.icon;
      item.querySelector('.send-to-name').textContent = t.name;
      item.querySelector('.send-to-desc').textContent = t.desc;
      item.addEventListener('click', async ev => {
        ev.stopPropagation();
        closePop();
        if (onSending) onSending(true);
        try {
          await sendFilesToTool(t.id, outs);
        } catch (err) {
          console.error(err);
          if (onSending) onSending(false, err.message);
        }
      });
      pop.appendChild(item);
    });

    document.body.appendChild(pop);

    /* position under the button (or above if there is no room) */
    const r = anchor.getBoundingClientRect();
    const w = pop.offsetWidth, h = pop.offsetHeight;
    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    let left = Math.min(Math.max(8, r.left), Math.max(8, vw - w - 8));
    let top = r.bottom + 8;
    if (top + h > vh - 8 && r.top - h - 8 > 8) top = r.top - h - 8;
    top = Math.max(8, Math.min(top, vh - h - 8));
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';

    setTimeout(() => {
      document.addEventListener('click', onDocClick, true);
      document.addEventListener('keydown', onKey, true);
      window.addEventListener('resize', closePop);
      window.addEventListener('scroll', onScroll, true);
    }, 0);
  }

  /* A standalone button. getOutput may return one output, {files:[…]}, an array, or a Promise of those. */
  function createSendButton(getOutput, opts) {
    opts = opts || {};
    const idleHTML = opts.html || '<span>📤</span> ' + (opts.label || 'Send to…');

    const wrap = document.createElement('div');
    wrap.className = 'send-to-wrap' + (opts.compact ? ' send-to-compact' : '');
    wrap.dataset.key = opts.key || 'default';
    wrap._getOutput = getOutput;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-ghost send-to-btn';
    btn.innerHTML = idleHTML;
    wrap.appendChild(btn);

    const reset = (ms) => setTimeout(() => { btn.innerHTML = idleHTML; btn.disabled = false; }, ms || 0);
    const status = (sending, msg) => {
      if (sending) { btn.disabled = true; btn.innerHTML = '<span>🚀</span> Sending…'; }
      else { btn.disabled = false; btn.innerHTML = '<span>⚠</span> ' + (msg || 'Could not send'); reset(2200); }
    };

    btn.addEventListener('click', async e => {
      e.stopPropagation();
      if (pop && pop._anchor === btn) { closePop(); return; }
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span> Preparing…';
      let outs = [];
      try { outs = normalise(await Promise.resolve(wrap._getOutput())); }
      catch (err) { console.error('Bridge: could not build output', err); }
      btn.disabled = false;
      btn.innerHTML = idleHTML;
      if (!outs.length) {
        btn.innerHTML = '<span>⚠</span> Nothing to send';
        reset(1600);
        return;
      }
      openPop(btn, outs, status);
    });

    return wrap;
  }

  /* Put a Send-to button into a container. Calling it again for the same container
     just refreshes what the button will send (no stale results, no duplicates). */
  function injectSendToButton(containerEl, getOutput, opts) {
    if (!containerEl) return null;
    opts = opts || {};
    const key = opts.key || 'default';
    const existing = Array.from(containerEl.children).find(el => el.classList && el.classList.contains('send-to-wrap') && el.dataset.key === key);
    if (existing) { existing._getOutput = getOutput; return existing; }
    const wrap = createSendButton(getOutput, opts);
    if (opts.position === 'end') containerEl.appendChild(wrap);
    else containerEl.insertBefore(wrap, containerEl.firstChild);
    return wrap;
  }

  /* helpers pages can use */
  function dataUrlToBlob(dataUrl) {
    const [meta, b64] = String(dataUrl).split(',');
    const mime = (meta.match(/data:([^;]+)/) || [])[1] || 'application/octet-stream';
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  window.ToolBridge = {
    sendToTool,
    sendFilesToTool,
    consumeIncoming,
    consumeIncomingFiles,
    injectSendToButton,
    createSendButton,
    dataUrlToBlob,
    getCurrentToolId,
    listTargets: (outputType) => {
      const reg = registry();
      if (!reg) return [];
      const k = outputType === 'text' ? 'text' : outputType;
      return reg.forKinds([k], getCurrentToolId());
    }
  };
})();