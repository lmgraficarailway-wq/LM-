/* ============================================================
   Arte Generator — app.js  (v2 — expanded font system)
   ============================================================ */

// ─── PDF.js WORKER ────────────────────────────────────────────────────────────
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ─── FONT LIST (150+ fonts — Google Fonts + common system) ───────────────────
const FONTS = [
  // === SYSTEM FONTS ===
  { name: 'Arial', system: true },
  { name: 'Arial Black', system: true },
  { name: 'Arial Narrow', system: true },
  { name: 'Calibri', system: true },
  { name: 'Cambria', system: true },
  { name: 'Century Gothic', system: true },
  { name: 'Comic Sans MS', system: true },
  { name: 'Consolas', system: true },
  { name: 'Courier New', system: true },
  { name: 'Franklin Gothic Medium', system: true },
  { name: 'Futura', system: true },
  { name: 'Garamond', system: true },
  { name: 'Georgia', system: true },
  { name: 'Impact', system: true },
  { name: 'Lucida Console', system: true },
  { name: 'Lucida Sans Unicode', system: true },
  { name: 'Microsoft Sans Serif', system: true },
  { name: 'Palatino Linotype', system: true },
  { name: 'Segoe UI', system: true },
  { name: 'Tahoma', system: true },
  { name: 'Times New Roman', system: true },
  { name: 'Trebuchet MS', system: true },
  { name: 'Verdana', system: true },

  // === GOOGLE FONTS — Sans-Serif ===
  { name: 'Inter', google: true },
  { name: 'Roboto', google: true },
  { name: 'Open Sans', google: true },
  { name: 'Lato', google: true },
  { name: 'Montserrat', google: true },
  { name: 'Poppins', google: true },
  { name: 'Raleway', google: true },
  { name: 'Nunito', google: true },
  { name: 'Nunito Sans', google: true },
  { name: 'Source Sans 3', google: true },
  { name: 'Ubuntu', google: true },
  { name: 'PT Sans', google: true },
  { name: 'Work Sans', google: true },
  { name: 'Barlow', google: true },
  { name: 'Barlow Condensed', google: true },
  { name: 'DM Sans', google: true },
  { name: 'Mulish', google: true },
  { name: 'Quicksand', google: true },
  { name: 'Jost', google: true },
  { name: 'Hind', google: true },
  { name: 'Rubik', google: true },
  { name: 'Exo 2', google: true },
  { name: 'Noto Sans', google: true },
  { name: 'IBM Plex Sans', google: true },
  { name: 'Figtree', google: true },
  { name: 'Plus Jakarta Sans', google: true },
  { name: 'Outfit', google: true },
  { name: 'Manrope', google: true },
  { name: 'Sora', google: true },

  // === GOOGLE FONTS — Display/Impact ===
  { name: 'Oswald', google: true },
  { name: 'Bebas Neue', google: true },
  { name: 'Anton', google: true },
  { name: 'Black Han Sans', google: true },
  { name: 'Fjalla One', google: true },
  { name: 'Archivo Black', google: true },
  { name: 'Passion One', google: true },
  { name: 'Righteous', google: true },
  { name: 'Teko', google: true },
  { name: 'Russo One', google: true },
  { name: 'Squada One', google: true },
  { name: 'Chakra Petch', google: true },
  { name: 'Orbitron', google: true },
  { name: 'Exo', google: true },
  { name: 'Audiowide', google: true },
  { name: 'Black Ops One', google: true },
  { name: 'Alfa Slab One', google: true },
  { name: 'Boogaloo', google: true },
  { name: 'Bangers', google: true },
  { name: 'Lilita One', google: true },
  { name: 'Abril Fatface', google: true },
  { name: 'Titan One', google: true },
  { name: 'Permanent Marker', google: true },

  // === GOOGLE FONTS — Serif ===
  { name: 'Playfair Display', google: true },
  { name: 'Merriweather', google: true },
  { name: 'Lora', google: true },
  { name: 'PT Serif', google: true },
  { name: 'Libre Baskerville', google: true },
  { name: 'Crimson Text', google: true },
  { name: 'EB Garamond', google: true },
  { name: 'Cormorant Garamond', google: true },
  { name: 'Cardo', google: true },
  { name: 'Spectral', google: true },
  { name: 'Bitter', google: true },
  { name: 'Noto Serif', google: true },
  { name: 'IBM Plex Serif', google: true },
  { name: 'Unna', google: true },
  { name: 'Zilla Slab', google: true },
  { name: 'Rokkitt', google: true },
  { name: 'Arvo', google: true },

  // === GOOGLE FONTS — Script/Handwriting ===
  { name: 'Dancing Script', google: true },
  { name: 'Pacifico', google: true },
  { name: 'Caveat', google: true },
  { name: 'Satisfy', google: true },
  { name: 'Great Vibes', google: true },
  { name: 'Sacramento', google: true },
  { name: 'Allura', google: true },
  { name: 'Alex Brush', google: true },
  { name: 'Lobster', google: true },
  { name: 'Kaushan Script', google: true },
  { name: 'Parisienne', google: true },
  { name: 'Pinyon Script', google: true },
  { name: 'Mr Dafoe', google: true },
  { name: 'Cookie', google: true },
  { name: 'Amatic SC', google: true },
  { name: 'Shadows Into Light', google: true },
  { name: 'Patrick Hand', google: true },
  { name: 'Indie Flower', google: true },
  { name: 'Handlee', google: true },
  { name: 'Rock Salt', google: true },

  // === GOOGLE FONTS — Monospace ===
  { name: 'Roboto Mono', google: true },
  { name: 'Source Code Pro', google: true },
  { name: 'Space Mono', google: true },
  { name: 'IBM Plex Mono', google: true },
  { name: 'JetBrains Mono', google: true },
  { name: 'Fira Code', google: true },
  { name: 'Share Tech Mono', google: true },

  // === GOOGLE FONTS — Condensed / Specialty ===
  { name: 'Josefin Sans', google: true },
  { name: 'Josefin Slab', google: true },
  { name: 'Cinzel', google: true },
  { name: 'Cinzel Decorative', google: true },
  { name: 'Caudex', google: true },
  { name: 'Philosopher', google: true },
  { name: 'Poiret One', google: true },
  { name: 'Comfortaa', google: true },
  { name: 'Varela Round', google: true },
  { name: 'Fredoka One', google: true },
  { name: 'Baloo 2', google: true },
  { name: 'Courgette', google: true },
  { name: 'Secular One', google: true },
  { name: 'Economica', google: true },
  { name: 'Armata', google: true },
  { name: 'Ruda', google: true },
];

