// Fixed scenes for screenshots: ?shot=editor shows the editor with sample photos
// loaded; ?shot=cover hides the editor and shows the exported cover alone, drawn
// by the app itself at the chosen export size. Query params: photo, photo2,
// caption, subtitle, layout, grade, size. window.__shotReady is set once painted.
export async function runShot(shot, query, state, helpers) {
  const { loadImage, redraw, syncControls, setStatus } = helpers;
  const caption = query.get('caption') ?? 'NEON COAST';
  const subtitle = query.get('subtitle') ?? 'sunset run';
  const layout = query.get('layout') ?? 'heroThree';
  const grade = query.get('grade') ?? 'neonSunset';
  const size = query.get('size') ?? '1920x1080';

  async function loadSample(name, label) {
    const img = await loadImage(`samples/${name}.jpg`);
    state.photos.push(img);
    state.photoNames.push(label);
  }

  await loadSample(query.get('photo') ?? 'boulevard', 'Boulevard sample');
  if (query.get('photo2')) await loadSample(query.get('photo2'), 'Pier sample');
  state.caption = caption;
  state.subtitle = subtitle;
  state.layout = layout;
  state.grade = grade;
  state.size = size;
  state.panels = [];
  if (state.photos.length === 2) {
    // Spread the two samples across the panels for a multi-photo cover, panned
    // up so faces stay in frame in the wide short panels.
    const n = { heroThree: 4, fourGrid: 4, fullBleed: 1, tiltedSnaps: 3, tripleStrip: 3, ninePanel: 9 }[layout] ?? 4;
    for (let i = 0; i < n; i++) state.panels.push({ photo: i % 2, zoom: 1.15, ox: 0, oy: -0.9 });
  }
  state.selected = 0;
  if (shot === 'cover') document.body.classList.add('shot-cover');
  if (shot === 'editor') state.selected = 1;
  syncControls();
  redraw();
  setStatus('Screenshot scene ready.');
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
