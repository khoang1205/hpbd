const fs = require('fs');
const jpeg = require('jpeg-js');

const jpegData = fs.readFileSync('assets/thanh.png');
const img = jpeg.decode(jpegData, { useTArray: true });

// Focus on subject: crop top 32% (mostly orange background)
const cropStartY = Math.floor(img.height * 0.32);
const cropH = img.height - cropStartY;

// Downsample to 120 wide grid for canvas rendering
const GRID_W = 120;
const GRID_H = Math.round(GRID_W * (cropH / img.width));

const lumaData = new Uint8Array(GRID_W * GRID_H);

for (let y = 0; y < GRID_H; y++) {
    const srcY = cropStartY + Math.floor((y / GRID_H) * cropH);
    for (let x = 0; x < GRID_W; x++) {
        const srcX = Math.floor((x / GRID_W) * img.width);
        const i = (srcY * img.width + srcX) * 4;
        const lum = Math.round(0.299 * img.data[i] + 0.587 * img.data[i+1] + 0.114 * img.data[i+2]);
        lumaData[y * GRID_W + x] = lum;
    }
}

// Encode as compact base64 string
const buf = Buffer.from(lumaData);
const b64 = buf.toString('base64');

const jsContent = `// Pre-computed luminance grid for text-portrait canvas renderer
// Generated from assets/thanh.png — no CORS issues at runtime
window.THANH_PORTRAIT = {
  width: ${GRID_W},
  height: ${GRID_H},
  data: "${b64}"
};
`;

fs.writeFileSync('assets/thanh_art.js', jsContent);
console.log(`Done! Grid: ${GRID_W}x${GRID_H}, data length: ${b64.length} chars`);