// ─── LOAD GOOGLE FONTS ────────────────────────────────────────────────────────
function loadGoogleFonts() {
  const googleFonts = FONTS.filter(f => f.google).map(f => f.name.replace(/ /g, '+') + ':wght@400;700');
  // Chunk into groups of 10 to avoid URL length issues
  const chunkSize = 10;
  for (let i = 0; i < googleFonts.length; i += chunkSize) {
    const chunk = googleFonts.slice(i, i + chunkSize);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${chunk.map(f => 'family=' + f).join('&')}&display=swap`;
    document.head.appendChild(link);
  }
}
loadGoogleFonts();

// ─── STATE ────────────────────────────────────────────────────────────────────
const state = {
  image: null,
  canvasW: 1920,
  canvasH: 1080,
  scale: 1,
  fields: [],
  dataList: [],
  editingFieldId: null,
  dragging: null,
  selectedFieldId: null,
  previewIdx: 0,
};
let fieldIdCounter = 0;

// ─── LOCAL STORAGE ────────────────────────────────────────────────────────────
function saveState() {
  const saveData = {
    canvasW: state.canvasW,
    canvasH: state.canvasH,
    fields: state.fields,
    dataList: state.dataList,
    fieldIdCounter: fieldIdCounter,
  };
  try {
    if (state.image) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = state.image.naturalWidth;
      tempCanvas.height = state.image.naturalHeight;
      const tCtx = tempCanvas.getContext('2d');
      tCtx.drawImage(state.image, 0, 0);
      saveData.imageData = tempCanvas.toDataURL('image/webp', 0.8);
    }
  } catch (e) {
    console.warn('Could not save image to localStorage: ', e);
  }
  
  try {
    localStorage.setItem('arteGenState', JSON.stringify(saveData));
  } catch (e) {
    console.warn('LocalStorage quota exceeded, attempting save without image...');
    delete saveData.imageData;
    try { localStorage.setItem('arteGenState', JSON.stringify(saveData)); } catch(e2) {}
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem('arteGenState');
    if (!saved) return false;
    const data = JSON.parse(saved);
    state.canvasW = data.canvasW || 1920;
    state.canvasH = data.canvasH || 1080;
    state.fields = data.fields || [];
    state.dataList = data.dataList || [];
    fieldIdCounter = data.fieldIdCounter || state.fields.length;
    
    if (data.imageData) {
      const img = new Image();
      img.onload = () => {
        state.image = img;
        uploadArea.innerHTML = `<div class="upload-icon">✅</div><p style="font-size:12px">Imagem Restaurada</p><span style="font-size:10px;color:var(--text-muted)">${img.naturalWidth} × ${img.naturalHeight} px</span><input type="file" id="input-image" accept="image/*" hidden />`;
        const ni = uploadArea.querySelector('#input-image');
        uploadArea.addEventListener('click', () => ni.click());
        ni.addEventListener('change', e2 => { if (e2.target.files[0]) loadImageFile(e2.target.files[0]); });
        fitCanvas(); renderCanvas(); renderOverlays();
        if (state.dataList.length > 0) renderPreview(0);
      };
      img.src = data.imageData;
    }
    return true;
  } catch (e) {
    console.warn('Error loading state', e);
    return false;
  }
}


// ─── DOM REFS ─────────────────────────────────────────────────────────────────
const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');
const overlayContainer = document.getElementById('overlay-container');
const canvasWrapper = document.getElementById('canvas-wrapper');
const canvasViewport = document.getElementById('canvas-viewport');
const canvasInfo = document.getElementById('canvas-info');
const fieldsList = document.getElementById('fields-list'); // may be null if panel removed
const rawDataTextarea = document.getElementById('raw-data-textarea');
const dataCount = document.getElementById('data-count');
const importHint = document.getElementById('import-hint');
const bindingSection = document.getElementById('binding-section'); // hidden div, safe
const bindingSelect = document.getElementById('binding-select');
const progressOverlay = document.getElementById('progress-overlay');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const progressTitle = document.getElementById('progress-title');
const modalBackdrop = document.getElementById('modal-backdrop');

// Quick-edit bar
const quickEditBar = document.getElementById('quick-edit-bar');
const qeEditText = document.getElementById('qe-edit-text');
const qeFontSearch = document.getElementById('qe-font-search');
const qeFontDropdown = document.getElementById('qe-font-dropdown');
const qeSize = document.getElementById('qe-size');
const qeColor = document.getElementById('qe-color');
const qeBold = document.getElementById('qe-bold');
const qeAlignLeft = document.getElementById('qe-align-left');
const qeAlignCenter = document.getElementById('qe-align-center');
const qeAlignRight = document.getElementById('qe-align-right');
const qeWrap = document.getElementById('qe-wrap');
const qeWrapWidth = document.getElementById('qe-wrap-width');

// ─── ENSURE DEFAULT FIELD ────────────────────────────────────────────────────
// Auto-creates a single text field when data loads (if none exists yet)
function ensureDefaultField() {
  if (state.fields.length > 0) return; // already has a field
  const id = ++fieldIdCounter;
  state.fields.push({
    id, name: 'Texto',
    defaultText: 'Texto',
    x: Math.round(state.canvasW / 2),
    y: Math.round(state.canvasH * 0.45),
    font: 'Inter', size: Math.round(state.canvasH * 0.07),
    color: '#ffffff', align: 'center', bold: 'bold',
    shadow: 6, wrap: false,
    wrapWidth: Math.round(state.canvasW * 0.8),
    lineHeight: 0,
  });
  renderFieldsList();
  updateBindingSelect();
}

// ─── FONT PICKER HELPER ───────────────────────────────────────────────────────
function buildFontItems(query = '') {
  const q = query.toLowerCase();
  return FONTS.filter(f => f.name.toLowerCase().includes(q));
}

function makeFontDropdownItems(container, itemClass, currentFont, onSelect) {
  container.innerHTML = '';
  const filtered = buildFontItems(container._query || '');
  filtered.forEach(f => {
    const el = document.createElement('div');
    el.className = itemClass + (f.name === currentFont ? ' selected' : '');
    el.textContent = f.name;
    el.style.fontFamily = `"${f.name}", sans-serif`;
    el.addEventListener('mousedown', e => {
      e.preventDefault();
      onSelect(f.name);
    });
    container.appendChild(el);
  });
}

// ─── MODAL FONT PICKER ────────────────────────────────────────────────────────
const fieldFontSearch = document.getElementById('field-font-search');
const fieldFontDropdown = document.getElementById('field-font-dropdown');
const fieldFontHidden = document.getElementById('field-font');

function openModalFontPicker(currentFont) {
  fieldFontSearch.value = currentFont || '';
  fieldFontHidden.value = currentFont || 'Inter';
  fieldFontDropdown._query = '';
  makeFontDropdownItems(fieldFontDropdown, 'fp-font-item', currentFont, (name) => {
    fieldFontHidden.value = name;
    fieldFontSearch.value = name;
    fieldFontSearch.style.fontFamily = `"${name}", sans-serif`;
    fieldFontDropdown.classList.remove('open');
  });
  fieldFontDropdown.classList.add('open');
}

fieldFontSearch.addEventListener('focus', () => {
  openModalFontPicker(fieldFontHidden.value);
});

fieldFontSearch.addEventListener('input', () => {
  const q = fieldFontSearch.value.toLowerCase();
  fieldFontDropdown._query = q;
  makeFontDropdownItems(fieldFontDropdown, 'fp-font-item', fieldFontHidden.value, (name) => {
    fieldFontHidden.value = name;
    fieldFontSearch.value = name;
    fieldFontSearch.style.fontFamily = `"${name}", sans-serif`;
    fieldFontDropdown.classList.remove('open');
  });
  fieldFontDropdown.classList.add('open');
});

document.addEventListener('click', e => {
  if (!fieldFontSearch.contains(e.target) && !fieldFontDropdown.contains(e.target)) {
    fieldFontDropdown.classList.remove('open');
    // If search text doesn't match a font, revert to current value
    const match = FONTS.find(f => f.name.toLowerCase() === fieldFontSearch.value.toLowerCase());
    if (match) { fieldFontHidden.value = match.name; fieldFontSearch.value = match.name; }
    else fieldFontSearch.value = fieldFontHidden.value;
  }
});

// ─── QUICK-EDIT BAR FONT PICKER ───────────────────────────────────────────────
qeFontSearch.addEventListener('focus', () => {
  const f = getSelectedField();
  qeFontDropdown._query = '';
  makeFontDropdownItems(qeFontDropdown, 'qe-font-item', f ? f.font : '', (name) => {
    qeFontSearch.value = name;
    qeFontSearch.style.fontFamily = `"${name}", sans-serif`;
    qeFontDropdown.classList.remove('open');
    applyQuickEdit('font', name);
  });
  qeFontDropdown.classList.add('open');
});

qeFontSearch.addEventListener('input', () => {
  const f = getSelectedField();
  qeFontDropdown._query = qeFontSearch.value.toLowerCase();
  makeFontDropdownItems(qeFontDropdown, 'qe-font-item', f ? f.font : '', (name) => {
    qeFontSearch.value = name;
    qeFontSearch.style.fontFamily = `"${name}", sans-serif`;
    qeFontDropdown.classList.remove('open');
    applyQuickEdit('font', name);
  });
  qeFontDropdown.classList.add('open');
});

document.addEventListener('click', e => {
  if (!qeFontSearch.contains(e.target) && !qeFontDropdown.contains(e.target)) {
    qeFontDropdown.classList.remove('open');
  }
});

qeEditText.addEventListener('click', () => {
  if (!state.selectedFieldId) return;
  const overlay = document.querySelector(`.text-overlay[data-id="${state.selectedFieldId}"]`);
  if (overlay) {
    overlay.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
  }
});

qeSize.addEventListener('change', () => applyQuickEdit('size', parseInt(qeSize.value, 10)));
qeSize.addEventListener('input', () => applyQuickEdit('size', parseInt(qeSize.value, 10)));
qeColor.addEventListener('input', () => applyQuickEdit('color', qeColor.value));
qeBold.addEventListener('click', () => {
  const f = getSelectedField();
  if (!f) return;
  const next = f.bold === 'bold' ? 'normal' : 'bold';
  applyQuickEdit('bold', next);
  qeBold.classList.toggle('active', next === 'bold');
});
qeAlignLeft.addEventListener('click', () => { applyQuickEdit('align', 'left'); updateAlignButtons('left'); });
qeAlignCenter.addEventListener('click', () => { applyQuickEdit('align', 'center'); updateAlignButtons('center'); });
qeAlignRight.addEventListener('click', () => { applyQuickEdit('align', 'right'); updateAlignButtons('right'); });
qeWrap.addEventListener('click', () => {
  const f = getSelectedField();
  if (!f) return;
  const next = !f.wrap;
  f.wrap = next;
  if (next && !f.wrapWidth) f.wrapWidth = Math.round(state.canvasW * 0.8);
  qeWrap.classList.toggle('active', next);
  qeWrapWidth.style.display = next ? 'block' : 'none';
  if (next) qeWrapWidth.value = f.wrapWidth;
  applyQuickEdit('wrap', next);
});
qeWrapWidth.addEventListener('input', () => {
  const v = parseInt(qeWrapWidth.value, 10);
  if (v > 0) applyQuickEdit('wrapWidth', v);
});

function updateAlignButtons(align) {
  [qeAlignLeft, qeAlignCenter, qeAlignRight].forEach(b => b.classList.remove('active'));
  if (align === 'left') qeAlignLeft.classList.add('active');
  else if (align === 'center') qeAlignCenter.classList.add('active');
  else if (align === 'right') qeAlignRight.classList.add('active');
}

function getSelectedField() {
  return state.fields.find(f => f.id === state.selectedFieldId) || null;
}

function applyQuickEdit(prop, value) {
  const f = getSelectedField();
  if (!f) return;
  f[prop] = value;
  if (state.dataList.length > 0) {
    renderPreview(state.previewIdx);
  } else {
    renderCanvas();
  }
  renderOverlays();
  renderFieldsList();
  saveState();
}

function populateQuickEditBar(field) {
  if (!field) { quickEditBar.style.display = 'none'; return; }
  quickEditBar.style.display = 'flex';
  
  qeFontSearch.value = field.font;
  qeFontSearch.style.fontFamily = `"${field.font}", sans-serif`;
  qeSize.value = field.size;
  qeColor.value = field.color;
  qeBold.classList.toggle('active', field.bold === 'bold');
  updateAlignButtons(field.align);
  const wrapOn = !!field.wrap;
  qeWrap.classList.toggle('active', wrapOn);
  qeWrapWidth.style.display = wrapOn ? 'block' : 'none';
  if (wrapOn) qeWrapWidth.value = field.wrapWidth || Math.round(state.canvasW * 0.8);
}

// ─── INIT CANVAS ──────────────────────────────────────────────────────────────
function initCanvas() {
  canvas.width = state.canvasW;
  canvas.height = state.canvasH;
  canvasInfo.textContent = `${state.canvasW} × ${state.canvasH} px`;
  fitCanvas();
  renderCanvas();
}

function fitCanvas() {
  const vw = canvasViewport.clientWidth - 40;
  const vh = canvasViewport.clientHeight - 40;
  const scaleX = vw / state.canvasW;
  const scaleY = vh / state.canvasH;
  state.scale = Math.min(scaleX, scaleY, 1);
  canvasWrapper.style.width = (state.canvasW * state.scale) + 'px';
  canvasWrapper.style.height = (state.canvasH * state.scale) + 'px';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  renderOverlays();
}

function renderCanvas(previewValues = null) {
  ctx.clearRect(0, 0, state.canvasW, state.canvasH);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, state.canvasW, state.canvasH);
  if (state.image) {
    ctx.drawImage(state.image, 0, 0, state.canvasW, state.canvasH);
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    for (let x = 0; x < state.canvasW; x += 80) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,state.canvasH); ctx.stroke(); }
    for (let y = 0; y < state.canvasH; y += 80) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(state.canvasW,y); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.font = `bold ${Math.round(state.canvasH*0.04)}px Inter,Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('Carregue uma Arte de Fundo', state.canvasW/2, state.canvasH/2);
  }
  if (previewValues !== null) {
    state.fields.forEach(f => {
      const text = previewValues[f.id] !== undefined ? previewValues[f.id] : f.defaultText;
      drawFieldOnCtx(ctx, f, text);
    });
  }
}

