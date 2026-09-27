// preview_portrait.js — Local preview, mirrors browser renderer exactly
// Run: node preview_portrait.js → saves preview.png

const { createCanvas, registerFont } = require('canvas');
const fs   = require('fs');
const jpeg = require('jpeg-js');

// ── 1. Load image ─────────────────────────────────────────────────────────────
const jpegData = fs.readFileSync('assets/thanh.png');
const img = jpeg.decode(jpegData, { useTArray: true });
const IW = img.width, IH = img.height;
console.log(`Image: ${IW}x${IH}`);

function px(x, y) {
    const i = (y * IW + x) * 4;
    return { r: img.data[i], g: img.data[i+1], b: img.data[i+2] };
}
function lum(x, y) {
    const {r,g,b} = px(x,y);
    return (0.299*r + 0.587*g + 0.114*b) / 255;
}

// ── 2. Build per-pixel subject mask with color segmentation ───────────────────
// Strategy: mark each pixel as background or subject
// isBackground rules derived from the specific photo

function isBackground(x, y) {
    const {r,g,b} = px(x,y);
    const total = r + g + b + 1;
    const redness = r / total;
    const l = (0.299*r + 0.587*g + 0.114*b) / 255;
    const maxC = Math.max(r,g,b), minC = Math.min(r,g,b);
    const sat  = maxC - minC;       // 0 = grey, 255 = fully saturated
    const yr   = y / IH;

    // Orange wall: very red/warm, clear orange saturation
    if (redness > 0.41 && r - b > 75 && l > 0.32) return true;

    // Pampas grass / beige: warm neutral, mid-bright
    if (l > 0.50 && r > 140 && g > 120 && b > 100 && (r - b) < 58 && sat < 75) return true;

    // Astronaut white suit & white table: near-white
    if (r > 185 && g > 180 && b > 175) return true;

    // Moon (cool grey): low saturation, mid-lum, slightly blue
    if (l > 0.37 && l < 0.63 && sat < 38 && b >= r) return true;

    // Teal drink (right): clearly blue-green dominant
    if (b > r + 40 && b > g + 15 && l > 0.30) return true;

    // Top-of-frame background (astronaut area): y < 38% + not very dark
    if (yr < 0.38 && l > 0.22) return true;

    return false;
}

// ── 3. Down-sample to grid (120 wide) ────────────────────────────────────────
const GW = 120;
const GH = Math.round(GW * (IH / IW));

const mask  = new Uint8Array(GW * GH); // 0 = background, 1 = subject
const lumaG = new Float32Array(GW * GH);

for (let gy = 0; gy < GH; gy++) {
    const srcY = Math.floor((gy / GH) * IH);
    for (let gx = 0; gx < GW; gx++) {
        const srcX = Math.floor((gx / GW) * IW);
        if (isBackground(srcX, srcY)) {
            mask[gy*GW+gx]  = 0;
            lumaG[gy*GW+gx] = 1.0;
        } else {
            mask[gy*GW+gx]  = 1;
            lumaG[gy*GW+gx] = lum(srcX, srcY);
        }
    }
}

// Small morphological close: fill isolated background holes (1-pass 3×3 majority)
const maskOut = new Uint8Array(mask);
for (let gy = 1; gy < GH-1; gy++) {
    for (let gx = 1; gx < GW-1; gx++) {
        if (mask[gy*GW+gx] === 0) {
            let subjectNeighbors = 0;
            for (let dy=-1; dy<=1; dy++)
                for (let dx=-1; dx<=1; dx++)
                    if (mask[(gy+dy)*GW+(gx+dx)]) subjectNeighbors++;
            if (subjectNeighbors >= 6) maskOut[gy*GW+gx] = 1; // fill hole
        }
    }
}

// Print ASCII debug map
console.log('\n--- Subject mask (subject=█, bg=·) ---');
for (let gy = 0; gy < GH; gy += 2) {
    let row = '';
    for (let gx = 0; gx < GW; gx++) {
        row += maskOut[gy*GW+gx] ? '█' : '·';
    }
    console.log(row);
}

// ── 4. Render to canvas ───────────────────────────────────────────────────────
const CW = 600;
const CH = Math.round(CW * (GH / GW));
const canvas = createCanvas(CW, CH);
const ctx    = canvas.getContext('2d');

ctx.fillStyle = '#0d0d1a';
ctx.fillRect(0, 0, CW, CH);

const scaleX = CW / GW;
const scaleY = CH / GH;
const WORD   = 'Thanh';

// Render: one word per subject pixel, strictly size+opacity by darkness
// This gives clean "shape visible through words" effect

for (let gy = 0; gy < GH; gy++) {
    for (let gx = 0; gx < GW; gx++) {
        if (!maskOut[gy*GW+gx]) continue;

        const b        = lumaG[gy*GW+gx];
        const darkness = 1 - b;           // 0 = white, 1 = black

        // Brightness buckets → size & opacity
        let fontSize, alpha;
        if      (darkness > 0.75) { fontSize = 15; alpha = 1.00; }  // hair, dress core
        else if (darkness > 0.55) { fontSize = 12; alpha = 0.85; }  // shadow, dark fold
        else if (darkness > 0.38) { fontSize = 9;  alpha = 0.60; }  // midtone / face contour
        else if (darkness > 0.20) { fontSize = 6;  alpha = 0.35; }  // skin / light areas
        else                      { fontSize = 4;  alpha = 0.15; }  // very bright (white blouse etc)

        // Slight random rotation for organic look
        const angle = (Math.random() - 0.5) * 0.65;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `700 ${fontSize}px sans-serif`;
        // Dark areas: bright near-white; light skin: soft pink
        ctx.fillStyle = darkness > 0.50 ? '#fff0f5' : '#ff85a2';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.translate((gx + 0.5) * scaleX, (gy + 0.5) * scaleY);
        ctx.rotate(angle);
        ctx.fillText(WORD, 0, 0);
        ctx.restore();
    }
}

// Vignette
const v = ctx.createRadialGradient(CW/2,CH/2,CH*0.18, CW/2,CH/2,CH*0.68);
v.addColorStop(0,'rgba(0,0,0,0)');
v.addColorStop(1,'rgba(13,13,26,0.60)');
ctx.fillStyle = v;
ctx.fillRect(0, 0, CW, CH);

// Save
const out = fs.createWriteStream('preview.png');
canvas.createPNGStream().pipe(out);
out.on('finish', () => console.log(`\n✅ Saved preview.png (${CW}x${CH})`));
