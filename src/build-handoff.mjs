import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SKIPPED_DIRS = new Set(["handoff", "node_modules", ".git", ".superpowers"]);

export async function discoverHtmlFiles(rootDir) {
  const rootPath = rootDir instanceof URL ? fileURLToPath(rootDir) : rootDir;
  const entries = await readdir(rootPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .filter((entry) => entry.name.toLowerCase().endsWith(".html"))
    .filter((entry) => !entry.name.toLowerCase().endsWith("-handoff.html"))
    .map((entry) => ({ name: entry.name, path: path.join(rootPath, entry.name) }))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
}

export function makeOutputName(fileName) {
  return fileName.replace(/\.html?$/i, "-handoff.html");
}

export function normalizeColorTokens(value) {
  return String(value || "")
    .match(/rgba?\([^)]+\)|hsla?\([^)]+\)|#[0-9a-fA-F]{3,8}|[a-zA-Z]+/g)
    ?.filter((token) => token !== "transparent") ?? [];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function encodeBase64(value) {
  return Buffer.from(value, "utf8").toString("base64");
}

function withBaseHref(sourceHtml, sourceHref) {
  if (!sourceHref || /<base[\s>]/i.test(sourceHtml)) return sourceHtml;
  const baseTag = `<base href="${escapeHtml(sourceHref)}">`;
  if (/<head[\s>]/i.test(sourceHtml)) return sourceHtml.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
  return `${baseTag}${sourceHtml}`;
}

export function buildHandoffDocument({ title, fileName, sourceHtml, sourceHref = "" }) {
  const safeTitle = escapeHtml(title || fileName || "HTML Design Handoff");
  const safeFileName = escapeHtml(fileName || "source.html");
  const encodedSource = encodeBase64(withBaseHref(sourceHtml, sourceHref));

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle} - HTML Design Handoff</title>
  <style>
    :root { --bg:#f4f6f8; --panel:#fff; --line:#d9dee7; --text:#111827; --muted:#64748b; --blue:#1f6feb; --blue-soft:#e8f1ff; --red:#ff3868; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    * { box-sizing:border-box; }
    body { margin:0; height:100vh; overflow:auto; background:var(--bg); color:var(--text); font-size:12px; }
    button,input { font:inherit; }
    .app { display:grid; grid-template-rows:48px 1fr; height:100vh; min-width:1120px; }
    .topbar { display:flex; align-items:center; gap:12px; padding:0 14px; border-bottom:1px solid var(--line); background:#fff; }
    .brand { font-weight:800; font-size:13px; }
    .file-name { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--muted); }
    .top-actions { margin-left:auto; display:flex; gap:8px; align-items:center; }
    .chip,.icon-btn,.mode-toggle,.copy-btn { border:1px solid var(--line); background:#fff; color:#334155; border-radius:6px; height:28px; padding:0 10px; display:inline-flex; align-items:center; justify-content:center; }
    .icon-btn { width:30px; padding:0; }
    .mode-toggle,.copy-btn,.icon-btn,.tab,.tree-node { cursor:pointer; }
    .mode-toggle.interactive { color:#0f4db3; background:var(--blue-soft); border-color:#9cc5ff; }
    .workspace { display:grid; grid-template-columns:280px minmax(360px,1fr) 360px; min-height:0; }
    .panel { min-width:0; min-height:0; background:var(--panel); border-right:1px solid var(--line); display:flex; flex-direction:column; }
    .panel.right { border-right:0; border-left:1px solid var(--line); }
    .panel-header { height:42px; padding:0 12px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--line); font-weight:800; }
    .search { margin:10px; height:30px; border:1px solid var(--line); border-radius:6px; padding:0 10px; outline:none; }
    .tree { overflow:auto; padding:6px 8px 18px; }
    .tree-node { min-height:26px; display:flex; align-items:center; gap:6px; padding:0 8px; border-radius:5px; color:#334155; white-space:nowrap; }
    .tree-node:hover,.tree-node.selected { background:var(--blue-soft); color:#0f4db3; }
    .tree-label { overflow:hidden; text-overflow:ellipsis; }
    .tag { font-weight:700; color:#0f172a; } .class-name { color:#2563eb; } .text-preview { color:#64748b; }
    .canvas { display:grid; grid-template-rows:40px 1fr; min-height:0; background:linear-gradient(90deg,rgba(148,163,184,.18) 1px,transparent 1px),linear-gradient(0deg,rgba(148,163,184,.18) 1px,transparent 1px); background-size:24px 24px; }
    .canvas-toolbar { display:flex; align-items:center; gap:8px; padding:0 12px; border-bottom:1px solid var(--line); background:#f8fafc; }
    .canvas-stage { overflow:auto; min-height:0; padding:28px; }
    .frame-shell { width:max-content; min-width:420px; min-height:680px; margin:0 auto; position:relative; background:#fff; box-shadow:0 18px 45px rgba(15,23,42,.12); border:1px solid #b8c1d1; }
    iframe { width:430px; height:880px; display:block; border:0; background:#fff; }
    .overlay-layer { position:absolute; inset:0; pointer-events:none; overflow:hidden; }
    .selection-box,.hover-box { position:absolute; display:none; border:2px solid var(--blue); background:rgba(31,111,235,.08); }
    .hover-box { border-color:#7c3aed; background:rgba(124,58,237,.07); }
    .size-badge,.measure-label { position:absolute; display:none; background:var(--blue); color:#fff; border-radius:4px; padding:3px 6px; font-weight:800; white-space:nowrap; transform:translate(-50%,-50%); }
    .measure-guide { position:absolute; display:none; pointer-events:none; z-index:4; }
    .measure-line { position:absolute; background:var(--red); } .horizontal { left:0; right:0; top:50%; height:1px; } .vertical { top:0; bottom:0; left:50%; width:1px; }
    .measure-label { display:block; color:var(--red); background:rgba(255,255,255,.95); box-shadow:0 1px 3px rgba(15,23,42,.12); }
    .tabs { display:flex; padding:8px; gap:6px; border-bottom:1px solid var(--line); }
    .tab { height:28px; border:0; border-radius:5px; padding:0 10px; background:transparent; color:#475569; }
    .tab.active { background:#e2e8f0; color:#0f172a; font-weight:800; }
    .inspect-body { overflow:auto; padding:12px; }
    .empty { margin:24px 8px; color:var(--muted); line-height:1.6; }
    .section { margin-bottom:18px; } .section-title { margin-bottom:8px; font-weight:900; }
    .primary-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; margin-bottom:14px; }
    .primary-card { min-width:0; border:1px solid var(--line); background:#fff; border-radius:7px; padding:10px; }
    .primary-label { color:#64748b; margin-bottom:5px; font-size:11px; } .primary-value { font-weight:900; overflow-wrap:anywhere; }
    details { border:1px solid var(--line); border-radius:7px; margin-bottom:12px; overflow:hidden; background:#fff; } summary { cursor:pointer; padding:10px 12px; font-weight:900; background:#f8fafc; }
    .detail-inner { padding:10px; }
    .kv { display:grid; grid-template-columns:116px minmax(0,1fr); gap:1px; border:1px solid var(--line); border-radius:7px; overflow:hidden; background:var(--line); }
    .kv div { min-width:0; background:#fff; padding:8px 9px; line-height:1.35; overflow-wrap:anywhere; } .kv .key { color:#64748b; background:#f8fafc; }
    pre { white-space:pre-wrap; margin:0; border:1px solid var(--line); border-radius:7px; padding:10px; background:#0f172a; color:#dbeafe; line-height:1.6; max-height:360px; overflow:auto; }
    @media (max-width:1120px) { body { min-width:1120px; } }
  </style>
</head>
<body data-source-html="${encodedSource}" data-source-file="${safeFileName}">
  <div class="app">
    <header class="topbar"><div class="brand">HTML Design Handoff</div><div class="file-name" title="${safeFileName}">${safeFileName}</div><div class="top-actions"><button class="mode-toggle" id="modeBtn">标注模式</button><span class="chip" id="selectedSummary">未选择</span><button class="icon-btn" id="refreshBtn" title="Reload preview">R</button></div></header>
    <main class="workspace">
      <aside class="panel"><div class="panel-header"><span>Layers</span><span id="nodeCount">0</span></div><input class="search" id="layerSearch" placeholder="Search layer, class, text"><div class="tree" id="layerTree"></div></aside>
      <section class="canvas"><div class="canvas-toolbar"><span class="chip" id="viewportSize">Viewport</span><span class="chip">点击元素查看标注</span></div><div class="canvas-stage"><div class="frame-shell" id="frameShell"><iframe id="previewFrame"></iframe><div class="overlay-layer"><div class="hover-box" id="hoverBox"></div><div class="selection-box" id="selectionBox"></div><div class="size-badge" id="sizeBadge"></div><div class="measure-guide" id="measureTop"></div><div class="measure-guide" id="measureRight"></div><div class="measure-guide" id="measureBottom"></div><div class="measure-guide" id="measureLeft"></div></div></div></div></section>
      <aside class="panel right"><div class="panel-header"><span>标注</span><div><button class="copy-btn" id="copyCssBtn">Copy CSS</button> <button class="copy-btn" id="copyJsonBtn">Copy Specs JSON</button></div></div><div class="tabs"><button class="tab active" data-tab="inspect">标注</button><button class="tab" data-tab="tokens">资源</button><button class="tab" data-tab="export">导出</button></div><div class="inspect-body" id="inspectBody"></div></aside>
    </main>
  </div>
  <script>
    const sourceHtml = new TextDecoder().decode(Uint8Array.from(atob(document.body.dataset.sourceHtml), function(c) { return c.charCodeAt(0); }));
    const frame = document.getElementById("previewFrame");
    const layerTree = document.getElementById("layerTree");
    const inspectBody = document.getElementById("inspectBody");
    const selectionBox = document.getElementById("selectionBox");
    const hoverBox = document.getElementById("hoverBox");
    const sizeBadge = document.getElementById("sizeBadge");
    const selectedSummary = document.getElementById("selectedSummary");
    const guides = ["measureTop","measureRight","measureBottom","measureLeft"].map(function(id) { return document.getElementById(id); });
    let records = [], selectedId = null, activeTab = "inspect", mode = "inspect", currentCss = "";

    function formatMeasure(value) { return (Math.round(value * 10) / 10) + "px"; }
    function compactText(value) { return (value || "").replace(/\s+/g, " ").trim().slice(0, 42); }
    function escapeText(value) { return String(value == null ? "" : value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;"); }
    function numericCss(value) { const n = parseFloat(value); return Number.isFinite(n) ? n : 0; }
    function getDoc() { return frame.contentDocument || frame.contentWindow.document; }
    function isInspectable(el) { if (!el || el.nodeType !== 1) return false; const tag = el.tagName.toLowerCase(); if (["script","style","meta","link","title","base"].includes(tag)) return false; const r = el.getBoundingClientRect(); const s = el.ownerDocument.defaultView.getComputedStyle(el); return r.width > 0 && r.height > 0 && s.display !== "none" && s.visibility !== "hidden"; }
    function tagLabel(el) { const tag = el.tagName.toLowerCase(); const id = el.id ? "#" + el.id : ""; const className = Array.from(el.classList).slice(0,2).map(function(n) { return "." + n; }).join(""); const text = compactText(el.innerText || el.textContent || ""); return { tag, id, className, text }; }
    function resolvedLineHeight(el, style) { const explicit = numericCss(style.lineHeight); if (explicit) return explicit; const fontSize = numericCss(style.fontSize); const h = el.getBoundingClientRect().height; return h >= fontSize ? h : fontSize * 1.2; }
    function stableSelector(el) { const label = tagLabel(el); if (el.id) return label.tag + label.id; if (el.className) return label.tag + label.className; return label.tag + "[data-handoff-id='" + el.dataset.handoffId + "']"; }
    function section(title, html) { return '<div class="section"><div class="section-title">' + escapeText(title) + '</div>' + html + '</div>'; }
    function grid(items) { return '<div class="primary-grid">' + items.map(function(item) { return '<div class="primary-card"><div class="primary-label">' + escapeText(item[0]) + '</div><div class="primary-value">' + escapeText(item[1]) + '</div></div>'; }).join("") + '</div>'; }
    function kv(items) { return '<div class="kv">' + items.map(function(item) { return '<div class="key">' + escapeText(item[0]) + '</div><div>' + escapeText(item[1]) + '</div>'; }).join("") + '</div>'; }
    function details(title, html) { return '<details open><summary>' + escapeText(title) + '</summary><div class="detail-inner">' + html + '</div></details>'; }

    function assignIds() { let i = 1; getDoc().querySelectorAll("*").forEach(function(el) { if (isInspectable(el)) { el.dataset.handoffId = String(i++); el.style.cursor = "crosshair"; } }); }
    function buildRecords(root, depth, list) { depth = depth || 0; list = list || []; Array.from(root.children).forEach(function(child) { if (!isInspectable(child)) { buildRecords(child, depth, list); return; } const label = tagLabel(child); list.push({ id: child.dataset.handoffId, depth, label, search: [label.tag,label.id,label.className,label.text].join(" ").toLowerCase() }); buildRecords(child, depth + 1, list); }); return list; }
    function findElement(id) { return getDoc().querySelector('[data-handoff-id="' + id + '"]'); }
    function renderLayers() { const q = document.getElementById("layerSearch").value.trim().toLowerCase(); const rows = q ? records.filter(function(r) { return r.search.includes(q); }) : records; layerTree.innerHTML = rows.map(function(r) { return '<div class="tree-node ' + (r.id === selectedId ? 'selected' : '') + '" data-id="' + r.id + '" style="padding-left:' + (8 + r.depth * 14) + 'px"><span>›</span><span class="tree-label"><span class="tag">' + r.label.tag + '</span><span class="class-name">' + escapeText(r.label.id + r.label.className) + '</span> <span class="text-preview">' + escapeText(r.label.text) + '</span></span></div>'; }).join(""); }
    function frameRect() { return frame.getBoundingClientRect(); }
    function relativeRect(el) { const a = el.getBoundingClientRect(), b = frameRect(); return { left:a.left-b.left+frame.contentWindow.scrollX, top:a.top-b.top+frame.contentWindow.scrollY, width:a.width, height:a.height }; }
    function placeBox(el, box) { const r = relativeRect(el); Object.assign(box.style, { display:"block", left:r.left+"px", top:r.top+"px", width:r.width+"px", height:r.height+"px" }); }
    function hideGuides() { guides.forEach(function(g) { g.style.display = "none"; }); }
    function guide(index, label, left, top, width, height, vertical) { const g = guides[index]; g.style.display = "block"; Object.assign(g.style, { left:left+"px", top:top+"px", width:Math.max(1,width)+"px", height:Math.max(1,height)+"px" }); g.innerHTML = '<div class="measure-line ' + (vertical ? 'vertical' : 'horizontal') + '"></div><div class="measure-label">' + escapeText(label) + '</div>'; }
    function updateOverlay(el) { if (!el) { selectionBox.style.display = "none"; sizeBadge.style.display = "none"; hideGuides(); return; } placeBox(el, selectionBox); const r = relativeRect(el); sizeBadge.style.display = "block"; sizeBadge.textContent = formatMeasure(r.width) + " × " + formatMeasure(r.height); sizeBadge.style.left = (r.left + r.width / 2) + "px"; sizeBadge.style.top = Math.max(12, r.top - 14) + "px"; hideGuides(); const parent = el.parentElement && isInspectable(el.parentElement) ? relativeRect(el.parentElement) : { left:0, top:0, width:frame.contentWindow.innerWidth, height:frame.contentWindow.innerHeight }; guide(0, formatMeasure(r.top - parent.top), r.left + r.width / 2, parent.top, 1, r.top - parent.top, true); guide(1, formatMeasure(parent.left + parent.width - r.left - r.width), r.left + r.width, r.top + r.height / 2, parent.left + parent.width - r.left - r.width, 1, false); guide(2, formatMeasure(parent.top + parent.height - r.top - r.height), r.left + r.width / 2, r.top + r.height, 1, parent.top + parent.height - r.top - r.height, true); guide(3, formatMeasure(r.left - parent.left), parent.left, r.top + r.height / 2, r.left - parent.left, 1, false); }
    function selectElement(el) { if (!isInspectable(el)) return; selectedId = el.dataset.handoffId; const label = tagLabel(el); selectedSummary.textContent = [label.tag,label.id,label.className].join("") || label.tag; updateOverlay(el); renderLayers(); renderInspect(); }
    window.selectElement = selectElement;

    function collectSpec(el) { const r = el.getBoundingClientRect(); const s = el.ownerDocument.defaultView.getComputedStyle(el); const label = tagLabel(el); const lineHeight = resolvedLineHeight(el, s); currentCss = ['width: ' + formatMeasure(r.width) + ';','height: ' + formatMeasure(r.height) + ';','font-size: ' + s.fontSize + ';','line-height: ' + formatMeasure(lineHeight) + ';','color: ' + s.color + ';','background: ' + s.backgroundColor + ';','padding: ' + s.padding + ';','margin: ' + s.margin + ';','border-radius: ' + s.borderRadius + ';'].join("\n"); const isText = label.text && el.children.length === 0; const basic = isText ? [["内容",label.text],["宽",formatMeasure(r.width)],["高",formatMeasure(r.height)],["字体",s.fontFamily.split(",")[0].replaceAll('"',"")],["字号",s.fontSize],["字重",s.fontWeight],["行高",formatMeasure(lineHeight)]] : [["宽",formatMeasure(r.width)],["高",formatMeasure(r.height)]]; return section("基础标注", grid(basic)) + details("高级信息", section("元素", kv([["选择器", stableSelector(el)],["文本",label.text || "-"],["不透明度",s.opacity]])) + section("布局", kv([["尺寸",formatMeasure(r.width)+" × "+formatMeasure(r.height)],["位置","X "+formatMeasure(r.left)+", Y "+formatMeasure(r.top)],["显示",s.display],["定位",s.position]])) + section("间距", kv([["外边距",s.margin],["内边距",s.padding],["间隔",s.gap]])) + section("文本", kv([["字体",s.fontFamily],["字号",s.fontSize],["行高",formatMeasure(lineHeight)],["字重",s.fontWeight],["对齐",s.textAlign]])) + section("外观", kv([["颜色",s.color],["背景",s.backgroundColor],["边框",s.border],["圆角",s.borderRadius],["阴影",s.boxShadow]]))); }
    function specsJson() { const els = records.map(function(r) { return findElement(r.id); }).filter(isInspectable); return { meta:{ format:"html-design-handoff/specs-v1", sourceFile:document.body.dataset.sourceFile, generatedAt:new Date().toISOString(), nodeCount:els.length, viewport:{ width:frame.contentWindow.innerWidth, height:frame.contentWindow.innerHeight } }, layers: els.map(function(el) { const r = el.getBoundingClientRect(), s = el.ownerDocument.defaultView.getComputedStyle(el), label = tagLabel(el); return { id:el.dataset.handoffId, selector:stableSelector(el), type:label.tag, text:label.text, bounds:{ left:r.left, top:r.top, width:r.width, height:r.height }, textStyle:{ fontFamily:s.fontFamily, fontSize:s.fontSize, fontWeight:s.fontWeight, lineHeight:formatMeasure(resolvedLineHeight(el,s)), color:s.color }, spacing:{ margin:s.margin, padding:s.padding, gap:s.gap }, appearance:{ background:s.backgroundColor, border:s.border, borderRadius:s.borderRadius, boxShadow:s.boxShadow } }; }) }; }
    function renderTokens() { const colors = new Map(), fonts = new Map(); records.map(function(r) { return findElement(r.id); }).filter(isInspectable).forEach(function(el) { const s = el.ownerDocument.defaultView.getComputedStyle(el); [s.color,s.backgroundColor,s.borderColor].forEach(function(v) { (String(v).match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}/g) || []).forEach(function(c) { colors.set(c,(colors.get(c)||0)+1); }); }); fonts.set(s.fontSize,(fonts.get(s.fontSize)||0)+1); }); return section("Colors", kv(Array.from(colors.entries()).slice(0,24).map(function(item) { return [item[0], String(item[1])]; }))) + section("Font Sizes", kv(Array.from(fonts.entries()).slice(0,24).map(function(item) { return [item[0], String(item[1])]; }))); }
    function renderInspect() { if (activeTab === "tokens") { inspectBody.innerHTML = renderTokens(); return; } if (activeTab === "export") { inspectBody.innerHTML = section("Selected CSS", '<pre>' + escapeText(currentCss || "Select an element first.") + '</pre>') + section("Specs JSON", '<pre>' + escapeText(JSON.stringify(specsJson(), null, 2)) + '</pre>'); return; } const el = selectedId ? findElement(selectedId) : null; inspectBody.innerHTML = el ? collectSpec(el) : '<div class="empty">点击中间预览里的任意元素，或在左侧 Layers 里选择一个节点，就能看到尺寸、字体、颜色、padding、margin 和相对间距。</div>'; }
    function setup() { assignIds(); records = buildRecords(getDoc().body || getDoc().documentElement); document.getElementById("nodeCount").textContent = String(records.length); document.getElementById("viewportSize").textContent = "画板 " + frame.contentWindow.innerWidth + " × " + frame.contentWindow.innerHeight + "px"; renderLayers(); renderInspect(); getDoc().addEventListener("click", function(e) { if (mode === "interactive") return; const el = e.target.closest("[data-handoff-id]"); if (el) { e.preventDefault(); e.stopPropagation(); selectElement(el); } }, true); getDoc().addEventListener("mouseover", function(e) { if (mode === "interactive") return; const el = e.target.closest("[data-handoff-id]"); if (el && el.dataset.handoffId !== selectedId) placeBox(el, hoverBox); }, true); getDoc().addEventListener("mouseout", function() { hoverBox.style.display = "none"; }, true); frame.contentWindow.addEventListener("scroll", function() { updateOverlay(selectedId ? findElement(selectedId) : null); }, true); }
    layerTree.addEventListener("click", function(e) { const row = e.target.closest("[data-id]"); if (!row) return; const el = findElement(row.dataset.id); if (el) el.scrollIntoView({ block:"center", inline:"center" }); selectElement(el); });
    document.getElementById("layerSearch").addEventListener("input", renderLayers);
    document.querySelectorAll(".tab").forEach(function(btn) { btn.addEventListener("click", function() { activeTab = btn.dataset.tab; document.querySelectorAll(".tab").forEach(function(x) { x.classList.toggle("active", x === btn); }); renderInspect(); }); });
    document.getElementById("copyCssBtn").addEventListener("click", function() { navigator.clipboard.writeText(currentCss); });
    document.getElementById("copyJsonBtn").addEventListener("click", function() { navigator.clipboard.writeText(JSON.stringify(specsJson(), null, 2)); });
    document.getElementById("modeBtn").addEventListener("click", function(e) { mode = mode === "inspect" ? "interactive" : "inspect"; e.target.textContent = mode === "inspect" ? "标注模式" : "交互模式"; e.target.classList.toggle("interactive", mode === "interactive"); });
    document.getElementById("refreshBtn").addEventListener("click", function() { selectedId = null; frame.srcdoc = sourceHtml; });
    frame.addEventListener("load", setup); frame.srcdoc = sourceHtml;
  </script>
</body>
</html>`;
}

export function buildIndexDocument(outputs) {
  const links = outputs.map((output) => `<a href="./${escapeHtml(output.name)}">${escapeHtml(output.sourceName)}</a>`).join("");
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>HTML Design Handoff</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111827}main{width:min(720px,calc(100vw - 32px));background:#fff;border:1px solid #d9dee7;border-radius:8px;box-shadow:0 18px 45px rgba(15,23,42,.12);padding:24px}h1{margin:0 0 8px;font-size:22px}p{margin:0 0 18px;color:#64748b}a{display:block;padding:14px 16px;border:1px solid #d9dee7;border-radius:7px;color:#1f6feb;text-decoration:none;margin-top:10px;font-weight:700}a:hover{background:#e8f1ff}</style></head><body><main><h1>HTML Design Handoff</h1><p>选择一个页面进入本地 Inspect 视图。</p>${links}</main></body></html>`;
}

export async function buildAll({ rootDir = process.cwd(), outDir = path.join(process.cwd(), "handoff") } = {}) {
  const rootPath = rootDir instanceof URL ? fileURLToPath(rootDir) : rootDir;
  const outputPath = outDir instanceof URL ? fileURLToPath(outDir) : outDir;
  await mkdir(outputPath, { recursive: true });
  const files = (await discoverHtmlFiles(rootPath)).filter((file) => !path.relative(rootPath, file.path).split(path.sep).some((part) => SKIPPED_DIRS.has(part)));
  const outputs = [];
  for (const file of files) {
    const sourceHtml = await readFile(file.path, "utf8");
    const outputName = makeOutputName(file.name);
    const html = buildHandoffDocument({ title: file.name.replace(/\.html?$/i, ""), fileName: file.name, sourceHtml, sourceHref: pathToFileURL(path.dirname(file.path) + path.sep).href });
    await writeFile(path.join(outputPath, outputName), html, "utf8");
    outputs.push({ name: outputName, sourceName: file.name });
  }
  await writeFile(path.join(outputPath, "index.html"), buildIndexDocument(outputs), "utf8");
  return outputs;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const outputs = await buildAll();
  console.log(`Generated ${outputs.length} handoff page(s) in handoff/`);
  for (const output of outputs) console.log(`- handoff/${output.name}`);
  console.log("- handoff/index.html");
}