function drawFieldOnCtx(context, field, text) {
  context.save();
  context.font = `${field.bold} ${field.size}px "${field.font}", Arial`;
  context.textAlign = field.align;
  context.fillStyle = field.color;
  if (field.shadow > 0) {
    context.shadowColor = 'rgba(0,0,0,0.8)';
    context.shadowBlur = field.shadow * 2;
    context.shadowOffsetX = field.shadow * 0.5;
    context.shadowOffsetY = field.shadow * 0.5;
  }
  const lh = field.lineHeight || Math.round(field.size * 1.25);
  if (field.wrap && field.wrapWidth > 0) {
    const maxW = field.wrapWidth;
    // Split on existing newlines first, then word-wrap each line
    const paragraphs = String(text).split('\n');
    let lines = [];
    paragraphs.forEach(para => {
      const words = para.split(' ');
      let current = '';
      words.forEach(word => {
        const test = current ? current + ' ' + word : word;
        if (context.measureText(test).width > maxW && current) {
          lines.push(current);
          current = word;
        } else {
          current = test;
        }
      });
      lines.push(current);
    });
    lines.forEach((line, i) => context.fillText(line, field.x, field.y + i * lh));
  } else {
    context.fillText(String(text), field.x, field.y);
  }
  context.restore();
}

