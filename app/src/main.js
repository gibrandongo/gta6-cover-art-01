// Neon Coast Cover Studio — wires the editor: photos, layouts, grades, per-panel
// crop, lettering, undo/redo and PNG export. Photos are read on this machine with
// FileReader object URLs and never uploaded. A `?shot=` query sets up a fixed
// scene for a screenshot instead (./shots.js).
import { LAYOUTS, GRADES, drawCoverArt } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const sizeTag = document.getElementById('sizeTag');
const thumbsEl = document.getElementById('thumbs');
const panelBarEl = document.getElementById('panelBar');
const panelPhotoEl = document.getElementById('panelPhoto');

const EXPORT_SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

const state = {
  photos: [],
  photoNames: [],
  panels: [],
  layout: 'heroThree',
  grade: 'neonSunset',
  caption: 'NEON COAST',
  subtitle: 'sunset run',
  badge: 'LAUNCH WEEK',
  stars: 5,
  grain: true,
  halftone: true,
  selected: 0,
  size: '1080x1080',
};

let undoStack = [];
let redoStack = [];

function panelCount() {
  return (LAYOUTS[state.layout] ?? LAYOUTS.heroThree).panels.length;
}

function ensurePanels() {
  const n = panelCount();
  while (state.panels.length < n) {
    state.panels.push({ photo: Math.min(state.panels.length, Math.max(0, state.photos.length - 1)), zoom: 1.2, ox: 0, oy: 0 });
  }
  state.panels.length = n;
  if (state.selected >= n) state.selected = 0;
}

function snapshot() {
  return JSON.stringify({
    panels: state.panels, layout: state.layout, grade: state.grade,
    caption: state.caption, subtitle: state.subtitle, badge: state.badge,
    stars: state.stars, grain: state.grain, halftone: state.halftone, size: state.size,
  });
}

function pushHistory() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
}

function restore(json) {
  const s = JSON.parse(json);
  Object.assign(state, s);
  ensurePanels();
  syncControls();
  redraw();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  setStatus('Undid the last change.');
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  setStatus('Redid the change.');
}

