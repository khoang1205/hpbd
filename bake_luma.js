const fs = require('fs');
const jpeg = require('jpeg-js');

const jpegData = fs.readFileSync('assets/thanh.png');
const img = jpeg.decode(jpegData, { useTArray: true });

console.log(`Image: ${img.width}x${img.height}`);

// Use FULL image (no crop) so we keep the face at top
const GRID_W = 120;
const GRID_H = Math.round(GRID_W * (img.height / img.width));

const lumaData = new Uint8Array(GRID_W * GRID_H);

for (let y = 0; y < GRID_H; y++) {
    const srcY = Math.floor((y / GRID_H) * img.height);
    for (let x = 0; x < GRID_W; x++) {
        const srcX = Math.floor((x / GRID_W) * img.width);
        const i = (srcY * img.width + srcX) * 4;

        const R = img.data[i];
        const G = img.data[i + 1];
        const B = img.data[i + 2];

        const lum = (0.299 * R + 0.587 * G + 0.114 * B) / 255;

        // ---- Background detection ----
        // Orange wall: R much > B, and medium-high brightness
        const isOrange = (R - B > 55) && (R / (R + G + B + 1) > 0.38) && lum > 0.38;

        // Pampas grass / beige background: all channels reasonably high and close together
        const isPampas = R > 140 && G > 120 && B > 100 && lum > 0.55 && (R - B) < 60;

        // Moon (grey): low saturation high value
        const maxC = Math.max(R, G, B);
        const minC = Math.min(R, G, B);
        const isMoon = lum > 0.40 && (maxC - minC) < 50 && lum < 0.70 && B > 100;

        // Astronaut / table (white/very light): all channels very high
        const isWhite = R > 185 && G > 180 && B > 175;

        // Drink glass right side (light teal): B > R and mid-bright
        const isTeal = B > R && B > G && lum > 0.45;

        const isBackground = isOrange || isPampas || isWhite || isMoon || isTeal;

        // Write 255 (white/skip) for background, actual luminance for subject
        lumaData[y * GRID_W + x] = isBackground ? 255 : Math.round(lum * 255);
    }
}

// Encode as base64
const buf = Buffer.from(lumaData);
const b64 = buf.toString('base64');

const jsContent = `// Pre-computed luminance grid with background removal
// Only the subject (person) has non-white values; background = 255 (skip)
window.THANH_PORTRAIT = {
  width: ${GRID_W},
  height: ${GRID_H},
  data: "${b64}"
};
`;

fs.writeFileSync('assets/thanh_art.js', jsContent);
console.log(`Done! Grid: ${GRID_W}x${GRID_H}, b64 length: ${b64.length}`);