// ─── OVERLAY (draggable) ──────────────────────────────────────────────────────
function renderOverlays() {
  overlayContainer.innerHTML = '';
  state.fields.forEach(f => {
    const el = document.createElement('div');
    el.classList.add('text-overlay');
    if (f.id === state.selectedFieldId) el.classList.add('selected');
    el.dataset.id = f.id;
    el.style.left = (f.x * state.scale) + 'px';
    el.style.top = (f.y * state.scale) + 'px';

    const inner = document.createElement('span');
    inner.className = 'text-overlay-label';
    inner.textContent = f.defaultText || f.name;
    const scaledSize = Math.max(8, f.size * state.scale);
    inner.style.cssText = `
      font-family:"${f.font}",Arial;font-size:${scaledSize}px;font-weight:${f.bold};
      color:${f.color};text-align:${f.align};
      text-shadow:${f.shadow>0?`${f.shadow*0.5}px ${f.shadow*0.5}px ${f.shadow*2}px rgba(0,0,0,0.8)`:'none'};
    `;
    el.appendChild(inner);
    
    // Direct On-Canvas Editing via double click
    el.addEventListener('dblclick', e => {
      e.stopPropagation();
      const isBound = getBoundFieldId() === f.id && state.dataList.length > 0;
      inner.contentEditable = 'true';
      inner.style.cursor = 'text';
      inner.style.outline = '2px dashed var(--accent-light)';
      inner.style.padding = '2px';
      inner.focus();
      
      const range = document.createRange();
      range.selectNodeContents(inner);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      
      const finishEditing = () => {
        inner.contentEditable = 'false';
        inner.style.cursor = 'move';
        inner.style.outline = 'none';
        inner.style.padding = '0';
        window.getSelection().removeAllRanges();
        const newVal = inner.textContent;
        if (isBound) {
          state.dataList[state.previewIdx] = newVal;
          // Sync to textarea
          rawDataTextarea.value = state.dataList.join('\n');
          renderPreview(state.previewIdx);
          saveState();
        } else {
          applyQuickEdit('defaultText', newVal);
        }
      };
      
      inner.addEventListener('blur', finishEditing, { once: true });
      inner.addEventListener('keydown', ek => {
        if (ek.key === 'Enter' && !ek.shiftKey) { ek.preventDefault(); inner.blur(); }
        // Prevent deleting the field while typing
        if (ek.key === 'Delete' || ek.key === 'Backspace') ek.stopPropagation();
      });
    });

    el.addEventListener('mousedown', onOverlayMouseDown);
    el.addEventListener('click', e => { e.stopPropagation(); selectField(f.id); });
    overlayContainer.appendChild(el);
  });
}

function selectField(id) {
  if (state.selectedFieldId === id) return;
  state.selectedFieldId = id;
  
  document.querySelectorAll('.text-overlay').forEach(el => {
    el.classList.toggle('selected', Number(el.dataset.id) === id);
  });
  
  document.querySelectorAll('.field-item').forEach(item => {
    item.classList.toggle('active', Number(item.dataset.id) === id);
  });
  populateQuickEditBar(getSelectedField());
}

// ─── DRAG ────────────────────────────────────────────────────────────────────
function onOverlayMouseDown(e) {
  if (e.button !== 0) return;
  const inner = e.currentTarget.querySelector('.text-overlay-label');
  if (inner && inner.isContentEditable) {
    e.stopPropagation();
    return;
  }
  e.preventDefault();
  const fieldId = Number(e.currentTarget.dataset.id);
  const field = state.fields.find(f => f.id === fieldId);
  if (!field) return;
  selectField(fieldId);
  state.dragging = { fieldId, startMouseX: e.clientX, startMouseY: e.clientY, origX: field.x, origY: field.y };
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);
}

function onDragMove(e) {
  if (!state.dragging) return;
  const { fieldId, startMouseX, startMouseY, origX, origY } = state.dragging;
  const field = state.fields.find(f => f.id === fieldId);
  if (!field) return;
  field.x = Math.round(origX + (e.clientX - startMouseX) / state.scale);
  field.y = Math.round(origY + (e.clientY - startMouseY) / state.scale);
  renderOverlays();
}

function onDragEnd() {
  state.dragging = null;
  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', onDragEnd);
  saveState();
}