function setStatus(text) {
  statusEl.textContent = text;
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function redraw() {
  ensurePanels();
  const [w, h] = EXPORT_SIZES[state.size];
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  sizeTag.textContent = `${w} × ${h}`;
  // The selection outline is editor-only: an exported cover never shows it.
  const showSelection = !document.body.classList.contains('shot-cover');
  drawCoverArt(canvas, state, { selected: state.selected, showSelection });
}

function syncControls() {
  document.getElementById('caption').value = state.caption;
  document.getElementById('subtitle').value = state.subtitle;
  document.getElementById('badge').value = state.badge;
  document.getElementById('stars').value = String(state.stars);
  document.getElementById('grain').checked = state.grain;
  document.getElementById('halftone').checked = state.halftone;
  document.querySelectorAll('input[name="size"]').forEach((r) => {
    r.checked = r.value === state.size;
  });
  document.querySelectorAll('#layouts button').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('#grades button').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  syncPanelControls();
  syncThumbs();
}

function syncPanelControls() {
  ensurePanels();
  const crop = state.panels[state.selected];
  panelPhotoEl.innerHTML = state.photoNames.map((name, i) => `<option value="${i}">${i + 1}. ${name}</option>`).join('')
    || '<option value="0">No photos yet</option>';
  panelPhotoEl.value = String(crop.photo);
  document.getElementById('zoom').value = String(crop.zoom);
  document.getElementById('offsetX').value = String(crop.ox);
  document.getElementById('offsetY').value = String(crop.oy);
  document.getElementById('zoomVal').textContent = `${crop.zoom.toFixed(2)}×`;
  panelBarEl.querySelectorAll('button').forEach((b, i) => b.classList.toggle('active', i === state.selected));
}

function syncThumbs() {
  thumbsEl.innerHTML = '';
  state.photos.forEach((img, i) => {
    const t = document.createElement('img');
    t.src = img.src;
    t.alt = state.photoNames[i] ?? `Photo ${i + 1}`;
    t.title = 'Click to put this photo in the selected panel';
    if (state.panels[state.selected]?.photo === i) t.classList.add('sel');
    t.addEventListener('click', () => {
      pushHistory();
      state.panels[state.selected].photo = i;
      syncPanelControls();
      redraw();
      setStatus(`Panel ${state.selected + 1} now uses ${state.photoNames[i]}.`);
    });
    thumbsEl.appendChild(t);
  });
  document.getElementById('photoCount').textContent = state.photos.length
    ? `${state.photos.length} photo${state.photos.length > 1 ? 's' : ''} loaded — click a thumbnail to fill the selected panel.`
    : 'No photos yet — add your own, or try a sample.';
}

function buildOptionButtons() {
  const layoutsEl = document.getElementById('layouts');
  Object.entries(LAYOUTS).forEach(([key, layout]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = key;
    b.innerHTML = `${layout.name}<small>${layout.note}</small>`;
    b.addEventListener('click', () => {
      if (state.layout === key) return;
      pushHistory();
      state.layout = key;
      state.selected = 0;
      ensurePanels();
      buildPanelBar();
      syncControls();
      redraw();
      setStatus(`Layout: ${layout.name} — ${panelCount()} panels.`);
    });
    layoutsEl.appendChild(b);
  });
  const gradesEl = document.getElementById('grades');
  Object.entries(GRADES).forEach(([key, grade]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = key;
    b.innerHTML = `${grade.name}<small>${grade.accent}</small>`;
    b.style.borderTop = `4px solid ${grade.accent}`;
    b.addEventListener('click', () => {
      if (state.grade === key) return;
      pushHistory();
      state.grade = key;
      syncControls();
      redraw();
      setStatus(`Grade: ${grade.name}.`);
    });
    gradesEl.appendChild(b);
  });
}

function buildPanelBar() {
  panelBarEl.innerHTML = '';
  for (let i = 0; i < panelCount(); i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `Panel ${i + 1}`;
    b.addEventListener('click', () => {
      state.selected = i;
      syncPanelControls();
      syncThumbs();
      redraw();
    });
    panelBarEl.appendChild(b);
  }
}

function selectPanelAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const fx = (clientX - rect.left) / rect.width;
  const fy = (clientY - rect.top) / rect.height;
  const layout = LAYOUTS[state.layout];
  if (layout.band && fy >= layout.band.y) return false;
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const p = layout.panels[i];
    if (fx >= p.x && fx <= p.x + p.w && fy >= p.y && fy <= p.y + p.h) {
      state.selected = i;
      syncPanelControls();
      syncThumbs();
      redraw();
      setStatus(`Panel ${i + 1} selected — adjust its photo, zoom and position.`);
      return true;
    }
  }
  return false;
}

async function addPhotoFile(file) {
  const img = await loadImage(URL.createObjectURL(file));
  state.photos.push(img);
  state.photoNames.push(file.name.replace(/\.[^.]+$/, '').slice(0, 24) || `Photo ${state.photos.length}`);
  if (state.photos.length === 1) state.panels.forEach((p) => { p.photo = 0; });
  syncPanelControls();
  syncThumbs();
  redraw();
}

async function addSample(name, label) {
  const img = await loadImage(`samples/${name}.jpg`);
  state.photos.push(img);
  state.photoNames.push(label);
  if (state.photos.length === 1) state.panels.forEach((p) => { p.photo = 0; });
  syncPanelControls();
  syncThumbs();
  redraw();
  setStatus(`Sample “${label}” loaded — it fills every panel. Add your own photos to replace it.`);
}

