const fs = require('fs');
const jpeg = require('jpeg-js');
const { createCanvas } = require('canvas');

// Load original portrait
const img = jpeg.decode(fs.readFileSync('anh1.jpg'), { useTArray: true });
const IW = img.width, IH = img.height;
console.log(`Loaded image: ${IW}x${IH}`);

// ── luminance + sobel edge at full res ────────────────────────────────
const lum = new Float32Array(IW * IH);
for (let y = 0; y < IH; y++) {
  for (let x = 0; x < IW; x++) {
    const p = (y * IW + x) * 4;
    lum[y * IW + x] = 0.299 * img.data[p] + 0.587 * img.data[p + 1] + 0.114 * img.data[p + 2];
  }
}

function sobel(x, y) {
  if (x < 1 || y < 1 || x >= IW - 1 || y >= IH - 1) return 0;
  const gx = -lum[(y - 1) * IW + x - 1] + lum[(y - 1) * IW + x + 1]
             - 2 * lum[y * IW + x - 1] + 2 * lum[y * IW + x + 1]
             - lum[(y + 1) * IW + x - 1] + lum[(y + 1) * IW + x + 1];
  const gy = -lum[(y - 1) * IW + x - 1] - 2 * lum[(y - 1) * IW + x] - lum[(y - 1) * IW + x + 1]
             + lum[(y + 1) * IW + x - 1] + 2 * lum[(y + 1) * IW + x] + lum[(y + 1) * IW + x + 1];
  return Math.sqrt(gx * gx + gy * gy);
}

// ── Person detection focused on Thanh ──────────────────────────────────
function cinfo(x, y) {
  const p = (y * IW + x) * 4;
  const r = img.data[p], g = img.data[p + 1], b = img.data[p + 2];
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d > 0) {
    if (mx === r) h = ((g - b) / d) % 6;
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { r, g, b, h, v: mx, s: mx > 0 ? d / mx : 0, l: lum[y * IW + x] };
}

function isThanh(x, y) {
  const xr = x / IW, yr = y / IH;
  // Thanh is in the lower half of image (top of hair starts around y: 0.49)
  if (yr < 0.48) return false;
  if (xr < 0.16 || xr > 0.84) return false;

  const c = cinfo(x, y);
  const rb = c.r - c.b;

  // Dark hair / dark dress (very low luminance)
  if (c.l < 95) return true;

  // Skin tones (face, neck, shoulders, arms, hands)
  if (c.h >= 6 && c.h <= 48 && c.l >= 100 && c.l <= 220 && rb >= 25 && c.r >= c.g && c.g >= c.b) {
    return true;
  }

  // Lips (reddish)
  if (c.r > 130 && c.r > c.g + 30 && c.r > c.b + 30) return true;

  // Cake in hands (box, white frosting, pink accents)
  if (yr >= 0.74 && yr <= 0.88 && xr >= 0.42 && xr <= 0.65) {
    if (c.l > 80) return true;
  }

  return false;
}

const raw = new Uint8Array(IW * IH);
for (let y = 0; y < IH; y++) {
  for (let x = 0; x < IW; x++) {
    raw[y * IW + x] = isThanh(x, y) ? 1 : 0;
  }
}

// Morphological clean
function majority(m, it) {
  let cur = m;
  for (let k = 0; k < it; k++) {
    const out = new Uint8Array(cur);
    for (let y = 1; y < IH - 1; y++) {
      for (let x = 1; x < IW - 1; x++) {
        let s = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            s += cur[(y + dy) * IW + (x + dx)];
          }
        }
        out[y * IW + x] = s >= 5 ? 1 : 0;
      }
    }
    cur = out;
  }
  return cur;
}

function dilate(m) {
  const o = new Uint8Array(m);
  for (let y = 1; y < IH - 1; y++) {
    for (let x = 1; x < IW - 1; x++) {
      if (m[y * IW + x]) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            o[(y + dy) * IW + (x + dx)] = 1;
          }
        }
      }
    }
  }
  return o;
}

let clean = majority(raw, 2);
clean = dilate(clean);