// ─── IMAGE UPLOAD ─────────────────────────────────────────────────────────────
const uploadArea = document.getElementById('upload-area');
const inputImage = document.getElementById('input-image');
uploadArea.addEventListener('click', () => inputImage.click());
uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', e => {
  e.preventDefault(); uploadArea.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadImageFile(file);
});
inputImage.addEventListener('change', e => { if (e.target.files[0]) loadImageFile(e.target.files[0]); });

function loadImageFile(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    state.image = img;
    // ── Auto-fit canvas to the image's original proportions ──
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    if (iw > 0 && ih > 0) {
      state.canvasW = iw;
      state.canvasH = ih;
      canvas.width  = iw;
      canvas.height = ih;
      setDimInputsFromPx(iw, ih);
      canvasInfo.textContent = `${iw} × ${ih} px`;
    }
    uploadArea.innerHTML = `<div class="upload-icon">✅</div><p style="font-size:12px;word-break:break-all">${file.name}</p><span style="font-size:10px;color:var(--text-muted)">${img.naturalWidth} × ${img.naturalHeight} px</span><input type="file" id="input-image" accept="image/*" hidden />`;
    const ni = uploadArea.querySelector('#input-image');
    uploadArea.addEventListener('click', () => ni.click());
    ni.addEventListener('change', e2 => { if (e2.target.files[0]) loadImageFile(e2.target.files[0]); });
    fitCanvas(); renderCanvas(); renderOverlays();
    if (state.dataList.length > 0) renderPreview(state.previewIdx);
    saveState();
  };
  img.src = url;
}

// ─── DIMENSIONS ───────────────────────────────────────────────────────────────
const dimWidth = document.getElementById('dim-width');
const dimHeight = document.getElementById('dim-height');
const labelWidth = document.getElementById('label-width');
const labelHeight = document.getElementById('label-height');

// Unit conversion — base is always px, using 96 DPI
let currentUnit = 'px';
const DPI = 96;
const PX_PER_CM = DPI / 2.54;       // ≈ 37.795
const PX_PER_MM = DPI / 25.4;       // ≈ 3.7795

function pxToUnit(px, unit) {
  if (unit === 'cm') return +(px / PX_PER_CM).toFixed(2);
  if (unit === 'mm') return +(px / PX_PER_MM).toFixed(1);
  return Math.round(px);
}

function unitToPx(val, unit) {
  if (unit === 'cm') return Math.round(val * PX_PER_CM);
  if (unit === 'mm') return Math.round(val * PX_PER_MM);
  return Math.round(val);
}

function updateDimLabels(unit) {
  labelWidth.textContent  = `Largura (${unit})`;
  labelHeight.textContent = `Altura (${unit})`;
  dimWidth.step  = unit === 'mm' ? '0.1' : (unit === 'cm' ? '0.01' : '1');
  dimHeight.step = dimWidth.step;
}

function setDimInputsFromPx(wPx, hPx) {
  dimWidth.value  = pxToUnit(wPx, currentUnit);
  dimHeight.value = pxToUnit(hPx, currentUnit);
}

// Unit button toggle
document.getElementById('unit-btns').querySelectorAll('.unit-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.unit === currentUnit) return;
    // Convert currently displayed values to new unit
    const wPx = unitToPx(parseFloat(dimWidth.value)  || state.canvasW, currentUnit);
    const hPx = unitToPx(parseFloat(dimHeight.value) || state.canvasH, currentUnit);
    currentUnit = btn.dataset.unit;
    document.querySelectorAll('.unit-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateDimLabels(currentUnit);
    setDimInputsFromPx(wPx, hPx);
  });
});

document.getElementById('btn-apply-dims').addEventListener('click', () => {
  const wPx = unitToPx(parseFloat(dimWidth.value),  currentUnit);
  const hPx = unitToPx(parseFloat(dimHeight.value), currentUnit);
  applyDimensionsFromPx(wPx, hPx);
});

function applyDimensionsFromPx(w, h) {
  if (!w || !h || w < 10 || h < 10) { alert('Dimensões inválidas!'); return; }
  state.canvasW = w; state.canvasH = h;
  initCanvas();
  saveState();
  const unitLabel = currentUnit;
  const dW = pxToUnit(w, unitLabel);
  const dH = pxToUnit(h, unitLabel);
  canvasInfo.textContent = `${w} × ${h} px  (${dW} × ${dH} ${unitLabel})`;
  fitCanvas(); renderCanvas(); renderOverlays();
}

window.addEventListener('resize', fitCanvas);
document.getElementById('btn-zoom-fit').addEventListener('click', fitCanvas);

// ─── FIELD MODAL ──────────────────────────────────────────────────────────────
const modalTitle = document.getElementById('modal-title');
const fieldName = document.getElementById('field-name');
const fieldDefault = document.getElementById('field-default');
const fieldSize = document.getElementById('field-size');
const fieldColor = document.getElementById('field-color');
const fieldAlign = document.getElementById('field-align');
const fieldBold = document.getElementById('field-bold');
const fieldShadow = document.getElementById('field-shadow');

function openFieldModal(fieldId = null) {
  state.editingFieldId = fieldId;
  if (fieldId !== null) {
    const f = state.fields.find(x => x.id === fieldId);
    if (!f) return;
    modalTitle.textContent = 'Editar Campo';
    fieldName.value = f.name; fieldDefault.value = f.defaultText;
    fieldFontHidden.value = f.font; fieldFontSearch.value = f.font;
    fieldFontSearch.style.fontFamily = `"${f.font}", sans-serif`;
    fieldSize.value = f.size; fieldColor.value = f.color;
    fieldAlign.value = f.align; fieldBold.value = f.bold; fieldShadow.value = f.shadow;
  } else {
    modalTitle.textContent = 'Adicionar Campo';
    fieldName.value = ''; fieldDefault.value = 'Campo de Texto';
    fieldFontHidden.value = 'Inter'; fieldFontSearch.value = 'Inter';
    fieldFontSearch.style.fontFamily = 'Inter, sans-serif';
    fieldSize.value = '48'; fieldColor.value = '#ffffff';
    fieldAlign.value = 'center'; fieldBold.value = 'normal'; fieldShadow.value = '4';
  }
  modalBackdrop.hidden = false;
  // populate font dropdown
  fieldFontDropdown._query = '';
  makeFontDropdownItems(fieldFontDropdown, 'fp-font-item', fieldFontHidden.value, (name) => {
    fieldFontHidden.value = name; fieldFontSearch.value = name;
    fieldFontSearch.style.fontFamily = `"${name}", sans-serif`;
    fieldFontDropdown.classList.remove('open');
  });
  setTimeout(() => fieldName.focus(), 50);
}

