(function () {
  "use strict";
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const state={files:[],view:"dashboard",filter:"all",search:"",history:[],favorites:[]};
  const input=$("#workspaceFileInput"), drop=$("#workspaceDropzone"), selected=$("#selectedFilesPanel");
  const status=$("#workspaceStatus");
  if (!input || !drop || !selected || !status) {
    console.error("[PDFnest] Upload UI is incomplete.", {input:!!input, drop:!!drop, selected:!!selected, status:!!status});
    return;
  }
  if (!window.PDFnestToolRegistry || !window.PDFnestFileDetector) {
    console.error("[PDFnest] Required tool scripts did not load.", {
      registry:!!window.PDFnestToolRegistry, detector:!!window.PDFnestFileDetector
    });
    return;
  }
  const user=(()=>{try{return JSON.parse(localStorage.getItem("user")||"{}")}catch{return {}}})();
  const userKey=String(user._id||user.id||user.email||"guest").toLowerCase().replace(/[^a-z0-9_-]/g,"_");
  const HISTORY_KEY=`pdfnest:activity:${userKey}`, FAV_KEY=`pdfnest:favorites:${userKey}`;
  const MAX_HISTORY=50, RETENTION_DAYS=30;

  function safe(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function setStatus(msg,error=false){status.textContent=msg||"";status.classList.toggle("is-error",error);}
  function readList(key){try{return JSON.parse(localStorage.getItem(key)||"[]")}catch{return []}}
  function persistHistory(){localStorage.setItem(HISTORY_KEY,JSON.stringify(state.history.slice(0,MAX_HISTORY)));}
  function loadHistory(){const cutoff=Date.now()-RETENTION_DAYS*86400000;state.history=readList(HISTORY_KEY).filter(x=>x.at>=cutoff).slice(0,MAX_HISTORY);persistHistory();}
  function fmtDate(ts){return new Date(ts).toLocaleString([], {month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});}
  function addActivity(tool,files){
    const record={id:`${Date.now()}-${Math.random().toString(36).slice(2,7)}`,tool:tool.name,toolId:tool.id,files:files.map(f=>({name:f.file.name,kind:f.info.label,size:f.file.size})),at:Date.now(),status:"Opened"};
    state.history.unshift(record);state.history=state.history.slice(0,MAX_HISTORY);persistHistory();renderHistory();
  }
  function setView(view){
    state.view=view;
    $$(".app-view").forEach(el=>el.classList.toggle("active",el.dataset.viewPanel===view));
    $$(".sidebar-link[data-view]").forEach(el=>el.classList.toggle("active",el.dataset.view===view));
    $("#viewBreadcrumb").textContent=({dashboard:"Dashboard","all-tools":"All Tools",recent:"Recent Files",favorites:"Favorites",settings:"Settings"})[view]||"Dashboard";
    if(view==="recent")renderHistory(); if(view==="favorites")renderFavorites(); if(view==="all-tools")renderAllTools();
    $("#appSidebar").classList.remove("mobile-open");
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function addToolCard(tool,container,showFavorite=true){
    const card=document.createElement("div");card.className="tool-library-card";
    const isFav=state.favorites.includes(tool.id);
    card.innerHTML=`<a class="tool-card-main" href="${tool.id}"><span class="tool-card-icon">${tool.icon}</span><span class="tool-card-copy"><strong>${safe(tool.name)}</strong><small>${safe(tool.desc)}</small></span><span class="tool-card-arrow">↗</span></a>${showFavorite?`<button class="favorite-toggle ${isFav?"is-favorite":""}" type="button" aria-label="${isFav?"Remove from":"Add to"} favorites">${isFav?"★":"☆"}</button>`:""}`;
    const fav=card.querySelector(".favorite-toggle");
    if(fav)fav.addEventListener("click",()=>{state.favorites=state.favorites.includes(tool.id)?state.favorites.filter(x=>x!==tool.id):[...state.favorites,tool.id];localStorage.setItem(FAV_KEY,JSON.stringify(state.favorites));renderAllTools();renderFavorites();renderPopular();});
    const link=card.querySelector("a");
    link.addEventListener("click",()=>addActivity(tool,[]));
    container.appendChild(card);
  }
  function renderPopular(){const c=$("#popularTools");if(!c)return;c.innerHTML="";window.PDFnestToolRegistry.getPopular().forEach(t=>addToolCard(t,c,false));}
  function renderAllTools(){
    const c=$("#allToolsGrid");if(!c)return;c.innerHTML="";
    window.PDFnestToolRegistry.getAll().filter(t=>(state.filter==="all"||t.category===state.filter)&&(!state.search||`${t.name} ${t.desc}`.toLowerCase().includes(state.search))).forEach(t=>addToolCard(t,c));
    $("#catalogEmpty").hidden=!!c.children.length;
  }
  function renderFavorites(){
    const c=$("#favoritesGrid");if(!c)return;c.innerHTML="";
    window.PDFnestToolRegistry.getAll().filter(t=>state.favorites.includes(t.id)).forEach(t=>addToolCard(t,c,false));
    $("#favoritesEmpty").hidden=!!c.children.length;
  }
  function renderHistory(){
    const html=state.history.map(item=>`<div class="history-row"><div class="history-file-icon">◷</div><div class="history-row-main"><strong>${safe(item.tool)}</strong><small>${item.files.length?item.files.map(f=>safe(f.name)).join(", "):"Tool opened directly"} · ${fmtDate(item.at)}</small></div><span class="history-status">${safe(item.status)}</span><a href="${item.toolId}" aria-label="Open tool">↗</a></div>`).join("");
    $("#fullHistoryList").innerHTML=html;$("#dashboardRecent").innerHTML=state.history.slice(0,4).map(item=>`<div class="mini-history-row"><span>◷</span><div><strong>${safe(item.tool)}</strong><small>${fmtDate(item.at)}</small></div></div>`).join("")||'<p class="muted-copy">Your activity will appear here.</p>';
    $("#historyCount").textContent=`${state.history.length} activities`;$("#historyEmpty").hidden=state.history.length>0;
  }
  function addFiles(list){
    const existing=new Set(state.files.map(x=>`${x.file.name}:${x.file.size}:${x.file.lastModified}`));
    Array.from(list).forEach(file=>{const key=`${file.name}:${file.size}:${file.lastModified}`;if(!existing.has(key)){state.files.push({file,info:{kind:"checking",label:"Checking"}});existing.add(key);}});
    Promise.all(state.files.map(async item=>{if(item.info.kind==="checking")item.info=await window.PDFnestFileDetector.detect(item.file)})).then(renderSelection);
  }
  function removeFile(index){state.files.splice(index,1);renderSelection();}
  function renderSelection(){
    if(!state.files.length){selected.hidden=true;drop.hidden=false;setStatus("");return;}
    selected.hidden=false;drop.hidden=true;
    $("#selectedFileCount").textContent=state.files.length;
    const total=state.files.reduce((n,x)=>n+x.file.size,0);
    const pdfs=state.files.filter(x=>x.info.kind==="pdf").length, images=state.files.filter(x=>x.info.kind==="image").length, docs=state.files.filter(x=>x.info.kind==="document").length, unsupported=state.files.filter(x=>x.info.kind==="unsupported").length;
    $("#fileSummaryLine").textContent=`${pdfs} PDF · ${images} images · ${docs} documents · ${unsupported} unsupported · ${window.PDFnestFileDetector.formatBytes(total)} total`;
    $("#selectedFilesList").innerHTML="";
    state.files.forEach((item,i)=>{const row=document.createElement("div");row.className="selected-file-row";const icon=item.info.kind==="pdf"?"📕":item.info.kind==="image"?"🖼️":item.info.kind==="document"?"📄":"📦";row.innerHTML=`<span class="selected-file-icon">${icon}</span><span class="selected-file-info"><strong>${safe(item.file.name)}</strong><small>${safe(item.info.label)} · ${window.PDFnestFileDetector.formatBytes(item.file.size)}</small></span><button type="button" class="remove-selected-file" aria-label="Remove ${safe(item.file.name)}">×</button>`;row.querySelector("button").addEventListener("click",()=>removeFile(i));$("#selectedFilesList").appendChild(row);});
    renderSuggestions();
    $("#unsupportedNote").hidden=!unsupported;$("#unsupportedNote").textContent=unsupported?`${unsupported} file(s) are selected, but no PDFnest tool currently supports these formats. They won't be sent to a tool.`:"";
  }
  function renderSuggestions(){
    const tools=window.PDFnestToolRegistry.getRelevant(state.files), c=$("#suggestedTools");c.innerHTML="";
    $("#suggestedToolCount").textContent=`${tools.length} relevant ${tools.length===1?"tool":"tools"}`;
    if(!tools.length){c.innerHTML='<div class="no-suggestions">No matching multi-file action for this selection. Select one supported PDF/image or a supported combination.</div>';return;}
    tools.forEach(tool=>{const btn=document.createElement("button");btn.className="suggested-tool-card";btn.type="button";btn.innerHTML=`<span class="suggested-tool-icon">${tool.icon}</span><span><strong>${safe(tool.name)}</strong><small>${safe(tool.desc)}</small></span><b>→</b>`;btn.addEventListener("click",()=>launchTool(tool));c.appendChild(btn);});
  }
  async function launchTool(tool){
    const chosen=state.files.filter(x=>tool.types.includes(x.info.kind));
    if(!chosen.length)return;
    addActivity(tool,chosen);
    try{
      setStatus(`Preparing ${tool.name}…`);
      if(tool.multi){
        await window.ToolBridge.sendFilesToTool(tool.id,chosen.map(x=>({blob:x.file,fileName:x.file.name,mimeType:x.file.type||x.info.mime})));
      }else{
        if(chosen.length!==1)throw new Error("This tool currently accepts one file at a time.");
        await window.ToolBridge.sendToTool(tool.id,chosen[0].file,chosen[0].file.name,chosen[0].file.type||chosen[0].info.mime);
      }
    }catch(err){setStatus(err.message||"Could not open tool.",true);}
  }

  // Sidebar navigation and account/profile affordances.
  $$("[data-view]").forEach(btn=>btn.addEventListener("click",()=>setView(btn.dataset.view)));
  $("#mobileMenuBtn").addEventListener("click",()=>$("#appSidebar").classList.toggle("mobile-open"));
  $("#settingsClearHistory").addEventListener("click",clearHistory);
  $("#clearHistoryBtn").addEventListener("click",clearHistory);
  function clearHistory(){if(!confirm("Clear your recent activity history from this browser?"))return;state.history=[];persistHistory();renderHistory();}
  $("#browseFilesBtn").addEventListener("click",e=>{e.preventDefault();e.stopPropagation();input.click();});
  $("#addMoreFilesBtn").addEventListener("click",e=>{e.preventDefault();e.stopPropagation();input.click();});
  $("#clearFilesBtn").addEventListener("click",()=>{state.files=[];renderSelection();});
  drop.addEventListener("click",e=>{
    if(e.target.closest("button")) return;
    e.preventDefault();
    input.click();
  });
  drop.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();input.click();}});
  input.addEventListener("change",()=>{
    if (input.files && input.files.length) addFiles(input.files);
    input.value="";
  });
  ["dragenter","dragover"].forEach(evt=>drop.addEventListener(evt,e=>{
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect="copy";
    drop.classList.add("dragging");
  }));
  ["dragleave","drop"].forEach(evt=>drop.addEventListener(evt,e=>{
    e.preventDefault();
    drop.classList.remove("dragging");
    if(evt==="drop" && e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
      addFiles(e.dataTransfer.files);
    }
  }));
  document.addEventListener("dragover",e=>e.preventDefault());
  document.addEventListener("drop",e=>{if(!drop.contains(e.target))e.preventDefault();});
  $$(".tool-filter").forEach(b=>b.addEventListener("click",()=>{$$(".tool-filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");state.filter=b.dataset.filter;renderAllTools();}));
  $("#toolSearch").addEventListener("input",e=>{state.search=e.target.value.trim().toLowerCase();renderAllTools();});
  $("#sidebarUserName").textContent=user.name||user.fullName||"Your account";
  $("#sidebarUserEmail").textContent=user.email||"Signed in";
  const initial=(user.name||user.email||"S").trim().charAt(0).toUpperCase();
  $("#sidebarUserInitial").textContent=initial;$("#dropdownProfileInitial").textContent=initial;
  $("#welcomeDate").textContent=new Date().toLocaleDateString([], {weekday:"long",month:"long",day:"numeric"});
  state.history=readList(HISTORY_KEY).filter(x=>x.at>Date.now()-RETENTION_DAYS*86400000).slice(0,MAX_HISTORY);
  state.favorites=readList(FAV_KEY);
  persistHistory();renderPopular();renderAllTools();renderFavorites();renderHistory();
})();