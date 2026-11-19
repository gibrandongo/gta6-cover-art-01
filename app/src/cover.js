// Neon Coast Cover Studio — the cover renderer. Every panel, grade, letter and
// effect below is original art drawn on a 2D canvas: no game artwork, logo or font
// is used anywhere. Lettering is canvas-drawn with system fonts, squashed bold
// for the condensed poster look and a neon script for the subtitle.

/** Six multi-panel layouts. Each returns panels (fractions of the cover) plus the title band. */
export const LAYOUTS = {
  heroThree: {
    name: 'Hero + Three',
    note: 'Big hero, 3 stacked',
    panels: [
      { x: 0, y: 0, w: 0.62, h: 0.78 },
      { x: 0.62, y: 0, w: 0.38, h: 0.26 },
      { x: 0.62, y: 0.26, w: 0.38, h: 0.26 },
      { x: 0.62, y: 0.52, w: 0.38, h: 0.26 },
    ],
    band: { x: 0, y: 0.78, w: 1, h: 0.22 },
  },
  fourGrid: {
    name: 'Four Grid',
    note: 'Classic 2 x 2',
    panels: [
      { x: 0, y: 0, w: 0.5, h: 0.39 },
      { x: 0.5, y: 0, w: 0.5, h: 0.39 },
      { x: 0, y: 0.39, w: 0.5, h: 0.39 },
      { x: 0.5, y: 0.39, w: 0.5, h: 0.39 },
    ],
    band: { x: 0, y: 0.78, w: 1, h: 0.22 },
  },
  fullBleed: {
    name: 'Full Bleed',
    note: 'One photo, edge to edge',
    panels: [{ x: 0, y: 0, w: 1, h: 1 }],
    band: null,
  },
  tiltedSnaps: {
    name: 'Tilted Snaps',
    note: 'Three tilted snapshots',
    panels: [
      { x: 0.05, y: 0.06, w: 0.4, h: 0.6, rot: -0.07 },
      { x: 0.32, y: 0.1, w: 0.4, h: 0.6, rot: 0.05 },
      { x: 0.58, y: 0.05, w: 0.38, h: 0.62, rot: -0.03 },
    ],
    band: { x: 0, y: 0.78, w: 1, h: 0.22 },
    backdrop: true,
  },
  tripleStrip: {
    name: 'Triple Strip',
    note: 'Three tall columns',
    panels: [
      { x: 0, y: 0, w: 0.333, h: 0.78 },
      { x: 0.333, y: 0, w: 0.334, h: 0.78 },
      { x: 0.667, y: 0, w: 0.333, h: 0.78 },
    ],
    band: { x: 0, y: 0.78, w: 1, h: 0.22 },
  },
  ninePanel: {
    name: 'Nine Panel',
    note: 'The full poster grid',
    panels: [
      { x: 0, y: 0, w: 0.333, h: 0.26 }, { x: 0.333, y: 0, w: 0.334, h: 0.26 }, { x: 0.667, y: 0, w: 0.333, h: 0.26 },
      { x: 0, y: 0.26, w: 0.333, h: 0.26 }, { x: 0.333, y: 0.26, w: 0.334, h: 0.26 }, { x: 0.667, y: 0.26, w: 0.333, h: 0.26 },
      { x: 0, y: 0.52, w: 0.333, h: 0.26 }, { x: 0.333, y: 0.52, w: 0.334, h: 0.26 }, { x: 0.667, y: 0.52, w: 0.333, h: 0.26 },
    ],
    band: { x: 0, y: 0.78, w: 1, h: 0.22 },
  },
};

/** Five Vice City neon-sunset grades: sky, wash, accent, band and sun colours. */
export const GRADES = {
  neonSunset: { name: 'Neon Sunset', sky: ['#ff9a3d', '#ff2e88', '#7b2ff7'], wash: 'rgba(255,46,136,0.20)', accent: '#ff2e88', band: '#160a20', sun: '#ffd166' },
  vicePink: { name: 'Vice Pink', sky: ['#ff7ad9', '#ff2e88', '#2b1055'], wash: 'rgba(255,122,217,0.22)', accent: '#ff7ad9', band: '#1d0a24', sun: '#ffe3f2' },
  tealNight: { name: 'Teal Night', sky: ['#19e3d6', '#2b6cb0', '#1a0533'], wash: 'rgba(25,227,214,0.16)', accent: '#19e3d6', band: '#071826', sun: '#a7fff6' },
  goldenHour: { name: 'Golden Hour', sky: ['#ffd166', '#ff7b3d', '#b83b5e'], wash: 'rgba(255,150,60,0.20)', accent: '#ff9a3d', band: '#221006', sun: '#fff3c4' },
  palmNoir: { name: 'Palm Noir', sky: ['#8d6bff', '#3d2a6b', '#0d0518'], wash: 'rgba(141,107,255,0.22)', accent: '#8d6bff', band: '#0d0518', sun: '#e6dcff' },
};