function closeModal() { modalBackdrop.hidden = true; state.editingFieldId = null; fieldFontDropdown.classList.remove('open'); }

function saveField() {
  const name = fieldName.value.trim() || 'Campo';
  const def = fieldDefault.value;
  const font = fieldFontHidden.value || 'Inter';
  const size = parseInt(fieldSize.value,10) || 48;
  const color = fieldColor.value;
  const align = fieldAlign.value;
  const bold = fieldBold.value;
  const shadow = parseInt(fieldShadow.value,10) || 0;
  if (state.editingFieldId !== null) {
    const f = state.fields.find(x => x.id === state.editingFieldId);
    if (f) Object.assign(f, { name, defaultText: def, font, size, color, align, bold, shadow });
  } else {
    const id = ++fieldIdCounter;
    state.fields.push({ id, name, defaultText: def, x: Math.round(state.canvasW/2), y: Math.round(state.canvasH/2), font, size, color, align, bold, shadow });
  }
  closeModal(); renderFieldsList(); renderOverlays(); updateBindingSelect();
  // Auto-select so the quick-edit bar appears immediately
  const autoSelectId = state.editingFieldId !== null ? state.editingFieldId : state.fields[state.fields.length - 1]?.id;
  if (autoSelectId != null) selectField(autoSelectId);
  if (state.dataList.length > 0) renderPreview(state.previewIdx);
}

document.getElementById('btn-add-field')?.addEventListener('click', () => openFieldModal(null));
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.getElementById('modal-save').addEventListener('click', saveField);
modalBackdrop.addEventListener('click', e => { if (e.target === modalBackdrop) closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if (e.key === 'Enter' && !modalBackdrop.hidden && document.activeElement !== fieldDefault) { e.preventDefault(); saveField(); }
  if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedFieldId !== null && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {
    deleteField(state.selectedFieldId);
  }
});

function renderFieldsList() {
  if (!fieldsList) return;
  if (state.fields.length === 0) { fieldsList.innerHTML = '<p class="empty-hint">Nenhum campo adicionado.</p>'; return; }
  const colors = ['#7c5cfc','#00d4aa','#ff6b9d','#ffb347','#4ecdc4','#45b7d1'];
  fieldsList.innerHTML = '';
  state.fields.forEach((f, idx) => {
    const item = document.createElement('div');
    item.className = 'field-item' + (f.id === state.selectedFieldId ? ' active' : '');
    item.dataset.id = f.id;
    item.innerHTML = `
      <div class="field-item-dot" style="background:${colors[idx%colors.length]}"></div>
      <div style="flex:1;overflow:hidden"><div class="field-item-name">${f.name}</div><div class="field-item-sub">${f.font} · ${f.size}px</div></div>
      <div class="field-item-actions">
        <button class="icon-btn edit-btn" title="Editar">✏</button>
        <button class="icon-btn delete delete-btn" title="Deletar">🗑</button>
      </div>`;
    item.querySelector('.edit-btn').addEventListener('click', e => { e.stopPropagation(); openFieldModal(f.id); });
    item.querySelector('.delete-btn').addEventListener('click', e => { e.stopPropagation(); deleteField(f.id); });
    item.addEventListener('click', () => selectField(f.id));
    fieldsList.appendChild(item);
  });
}

function deleteField(id) {
  state.fields = state.fields.filter(f => f.id !== id);
  if (state.selectedFieldId === id) { state.selectedFieldId = null; quickEditBar.style.display = 'none'; }
  renderFieldsList(); renderOverlays(); updateBindingSelect(); saveState();
}

// ─── SEQUENTIAL NUMBERS ───────────────────────────────────────────────────────
document.getElementById('btn-gen-seq').addEventListener('click', () => {
  const start = parseInt(document.getElementById('seq-start').value,10);
  const end = parseInt(document.getElementById('seq-end').value,10);
  const prefix = document.getElementById('seq-prefix').value;
  if (isNaN(start)||isNaN(end)||end<start) { alert('Range inválido!'); return; }
  if (end-start>9999) { alert('Máximo 10.000 entradas.'); return; }
  const list = []; for (let i=start;i<=end;i++) list.push(prefix+i);
  setDataList(list, `Sequencial: ${prefix}${start} → ${prefix}${end}`);
});

// ─── IMPORT EXCEL ─────────────────────────────────────────────────────────────
const inputExcel = document.getElementById('input-excel');
document.getElementById('btn-import-excel').addEventListener('click', () => inputExcel.click());
inputExcel.addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf,{type:'array'});
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws,{header:1});
    const list = rows.map(r=>r.filter(c=>c!==''&&c!=null).join(' | ')).filter(r=>r.trim());
    setDataList(list, `Excel: ${file.name}`);
  } catch(err) { alert('Erro ao ler Excel: '+err.message); }
  e.target.value='';
});

// ─── IMPORT WORD ──────────────────────────────────────────────────────────────
const inputWord = document.getElementById('input-word');
document.getElementById('btn-import-word').addEventListener('click', () => inputWord.click());
inputWord.addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({arrayBuffer:buf});
    const lines = result.value.split('\n').map(l=>l.trim()).filter(l=>l);
    setDataList(lines, `Word: ${file.name}`);
  } catch(err) { alert('Erro ao ler Word: '+err.message); }
  e.target.value='';
});

// ─── IMPORT PDF ───────────────────────────────────────────────────────────────
const inputPdf = document.getElementById('input-pdf');
document.getElementById('btn-import-pdf').addEventListener('click', () => inputPdf.click());
inputPdf.addEventListener('change', async e => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({data:buf}).promise;
    const lines = [];
    for (let p=1;p<=pdf.numPages;p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      tc.items.forEach(item=>{ const t=item.str.trim(); if(t) lines.push(t); });
    }
    setDataList(lines, `PDF: ${file.name}`);
  } catch(err) { alert('Erro ao ler PDF: '+err.message); }
  e.target.value='';
});

// ─── DATA LIST UI ─────────────────────────────────────────────────────────────
function setDataList(list, hint) {
  state.dataList = list; importHint.textContent = hint; renderDataList(); saveState();
}

function renderDataList() {
  if (state.dataList.length === 0) {
    rawDataTextarea.value = '';
    dataCount.textContent = '0 linhas';
    document.getElementById('preview-nav').style.display = 'none';
    renderCanvas();
    return;
  }
  
  ensureDefaultField();

  if (document.activeElement !== rawDataTextarea) {
    rawDataTextarea.value = state.dataList.join('\n');
  }
  
  dataCount.textContent = `${state.dataList.length} linha${state.dataList.length === 1 ? '' : 's'}`;
  updateBindingSelect();
  
  // ensure preview reflects current state
  renderPreview(state.previewIdx);
}