// ── Crop box to Thanh ────────────────────────────────────────────────────
let minX = IW, minY = IH, maxX = 0, maxY = 0;
for (let y = 0; y < IH; y++) {
  for (let x = 0; x < IW; x++) {
    if (clean[y * IW + x]) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

const pad = Math.round((maxY - minY) * 0.02);
minX = Math.max(0, minX - pad);
maxX = Math.min(IW - 1, maxX + pad);
minY = Math.max(0, minY - pad);
maxY = Math.min(IH - 1, maxY + pad);

console.log(`Thanh bounding box: x:[${minX}..${maxX}], y:[${minY}..${maxY}]`);

// ── Grid Setup for LARGER & CRISPER Typography ─────────────────────────
// 58 columns across Thanh's portrait for large, clear "Thanh" text matching user reference
const GW = 58;
const GH = Math.round(GW * (maxY - minY) / (maxX - minX));
const maskG = new Uint8Array(GW * GH);
const lumG = new Float32Array(GW * GH);
const edgeG = new Float32Array(GW * GH);
const colG = new Float32Array(GW * GH * 3);

for (let gy = 0; gy < GH; gy++) {
  for (let gx = 0; gx < GW; gx++) {
    const x0 = minX + Math.floor((gx / GW) * (maxX - minX));
    const x1 = minX + Math.floor(((gx + 1) / GW) * (maxX - minX));
    const y0 = minY + Math.floor((gy / GH) * (maxY - minY));
    const y1 = minY + Math.floor(((gy + 1) / GH) * (maxY - minY));
    let mcnt = 0, n = 0, lsum = 0, esum = 0, rs = 0, gs = 0, bs = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        if (x < 0 || y < 0 || x >= IW || y >= IH) continue;
        const i = y * IW + x;
        n++;
        if (clean[i]) mcnt++;
        lsum += lum[i];
        esum += sobel(x, y);
        rs += img.data[i * 4];
        gs += img.data[i * 4 + 1];
        bs += img.data[i * 4 + 2];
      }
    }
    const ci = gy * GW + gx;
    if (n === 0) {
      maskG[ci] = 0; lumG[ci] = 0; edgeG[ci] = 0;
      colG[ci * 3] = 0; colG[ci * 3 + 1] = 0; colG[ci * 3 + 2] = 0;
      continue;
    }
    maskG[ci] = (mcnt / n > 0.38) ? 1 : 0;
    lumG[ci] = lsum / n / 255;
    edgeG[ci] = esum / n / 255;
    colG[ci * 3] = rs / n;
    colG[ci * 3 + 1] = gs / n;
    colG[ci * 3 + 2] = bs / n;
  }
}

// ── Render Ultra-Crisp Canvas ──────────────────────────────────────────
const CW = 2400;
const CH = Math.round(CW * (GH / GW));
const canvas = createCanvas(CW, CH);
const ctx = canvas.getContext('2d');

// Deep dark background
ctx.fillStyle = '#0a0a16';
ctx.fillRect(0, 0, CW, CH);

const WORD = 'Thanh';
const cellW = CW / GW;
const cellH = CH / GH;

// Large readable font size: ~15px - 22px in ultra-HD
const baseFont = Math.min(cellW * 0.95 / (WORD.length * 0.52), cellH * 0.85);
console.log(`Canvas: ${CW}x${CH}, Grid: ${GW}x${GH}, BaseFont: ${baseFont.toFixed(1)}px, Cell: ${cellW.toFixed(1)}x${cellH.toFixed(1)}px`);

for (let gy = 0; gy < GH; gy++) {
  for (let gx = 0; gx < GW; gx++) {
    if (!maskG[gy * GW + gx]) continue;
    const b = lumG[gy * GW + gx];
    const e = edgeG[gy * GW + gx];
    const darkness = 1 - b;
    const ink = Math.min(1, darkness * 0.85 + e * 1.5);

    let fontSize, alpha;
    if (ink > 0.75) { fontSize = baseFont * 1.05; alpha = 1.0; }
    else if (ink > 0.55) { fontSize = baseFont * 0.95; alpha = 0.95; }
    else if (ink > 0.38) { fontSize = baseFont * 0.85; alpha = 0.82; }
    else if (ink > 0.22) { fontSize = baseFont * 0.75; alpha = 0.65; }
    else if (ink > 0.10) { fontSize = baseFont * 0.65; alpha = 0.45; }
    else { fontSize = baseFont * 0.58; alpha = 0.30; }

    const angle = (Math.random() - 0.5) * 0.12; // slight organic tilt
    
    // Color enhancement
    let cr = colG[(gy * GW + gx) * 3];
    let cg = colG[(gy * GW + gx) * 3 + 1];
    let cb = colG[(gy * GW + gx) * 3 + 2];
    const clum = (0.299 * cr + 0.587 * cg + 0.114 * cb) / 255;

    let boost = 1.0;
    if (clum < 0.30) boost = 1.65;
    else if (clum < 0.50) boost = 1.35;
    else if (clum < 0.70) boost = 1.15;
    else boost = 1.02;

    cr = Math.min(255, cr * boost);
    cg = Math.min(255, cg * boost);
    cb = Math.min(255, cb * boost);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${Math.round(fontSize)}px "Segoe UI", Arial, sans-serif`;
    ctx.fillStyle = `rgb(${Math.round(cr)}, ${Math.round(cg)}, ${Math.round(cb)})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate((gx + 0.5) * cellW, (gy + 0.5) * cellH);
    ctx.rotate(angle);
    ctx.fillText(WORD, 0, 0);
    ctx.restore();
  }
}

// Soft radial vignette
const v = ctx.createRadialGradient(CW / 2, CH / 2, CH * 0.28, CW / 2, CH / 2, CH * 0.75);
v.addColorStop(0, 'rgba(0,0,0,0)');
v.addColorStop(1, 'rgba(10,10,22,0.45)');
ctx.fillStyle = v;
ctx.fillRect(0, 0, CW, CH);

fs.writeFileSync('assets/typography_thanh_color.png', canvas.toBuffer('image/png'));
fs.writeFileSync('typography_thanh_color.png', canvas.toBuffer('image/png'));
console.log('✅ Generated high-resolution typography_thanh_color.png successfully!');