/** Deterministic pseudo-random generator, so grain looks identical every redraw. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draws one photo cover-fit into a rect, with zoom and pan offsets. */
export function drawPanelPhoto(ctx, img, rect, crop) {
  if (!img) return false;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const zoom = crop?.zoom ?? 1;
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  // Pan interpolates edge to edge: -1 pins the photo's top/left to the panel,
  // 0 centres it, +1 pins the bottom/right — so a face at the top of a photo
  // can always be brought into a wide short panel.
  const ox = (crop?.ox ?? 0) + 1;
  const oy = (crop?.oy ?? 0) + 1;
  const dx = rect.x + (rect.w - dw) * ox / 2;
  const dy = rect.y + (rect.h - dh) * oy / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
  return true;
}

/** A striped retro sun disc, drawn in the sky of a panel. */
export function drawStripedSun(ctx, cx, cy, r, color, bg) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = color;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = bg;
  let y = cy + r * 0.05;
  let gap = r * 0.07;
  while (y < cy + r) {
    ctx.fillRect(cx - r, y, r * 2, gap);
    y += gap * 2.4;
    gap *= 1.35;
  }
  ctx.restore();
}

/** A small original palm silhouette for the title band corner. */
export function drawPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = s * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.12, y - s * 0.55, x + s * 0.3, y - s * 0.85);
  ctx.stroke();
  const topX = x + s * 0.3;
  const topY = y - s * 0.85;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI * (0.08 + i * 0.16);
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(
      topX + Math.cos(a) * s * 0.45, topY + Math.sin(a) * s * 0.3 - s * 0.12,
      topX + Math.cos(a) * s * 0.62, topY + Math.sin(a) * s * 0.42 + s * 0.18,
    );
    ctx.stroke();
  }
  ctx.restore();
}

/** Fits the caption to a width, returning the largest size that fits. */
export function fitTitleSize(ctx, text, maxWidth, startSize) {
  let size = startSize;
  ctx.font = `900 ${size}px "Arial Black", "Helvetica Neue", sans-serif`;
  while (size > 14 && ctx.measureText(text).width * 0.84 > maxWidth) {
    size -= 2;
    ctx.font = `900 ${size}px "Arial Black", "Helvetica Neue", sans-serif`;
  }
  return size;
}