// Keep state.dataList synced with typing in the textarea
rawDataTextarea.addEventListener('input', () => {
  const lines = rawDataTextarea.value.split('\n').map(l => l.trim()).filter(l => l);
  state.dataList = lines;
  dataCount.textContent = `${state.dataList.length} linha${state.dataList.length === 1 ? '' : 's'}`;
  updateBindingSelect();
  ensureDefaultField();
  if (state.dataList.length > 0) {
    if (state.previewIdx >= state.dataList.length) state.previewIdx = state.dataList.length - 1;
    renderPreview(state.previewIdx);
  } else {
    document.getElementById('preview-nav').style.display = 'none';
    renderCanvas();
  }
  saveState();
});

// ─── LIVE PREVIEW ─────────────────────────────────────────────────────────────
function renderPreview(idx) {
  if (!state.dataList.length || !state.fields.length) return;
  state.previewIdx = Math.max(0, Math.min(idx, state.dataList.length - 1));
  const entry = state.dataList[state.previewIdx];
  const boundId = getBoundFieldId();
  const values = {};
  state.fields.forEach(f => values[f.id] = f.defaultText);
  if (boundId) values[boundId] = entry;
  // Draw canvas with that entry
  renderCanvas(values);
  // Auto-select the bound field so the quick-edit bar stays visible
  if (!state.selectedFieldId && boundId) selectField(boundId);
  // Update nav bar
  const nav = document.getElementById('preview-nav');
  nav.style.display = 'flex';
  document.getElementById('preview-value').textContent = entry;
  document.getElementById('preview-pos').textContent = `${state.previewIdx + 1} / ${state.dataList.length}`;
  document.getElementById('preview-prev').disabled = state.previewIdx === 0;
  document.getElementById('preview-next').disabled = state.previewIdx === state.dataList.length - 1;
}

function updateBindingSelect() {
  const current = bindingSelect.value;
  bindingSelect.innerHTML='<option value="">\u2014 Selecione um campo \u2014</option>';
  state.fields.forEach(f=>{
    const opt=document.createElement('option'); opt.value=f.id; opt.textContent=f.name;
    bindingSelect.appendChild(opt);
  });
  // AUTO-BIND: keep previous selection or pick first field automatically
  const autoId = current && state.fields.find(f=>String(f.id)===String(current))
    ? current
    : (state.fields[0] ? String(state.fields[0].id) : '');
  bindingSelect.value = autoId;
  // Show auto-bind hint
  const autoBindHint = document.getElementById('auto-bind-hint');
  if (autoId && state.fields.length > 0) {
    const f = state.fields.find(x => String(x.id) === String(autoId));
    autoBindHint.textContent = f ? `\u2713 Auto-vinculado: ${f.name}` : '';
  } else {
    autoBindHint.textContent = '';
  }
  if (state.dataList.length>0 && state.fields.length>0) bindingSection.style.display='flex';
}

function getBoundFieldId() {
  return parseInt(bindingSelect.value, 10) || (state.fields[0] ? state.fields[0].id : null);
}

document.getElementById('btn-clear-data').addEventListener('click', () => {
  state.dataList=[]; importHint.textContent='Nenhum arquivo importado'; 
  rawDataTextarea.value='';
  renderDataList();
  saveState();
  inputExcel.value=''; inputWord.value=''; inputPdf.value='';
});

// ─── BATCH GENERATION ─────────────────────────────────────────────────────────
document.getElementById('btn-generate').addEventListener('click', generateAll);

async function generateAll() {
  if (!state.dataList.length) { alert('Adicione dados na lista antes de gerar!'); return; }
  if (!state.fields.length) { alert('Adicione pelo menos um campo de texto!'); return; }
  const boundFieldId = getBoundFieldId();
  if (!boundFieldId) { alert('Adicione um campo de texto primeiro!'); return; }

  progressOverlay.hidden=false; progressTitle.textContent='Gerando artes...';
  const total=state.dataList.length;
  progressText.textContent=`0 / ${total}`; progressBar.style.width='0%';

  const offCanvas=document.createElement('canvas');
  offCanvas.width=state.canvasW; offCanvas.height=state.canvasH;
  const offCtx=offCanvas.getContext('2d');
  const zip=new JSZip();

  for (let i=0;i<total;i++) {
    const entry=state.dataList[i];
    const values={};
    state.fields.forEach(f=>values[f.id]=f.defaultText);
    values[boundFieldId]=entry;

    offCtx.clearRect(0,0,state.canvasW,state.canvasH);
    offCtx.fillStyle='#1a1a2e'; offCtx.fillRect(0,0,state.canvasW,state.canvasH);
    if (state.image) offCtx.drawImage(state.image,0,0,state.canvasW,state.canvasH);
    state.fields.forEach(f=>drawFieldOnCtx(offCtx,f,values[f.id]));

    await new Promise(resolve=>{
      offCanvas.toBlob(blob=>{
        const safeName=entry.replace(/[^a-zA-Z0-9\u00C0-\u024F\s_\-]/g,'').trim()||`arte_${i+1}`;
        zip.file(`${String(i+1).padStart(4,'0')}_${safeName}.png`,blob);
        resolve();
      },'image/png');
    });

    const pct=Math.round(((i+1)/total)*100);
    progressBar.style.width=pct+'%'; progressText.textContent=`${i+1} / ${total}`;
    if (i%10===0) await sleep(0);
  }

  progressTitle.textContent='Preparando ZIP...';
  const zipBlob=await zip.generateAsync({type:'blob',compression:'DEFLATE'});
  const url=URL.createObjectURL(zipBlob);
  const a=document.createElement('a'); a.href=url; a.download=`artes_${Date.now()}.zip`; a.click();
  URL.revokeObjectURL(url);
  progressOverlay.hidden=true;
}

// ─── PRINT SHEET GENERATION ───────────────────────────────────────────────────
const printInfoBadge = document.getElementById('print-info');
const printSheetSizeEl = document.getElementById('print-sheet-size');
const printCustomDims = document.getElementById('print-custom-dims');

function getPrintSheetDims() {
  const val = printSheetSizeEl.value;
  if (val === 'custom') {
    return [
      parseInt(document.getElementById('print-cw').value,10) || 794,
      parseInt(document.getElementById('print-ch').value,10) || 1123,
    ];
  }
  const [w,h] = val.split('x').map(Number);
  return [w, h];
}

function updatePrintInfo() {
  const cols = parseInt(document.getElementById('print-cols').value,10) || 2;
  const rows = parseInt(document.getElementById('print-rows').value,10) || 4;
  printInfoBadge.textContent = `${cols} × ${rows} = ${cols*rows} artes por folha`;
}

