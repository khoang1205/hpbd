const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

async function processChibiFrames() {
    const file1 = 'C:\\Users\\ACER\\.gemini\\antigravity\\brain\\2fc8fa4f-77b2-4530-bdaf-e0009653630d\\chibi_birthday_girl_1790511880631.jpg';
    const file2 = 'C:\\Users\\ACER\\.gemini\\antigravity\\brain\\2fc8fa4f-77b2-4530-bdaf-e0009653630d\\chibi_blown_candles_1790512759378.jpg';

    async function removeWhiteBg(imgPath, outPath) {
        const img = await loadImage(imgPath);
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Flood fill or edge-aware white removal from border
        // Simple threshold for outer white background:
        // Any pixel connected to the edges with R, G, B > 245
        const width = canvas.width;
        const height = canvas.height;
        const visited = new Uint8Array(width * height);
        const queue = [];

        // Add border pixels to queue if they are white-ish
        function isWhite(x, y) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            return r > 240 && g > 240 && b > 240;
        }

        for (let x = 0; x < width; x++) {
            if (isWhite(x, 0)) queue.push([x, 0]);
            if (isWhite(x, height - 1)) queue.push([x, height - 1]);
        }
        for (let y = 0; y < height; y++) {
            if (isWhite(0, y)) queue.push([0, y]);
            if (isWhite(width - 1, y)) queue.push([width - 1, y]);
        }

        // BFS flood fill to only remove external background, protecting internal white clothes/eyes!
        let head = 0;
        while (head < queue.length) {
            const [cx, cy] = queue[head++];
            const cIdx = cy * width + cx;
            if (visited[cIdx]) continue;
            visited[cIdx] = 1;

            const pIdx = cIdx * 4;
            data[pIdx + 3] = 0; // Transparent!

            const neighbors = [
                [cx + 1, cy], [cx - 1, cy],
                [cx, cy + 1], [cx, cy - 1]
            ];
            for (const [nx, ny] of neighbors) {
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const nIdx = ny * width + nx;
                    if (!visited[nIdx] && isWhite(nx, ny)) {
                        queue.push([nx, ny]);
                    }
                }
            }
        }

        ctx.putImageData(imgData, 0, 0);
        const buf = canvas.toBuffer('image/png');
        fs.writeFileSync(outPath, buf);
        console.log(`Saved transparent PNG: ${outPath}`);
    }

    const outDir = path.join(__dirname, 'assets');
    await removeWhiteBg(file1, path.join(outDir, 'chibi_burning.png'));
    await removeWhiteBg(file2, path.join(outDir, 'chibi_blown.png'));
    console.log('Chibi frames processed successfully!');
}

processChibiFrames().catch(console.error);