/** The bold condensed genre title, gradient-filled with a dark outline. */
export function drawTitle(ctx, text, cx, y, maxWidth, size, accent) {
  const label = text.trim().toUpperCase();
  if (!label) return;
  const fit = fitTitleSize(ctx, label, maxWidth, size);
  const grad = ctx.createLinearGradient(0, y - fit, 0, y + fit * 0.12);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.55, '#ffe9a8');
  grad.addColorStop(1, accent);
  ctx.save();
  ctx.translate(cx, y);
  ctx.scale(0.84, 1);
  ctx.font = `900 ${fit}px "Arial Black", "Helvetica Neue", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(10,2,18,0.92)';
  ctx.lineWidth = fit * 0.09;
  ctx.shadowColor = accent;
  ctx.shadowBlur = fit * 0.22;
  ctx.strokeText(label, 0, 0);
  ctx.shadowBlur = 0;
  ctx.fillStyle = grad;
  ctx.fillText(label, 0, 0);
  ctx.restore();
}

/** The neon script subtitle with a pink glow. */
export function drawSubtitle(ctx, text, cx, y, size, accent) {
  const label = text.trim();
  if (!label) return;
  ctx.save();
  ctx.font = `italic 700 ${size}px "Segoe Script", "Brush Script MT", "Snell Roundhand", cursive`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = accent;
  ctx.shadowBlur = size * 0.7;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, cx, y);
  ctx.shadowBlur = 0;
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.9;
  ctx.fillText(label, cx, y);
  ctx.restore();
}

/** Halftone dot rows across the title band, in the grade accent. */
export function drawHalftone(ctx, x, y, w, accent) {
  ctx.save();
  ctx.fillStyle = accent;
  const step = Math.max(14, w / 90);
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i * step < w; i++) {
      const r = step * (0.16 + row * 0.09);
      ctx.globalAlpha = 0.5 - row * 0.13;
      ctx.beginPath();
      ctx.arc(x + i * step + (row % 2) * step * 0.5, y + row * step * 0.8, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Film grain: deterministic speckles over the whole cover. */
export function drawGrain(ctx, w, h) {
  const rand = seededRandom(20261119);
  ctx.save();
  const count = Math.floor((w * h) / 1600);
  for (let i = 0; i < count; i++) {
    const v = rand();
    ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(rand() * w, rand() * h, 1.6, 1.6);
  }
  ctx.restore();
}

/** Soft dark vignette around the edges. */
export function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(8,0,18,0)');
  g.addColorStop(1, 'rgba(8,0,18,0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** The title band: dark block, accent stripe, title, subtitle, stars and palm. */
export function drawTitleBand(ctx, band, state, grade) {
  const { w, h } = { w: band.w, h: band.h };
  const bg = ctx.createLinearGradient(band.x, band.y, band.x, band.y + h);
  bg.addColorStop(0, grade.band);
  bg.addColorStop(1, '#0a0412');
  ctx.fillStyle = bg;
  ctx.fillRect(band.x, band.y, w, h);
  ctx.fillStyle = grade.accent;
  ctx.fillRect(band.x, band.y, w, Math.max(4, h * 0.03));
  if (state.halftone) drawHalftone(ctx, band.x + w * 0.04, band.y + h * 0.1, w * 0.92, grade.accent);
  drawTitle(ctx, state.caption, band.x + w / 2, band.y + h * 0.62, w * 0.88, h * 0.42, grade.accent);
  ctx.fillStyle = grade.accent;
  ctx.fillRect(band.x + w * 0.5 - w * 0.08, band.y + h * 0.7, w * 0.16, Math.max(3, h * 0.022));
  drawSubtitle(ctx, state.subtitle, band.x + w / 2, band.y + h * 0.88, h * 0.2, grade.accent);
  drawPalm(ctx, band.x + w * 0.94, band.y + h * 0.98, h * 0.85, 'rgba(255,255,255,0.16)');
  const stars = '★'.repeat(state.stars) + '☆'.repeat(Math.max(0, 5 - state.stars));
  ctx.font = `700 ${Math.max(14, h * 0.16)}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd166';
  ctx.fillText(stars, band.x + w * 0.04, band.y + h * 0.32);
}

/** The badge ribbon, tilted in the top-right corner. */
export function drawBadge(ctx, text, w, accent) {
  const label = text.trim().toUpperCase();
  if (!label) return;
  ctx.save();
  ctx.translate(w * 0.86, w * 0.055);
  ctx.rotate(0.06);
  ctx.font = `900 ${Math.max(13, w * 0.021)}px "Arial Black", system-ui, sans-serif`;
  const tw = ctx.measureText(label).width + w * 0.05;
  const th = Math.max(22, w * 0.042);
  ctx.fillStyle = accent;
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.roundRect(-tw / 2, -th / 2, tw, th, th / 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 1);
  ctx.restore();
}

/**
 * Draws the whole cover onto `canvas` at its own pixel size.
 * state: { photos, panels, layout, grade, caption, subtitle, badge, stars, grain, halftone }
 * options: { selected, showSelection } — selection outline is editor-only, never exported.
 */