['print-cols','print-rows','print-gap','print-margin'].forEach(id => {
  document.getElementById(id).addEventListener('input', updatePrintInfo);
});

printSheetSizeEl.addEventListener('change', () => {
  printCustomDims.style.display = printSheetSizeEl.value === 'custom' ? 'grid' : 'none';
});

document.getElementById('btn-print-sheets').addEventListener('click', generatePrintSheets);

async function generatePrintSheets() {
  if (!state.dataList.length) { alert('Adicione dados na lista antes de gerar!'); return; }
  if (!state.fields.length) { alert('Adicione pelo menos um campo de texto!'); return; }
  const boundFieldId = getBoundFieldId();
  if (!boundFieldId) { alert('Adicione um campo de texto primeiro!'); return; }

  const cols   = parseInt(document.getElementById('print-cols').value,10)   || 2;
  const rows   = parseInt(document.getElementById('print-rows').value,10)   || 4;
  const gap    = parseInt(document.getElementById('print-gap').value,10)    || 0;
  const margin = parseInt(document.getElementById('print-margin').value,10) || 0;
  const [sheetW, sheetH] = getPrintSheetDims();
  const perSheet = cols * rows;
  const total    = state.dataList.length;
  const numSheets = Math.ceil(total / perSheet);

  // Cell dimensions
  const cellW = Math.floor((sheetW - 2*margin - (cols-1)*gap) / cols);
  const cellH = Math.floor((sheetH - 2*margin - (rows-1)*gap) / rows);
  if (cellW < 10 || cellH < 10) { alert('Configuração inválida: células muito pequenas. Reduza margens ou espaçamento.'); return; }

  progressOverlay.hidden=false; progressTitle.textContent='Gerando folhas...';
  progressBar.style.width='0%'; progressText.textContent=`0 / ${numSheets} folhas`;

  // Off-screen art canvas
  const artCanvas = document.createElement('canvas');
  artCanvas.width = state.canvasW; artCanvas.height = state.canvasH;
  const artCtx = artCanvas.getContext('2d');

  // Sheet canvas
  const sheetCanvas = document.createElement('canvas');
  sheetCanvas.width = sheetW; sheetCanvas.height = sheetH;
  const sheetCtx = sheetCanvas.getContext('2d');

  const zip = new JSZip();

  for (let s = 0; s < numSheets; s++) {
    // White sheet background
    sheetCtx.fillStyle = '#ffffff';
    sheetCtx.fillRect(0, 0, sheetW, sheetH);

    for (let i = 0; i < perSheet; i++) {
      const dataIdx = s * perSheet + i;
      if (dataIdx >= total) break;

      const entry = state.dataList[dataIdx];
      const values = {};
      state.fields.forEach(f => values[f.id] = f.defaultText);
      values[boundFieldId] = entry;

      // Draw art off-screen
      artCtx.clearRect(0, 0, state.canvasW, state.canvasH);
      artCtx.fillStyle = '#1a1a2e';
      artCtx.fillRect(0, 0, state.canvasW, state.canvasH);
      if (state.image) artCtx.drawImage(state.image, 0, 0, state.canvasW, state.canvasH);
      state.fields.forEach(f => drawFieldOnCtx(artCtx, f, values[f.id]));

      // Position in grid
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = margin + col * (cellW + gap);
      const y = margin + row * (cellH + gap);
      sheetCtx.drawImage(artCanvas, x, y, cellW, cellH);
    }

    await new Promise(resolve => {
      sheetCanvas.toBlob(blob => {
        zip.file(`folha_${String(s+1).padStart(3,'0')}.png`, blob);
        resolve();
      }, 'image/png');
    });

    const pct = Math.round(((s+1)/numSheets)*100);
    progressBar.style.width = pct+'%';
    progressText.textContent = `${s+1} / ${numSheets} folhas`;
    await sleep(0);
  }

  progressTitle.textContent = 'Preparando ZIP...';
  const zipBlob = await zip.generateAsync({type:'blob', compression:'DEFLATE'});
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `folhas_impressao_${cols}x${rows}_${Date.now()}.zip`;
  a.click();
  URL.revokeObjectURL(url);
  progressOverlay.hidden = true;
}

function sleep(ms) { return new Promise(r=>setTimeout(r,ms)); }

// ─── CLEAR ALL ────────────────────────────────────────────────────────────────
document.getElementById('btn-clear-all').addEventListener('click', () => {
  if (!confirm('Limpar tudo?')) return;
  state.image=null; state.fields=[]; state.dataList=[]; state.selectedFieldId=null;
  fieldIdCounter=0;
  renderFieldsList(); renderDataList(); updateBindingSelect(); renderCanvas(); renderOverlays();
  quickEditBar.style.display='none';
  uploadArea.innerHTML=`<div class="upload-icon">📁</div><p>Clique ou arraste uma imagem</p><span>PNG, JPG, WEBP</span><input type="file" id="input-image" accept="image/*" hidden />`;
  const ni=uploadArea.querySelector('#input-image');
  uploadArea.addEventListener('click',()=>ni.click());
  ni.addEventListener('change',e=>{if(e.target.files[0])loadImageFile(e.target.files[0]);});
  importHint.textContent='Nenhum arquivo importado';
  saveState();
});

// ─── STARTUP ──────────────────────────────────────────────────────────────────
document.getElementById('preview-prev').addEventListener('click', () => renderPreview(state.previewIdx - 1));
document.getElementById('preview-next').addEventListener('click', () => renderPreview(state.previewIdx + 1));

document.addEventListener('keydown', e => {
  const active = document.activeElement;
  const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
  
  if (!isTyping) {
    if (e.key === 'ArrowLeft' || (e.ctrlKey && e.code === 'KeyZ')) {
      e.preventDefault();
      if (state.previewIdx > 0) renderPreview(state.previewIdx - 1);
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (state.previewIdx < state.dataList.length - 1) renderPreview(state.previewIdx + 1);
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (state.selectedFieldId) deleteField(state.selectedFieldId);
    }
  }
});

// Re-preview when the bound field changes
bindingSelect.addEventListener('change', () => {
  if (state.dataList.length) renderPreview(state.previewIdx);
});

// Re-preview when a field style changes (via quick-edit)
// (applyQuickEdit already calls renderOverlays; we also need to refresh canvas)
const _origApplyQE = applyQuickEdit;
// Monkey-patch to also refresh preview
window._qeHooked = true;

if (!loadState()) {
  initCanvas(); 
  renderFieldsList(); 
  renderDataList();
} else {
  // if loaded correctly, ensure UI is synced (if image exists, loadState handles image rendering async, but we init what we can here)
  initCanvas(); 
  renderFieldsList();
  renderDataList();
}

setTimeout(fitCanvas, 100);
