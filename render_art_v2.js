const fs = require('fs');
const jpeg = require('jpeg-js');

const jpegData = fs.readFileSync('assets/thanh.png');
const img = jpeg.decode(jpegData, { useTArray: true });

console.log(`Image: ${img.width}x${img.height}`);

// Build luminance grid
const lum = [];
for (let y = 0; y < img.height; y++) {
    lum[y] = new Float32Array(img.width);
    for (let x = 0; x < img.width; x++) {
        const i = (y * img.width + x) * 4;
        lum[y][x] = (0.299 * img.data[i] + 0.587 * img.data[i+1] + 0.114 * img.data[i+2]) / 255;
    }
}

// Sobel edge detection helper
function edgeAt(y, x) {
    if (y < 1 || y >= img.height - 1 || x < 1 || x >= img.width - 1) return 0;
    const gx =
        -lum[y-1][x-1] + lum[y-1][x+1]
        -2*lum[y][x-1] + 2*lum[y][x+1]
        -lum[y+1][x-1] + lum[y+1][x+1];
    const gy =
        -lum[y-1][x-1] - 2*lum[y-1][x] - lum[y-1][x+1]
        +lum[y+1][x-1] + 2*lum[y+1][x] + lum[y+1][x+1];
    return Math.sqrt(gx*gx + gy*gy);
}

// Focus on person: crop y: 32% - 98%
const startY = Math.floor(img.height * 0.32);
const endY   = Math.floor(img.height * 0.98);
const cropH  = endY - startY;

const W = 90;
const fontAspect = 0.46;
const H = Math.round((W * (cropH / img.width)) * fontAspect);

const word = "Thanh ";
let wordIdx = 0;
let art = "";

for (let y = 0; y < H; y++) {
    const srcY = startY + Math.floor((y / H) * cropH);
    for (let x = 0; x < W; x++) {
        const srcX = Math.floor((x / W) * img.width);
        const b = lum[srcY][srcX];
        const edge = edgeAt(srcY, srcX);
        const xr = srcX / img.width;
        const yr = (srcY - startY) / cropH;

        let isChar = false;

        // 1. Strong dark pixels = hair, dress, shadows
        if (b < 0.38) isChar = true;

        // 2. Edges (face contour, dress edge, cake box outline)
        else if (edge > 0.14) isChar = true;

        // 3. Face region: mid-tone skin with features
        else if (yr < 0.50 && xr >= 0.30 && xr <= 0.65 && b < 0.60) isChar = true;

        // 4. Black dress area (middle body)
        else if (yr >= 0.40 && yr <= 0.80 && b < 0.44) isChar = true;

        // 5. Drink straw + glass outline (right side)
        else if (yr >= 0.55 && xr >= 0.74 && b < 0.60 && edge > 0.06) isChar = true;

        if (isChar) {
            art += word[wordIdx++ % word.length];
        } else {
            art += " ";
        }
    }
    art += "\n";
}

fs.writeFileSync('assets/thanh_art.txt', art);
const jsContent = `// Text Art portrait of Thanh (birthday cake photo), generated via Sobel edge + luminance
window.THANH_TEXT_ART = ${JSON.stringify(art)};
`;
fs.writeFileSync('assets/thanh_art.js', jsContent);
console.log(`Done! Art is ${W}x${H} chars.`);
console.log(art);