export function drawCoverArt(canvas, state, options = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const layout = LAYOUTS[state.layout] ?? LAYOUTS.heroThree;
  const grade = GRADES[state.grade] ?? GRADES.neonSunset;
  const gutter = Math.max(3, Math.round(W * 0.006));

  // Sunset sky backdrop (shows through gutters and the tilted-snaps layout).
  const sky = ctx.createLinearGradient(0, 0, W * 0.4, H);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(0.55, grade.sky[1]);
  sky.addColorStop(1, grade.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const bandH = layout.band ? layout.band.h * H : 0;
  if (layout.backdrop) {
    drawStripedSun(ctx, W * 0.5, H * 0.3, Math.min(W, H) * 0.17, grade.sun, grade.sky[1]);
    drawPalm(ctx, W * 0.03, H * 0.76, H * 0.3, 'rgba(10,2,18,0.55)');
    drawPalm(ctx, W * 0.9, H * 0.78, H * 0.24, 'rgba(10,2,18,0.45)');
  }

  // Panels, in layout order, each with its own photo, zoom and pan.
  layout.panels.forEach((panel, i) => {
    const crop = state.panels[i] ?? { photo: 0, zoom: 1, ox: 0, oy: 0 };
    const rect = {
      x: panel.x * W + gutter,
      y: panel.y * H + gutter,
      w: panel.w * W - gutter * 2,
      h: panel.h * H - gutter * 2,
    };
    ctx.save();
    if (panel.rot) {
      const cx = panel.x * W + (panel.w * W) / 2;
      const cy = panel.y * H + (panel.h * H) / 2;
      ctx.translate(cx, cy);
      ctx.rotate(panel.rot);
      ctx.translate(-cx, -cy);
      ctx.fillStyle = '#fdf8ef';
      ctx.fillRect(rect.x - gutter * 1.6, rect.y - gutter * 1.6, rect.w + gutter * 3.2, rect.h + gutter * 4.5);
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;
    }
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    const img = state.photos[crop.photo] ?? null;
    const drew = drawPanelPhoto(ctx, img, rect, crop);
    if (!drew) {
      const ph = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
      ph.addColorStop(0, grade.sky[1]);
      ph.addColorStop(1, grade.sky[2]);
      ctx.fillStyle = ph;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `700 ${Math.max(14, rect.w * 0.05)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
    }
    // Sunset wash over every panel, stronger at its foot.
    const wash = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
    wash.addColorStop(0, 'rgba(255,120,80,0)');
    wash.addColorStop(1, grade.wash);
    ctx.fillStyle = wash;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();

    // White poster gutter line around the panel.
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = Math.max(2, gutter * 0.7);
    if (panel.rot) {
      const cx = panel.x * W + (panel.w * W) / 2;
      const cy = panel.y * H + (panel.h * H) / 2;
      ctx.translate(cx, cy);
      ctx.rotate(panel.rot);
      ctx.translate(-cx, -cy);
    }
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();

    if (options.showSelection && options.selected === i) {
      ctx.save();
      ctx.strokeStyle = '#19e3d6';
      ctx.lineWidth = Math.max(3, W * 0.005);
      ctx.setLineDash([14, 10]);
      ctx.strokeRect(rect.x - 3, rect.y - 3, rect.w + 6, rect.h + 6);
      ctx.setLineDash([]);
      ctx.restore();
    }
  });

  // The striped sun lives only on the tilted-snaps sky backdrop, where there is
  // open sky for it; over a photo it would sit on someone's face.

  // Title: a band for panel layouts, a scrim for full bleed.
  if (layout.band) {
    drawTitleBand(ctx, { x: 0, y: H - bandH, w: W, h: bandH }, state, grade);
  } else {
    const scrim = ctx.createLinearGradient(0, H * 0.55, 0, H);
    scrim.addColorStop(0, 'rgba(10,2,18,0)');
    scrim.addColorStop(1, 'rgba(10,2,18,0.82)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);
    if (state.halftone) drawHalftone(ctx, W * 0.05, H * 0.78, W * 0.9, grade.accent);
    drawTitle(ctx, state.caption, W / 2, H * 0.9, W * 0.88, H * 0.11, grade.accent);
    drawSubtitle(ctx, state.subtitle, W / 2, H * 0.965, H * 0.032, grade.accent);
    const stars = '★'.repeat(state.stars) + '☆'.repeat(Math.max(0, 5 - state.stars));
    ctx.font = `700 ${Math.max(14, H * 0.024)}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd166';
    ctx.fillText(stars, W * 0.05, H * 0.82);
  }

  drawBadge(ctx, state.badge, W, grade.accent);

  if (state.grain) {
    drawGrain(ctx, W, H);
    drawVignette(ctx, W, H);
  }

  // Thin outer poster frame.
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(3, W * 0.004);
  ctx.strokeRect(gutter / 2, gutter / 2, W - gutter, H - gutter);
}