/** Renders the cover at an export size and downloads it as a PNG. */
export function exportCover(sizeKey) {
  return new Promise((resolve) => {
    if (!state.photos.length) {
      setStatus('Add a photo first — the cover needs at least one.');
      resolve(false);
      return;
    }
    const [w, h] = EXPORT_SIZES[sizeKey];
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    drawCoverArt(off, state, { selected: -1, showSelection: false });
    off.toBlob((blob) => {
      if (!blob) { setStatus('Export failed — please try again.'); resolve(false); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `neon-coast-cover-${w}x${h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      setStatus(`Saved neon-coast-cover-${w}x${h}.png`);
      resolve(true);
    }, 'image/png');
  });
}

function bindControls() {
  document.getElementById('photos').addEventListener('change', async (e) => {
    for (const file of e.target.files) {
      try { await addPhotoFile(file); } catch { setStatus(`Could not read ${file.name}.`); }
    }
    e.target.value = '';
  });
  document.getElementById('sampleBoulevard').addEventListener('click', () => addSample('boulevard', 'Boulevard sample'));
  document.getElementById('samplePier').addEventListener('click', () => addSample('pier', 'Pier sample'));
  panelPhotoEl.addEventListener('change', () => {
    pushHistory();
    state.panels[state.selected].photo = Number(panelPhotoEl.value);
    syncPanelControls();
    syncThumbs();
    redraw();
  });
  document.getElementById('zoom').addEventListener('input', (e) => {
    state.panels[state.selected].zoom = Number(e.target.value);
    document.getElementById('zoomVal').textContent = `${state.panels[state.selected].zoom.toFixed(2)}×`;
    redraw();
  });
  document.getElementById('zoom').addEventListener('change', () => pushHistory());
  document.getElementById('offsetX').addEventListener('input', (e) => {
    state.panels[state.selected].ox = Number(e.target.value);
    redraw();
  });
  document.getElementById('offsetX').addEventListener('change', () => pushHistory());
  document.getElementById('offsetY').addEventListener('input', (e) => {
    state.panels[state.selected].oy = Number(e.target.value);
    redraw();
  });
  document.getElementById('offsetY').addEventListener('change', () => pushHistory());
  document.getElementById('fillAll').addEventListener('click', () => {
    pushHistory();
    const photo = state.panels[state.selected].photo;
    state.panels.forEach((p) => { p.photo = photo; });
    syncPanelControls();
    syncThumbs();
    redraw();
    setStatus(`All ${panelCount()} panels now use the same photo.`);
  });
  document.getElementById('shuffle').addEventListener('click', () => {
    if (state.photos.length < 2) { setStatus('Add at least two photos to shuffle panels.'); return; }
    pushHistory();
    const order = state.panels.map((p) => p.photo);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    state.panels.forEach((p, i) => { p.photo = order[i]; });
    syncPanelControls();
    syncThumbs();
    redraw();
    setStatus('Panels shuffled.');
  });
  document.getElementById('caption').addEventListener('input', (e) => { state.caption = e.target.value; redraw(); });
  document.getElementById('caption').addEventListener('change', () => pushHistory());
  document.getElementById('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  document.getElementById('subtitle').addEventListener('change', () => pushHistory());
  document.getElementById('badge').addEventListener('input', (e) => { state.badge = e.target.value; redraw(); });
  document.getElementById('badge').addEventListener('change', () => pushHistory());
  document.getElementById('stars').addEventListener('input', (e) => { state.stars = Number(e.target.value); redraw(); });
  document.getElementById('stars').addEventListener('change', () => pushHistory());
  document.getElementById('grain').addEventListener('change', (e) => { pushHistory(); state.grain = e.target.checked; redraw(); });
  document.getElementById('halftone').addEventListener('change', (e) => { pushHistory(); state.halftone = e.target.checked; redraw(); });
  document.querySelectorAll('input[name="size"]').forEach((r) => {
    r.addEventListener('change', () => {
      pushHistory();
      state.size = r.value;
      redraw();
      setStatus(`Preview size: ${r.value.replace('x', ' × ')}.`);
    });
  });
  document.getElementById('export').addEventListener('click', () => exportCover(state.size));
  document.getElementById('exportAll').addEventListener('click', async () => {
    setStatus('Exporting all three sizes…');
    for (const key of Object.keys(EXPORT_SIZES)) {
      await exportCover(key);
      await new Promise((r) => setTimeout(r, 350));
    }
    setStatus('Saved all three sizes: 1080×1080, 1080×1350 and 1920×1080.');
  });
  document.getElementById('undo').addEventListener('click', undo);
  document.getElementById('redo').addEventListener('click', redo);
  document.getElementById('reset').addEventListener('click', () => {
    pushHistory();
    state.layout = 'heroThree';
    state.grade = 'neonSunset';
    state.caption = 'NEON COAST';
    state.subtitle = 'sunset run';
    state.badge = 'LAUNCH WEEK';
    state.stars = 5;
    state.grain = true;
    state.halftone = true;
    state.selected = 0;
    state.panels = [];
    ensurePanels();
    buildPanelBar();
    syncControls();
    redraw();
    setStatus('Cover reset.');
  });
  canvas.addEventListener('click', (e) => selectPanelAt(e.clientX, e.clientY));
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  });
}

buildOptionButtons();
buildPanelBar();
ensurePanels();
bindControls();
syncControls();

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, state, { loadImage, addSample, redraw, syncControls, setStatus });
} else {
  redraw();
}
