// Run: node generate_portraits.js [lan|thanh|xinh|dep]
// Sources, silhouette points and words are independent for each portrait.
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const portraits = [
  { id: 'thanh', word: 'Thanh', outline: [[.12,.80],[.17,.76],[.20,.69],[.23,.66],[.23,.63],[.26,.61],[.30,.59],[.30,.55],[.31,.48],[.33,.40],[.34,.32],[.37,.26],[.42,.21],[.46,.185],[.52,.18],[.57,.19],[.62,.22],[.65,.26],[.67,.31],[.68,.38],[.70,.45],[.72,.50],[.76,.515],[.79,.54],[.795,.57],[.83,.59],[.89,.64],[.93,.67],[.925,.70],[.965,.735],[.955,.76],[.965,.785],[.93,.82],[.86,.83],[.84,.88],[.81,.91],[.81,.94],[.88,1],[.30,1],[.29,.95],[.22,.94],[.17,.92],[.13,.89],[.135,.83]] },
  { id: 'lan', word: 'Lan', outline: [[.03,1],[.05,.87],[.01,.80],[.12,.71],[.19,.65],[.29,.57],[.32,.40],[.33,.32],[.39,.25],[.49,.22],[.59,.22],[.69,.24],[.78,.28],[.83,.35],[.85,.45],[.89,.56],[.97,.67],[1,.79],[1,1]] },
  { id: 'xinh', word: 'Xinh', outline: [[.03,1],[.03,.91],[.01,.85],[.07,.75],[.17,.65],[.29,.58],[.33,.47],[.35,.34],[.40,.27],[.49,.23],[.61,.23],[.73,.25],[.79,.31],[.83,.42],[.86,.53],[.91,.62],[.96,.72],[1,.82],[1,1]] },
  { id: 'dep', word: 'Đẹp', outline: [[.27,.89],[.28,.85],[.30,.82],[.33,.80],[.34,.78],[.39,.74],[.42,.70],[.42,.66],[.41,.63],[.44,.60],[.43,.58],[.41,.55],[.40,.52],[.41,.49],[.45,.48],[.49,.49],[.52,.48],[.56,.49],[.58,.51],[.57,.54],[.59,.56],[.60,.58],[.66,.59],[.69,.62],[.70,.65],[.69,.68],[.72,.72],[.78,.77],[.83,.81],[.87,.83],[.88,.87],[.86,.90],[.84,.90],[.83,.86],[.79,.85],[.74,.82],[.70,.78],[.66,.74],[.66,.79],[.69,.85],[.72,.93],[.72,1],[.45,1],[.46,.94],[.47,.88],[.47,.84],[.43,.83],[.42,.80],[.39,.81],[.38,.84],[.41,.86],[.41,.89],[.38,.91],[.30,.91]] }
];

async function render(portrait) {
  const img = await loadImage(path.join(__dirname, 'assets', 'portraits', `${portrait.id}.png`));
  const source = createCanvas(img.width, img.height);
  const sc = source.getContext('2d');
  sc.drawImage(img, 0, 0);
  const pixels = sc.getImageData(0, 0, img.width, img.height).data;
  const mask = createCanvas(img.width, img.height);
  const mc = mask.getContext('2d');
  mc.beginPath();
  portrait.outline.forEach(([x, y], i) => mc[i ? 'lineTo' : 'moveTo'](x * img.width, y * img.height));
  mc.closePath();
  mc.fill();
  const silhouette = mc.getImageData(0, 0, img.width, img.height).data;
  const xs = portrait.outline.map(p => p[0]);
  const ys = portrait.outline.map(p => p[1]);
  const left = Math.max(0, Math.min(...xs) - .025) * img.width;
  const top = Math.max(0, Math.min(...ys) - .025) * img.height;
  const width = (Math.min(1, Math.max(...xs) + .025) * img.width) - left;
  const height = (Math.min(1, Math.max(...ys) + .025) * img.height) - top;
  // Every portrait uses the same 3:4 frame, fitting without stretching or cropping.
  const canvas = createCanvas(2400, 3200);
  const scale = Math.min(canvas.width / width, canvas.height / height);
  const drawWidth = width * scale, drawHeight = height * scale;
  const drawLeft = (canvas.width - drawWidth) / 2;
  const drawTop = (canvas.height - drawHeight) / 2;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0b0b18';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const columns = 90;
  const cellW = canvas.width / columns;
  // Measure real glyph widths, including Vietnamese accents.
  ctx.font = '600 100px "Segoe UI", Arial, sans-serif';
  const fontSize = Math.min(13, cellW * .91 / ctx.measureText(portrait.word).width * 100);
  const rows = Math.round(canvas.height / (fontSize * 1.32));
  const cellH = canvas.height / rows;
  ctx.font = `600 ${fontSize}px "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Convert the word to paths once: no font downloads or missing Vietnamese glyphs.
  const wordCanvas = createCanvas(100, 40, 'svg');
  const wordCtx = wordCanvas.getContext('2d');
  wordCtx.font = ctx.font;
  wordCtx.textAlign = 'center';
  wordCtx.textBaseline = 'middle';
  wordCtx.fillText(portrait.word, 50, 20, cellW * .94);
  const wordPaths = wordCanvas.toBuffer().toString().match(/<path\b[^>]*\/>/g)
    .join('').replace(/ fill="[^"]*"/g, '');
  const vector = [`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}"><title>Chân dung bằng chữ ${portrait.word}</title><defs><g id="word" transform="translate(-50 -20)">${wordPaths}</g></defs><path fill="#0b0b18" d="M0 0H${canvas.width}V${canvas.height}H0Z"/>`];
  let count = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const cx = (col + .5) * cellW;
      const cy = (row + .5) * cellH;
      if (cx < drawLeft || cx >= drawLeft + drawWidth || cy < drawTop || cy >= drawTop + drawHeight) continue;
      const sx = Math.min(img.width - 1, Math.floor(left + (cx - drawLeft) / scale));
      const sy = Math.min(img.height - 1, Math.floor(top + (cy - drawTop) / scale));
      const offset = (sy * img.width + sx) * 4;
      if (silhouette[offset + 3] < 128) continue;
      // Lift shadows so the hair and clothing remain visible on the dark canvas.
      const color = [0, 1, 2].map(c => Math.round(28 + 227 * Math.pow(pixels[offset + c] / 255, .78)));
      ctx.fillStyle = `rgb(${color.join(',')})`;
      ctx.fillText(portrait.word, cx, cy, cellW * .94);
      vector.push(`<use xlink:href="#word" x="${cx.toFixed(2)}" y="${cy.toFixed(2)}" fill="#${color.map(c => c.toString(16).padStart(2, '0')).join('')}"/>`);
      count++;
    }
  }
  const output = path.join(__dirname, 'assets', `typography_${portrait.id}_color.png`);
  fs.writeFileSync(output, canvas.toBuffer('image/png'));
  fs.writeFileSync(output.replace('_color.png', '.svg'), vector.join('') + '</svg>');
  for (const size of [480, 960]) {
    const preview = createCanvas(size, Math.round(size * canvas.height / canvas.width));
    const pc = preview.getContext('2d');
    pc.drawImage(canvas, 0, 0, preview.width, preview.height);
    fs.writeFileSync(output.replace('_color.png', `_${size}.jpg`), preview.toBuffer('image/jpeg', { quality: .88 }));
  }
  console.log(`${portrait.word}: ${canvas.width}x${canvas.height}, ${count} words → ${output}`);
}

const selected = process.argv[2];
if (selected && !portraits.some(p => p.id === selected)) {
  console.error('Choose lan, thanh, xinh or dep; omit the argument to render all four.');
  process.exitCode = 1;
} else {
  (async () => {
    for (const portrait of portraits.filter(p => !selected || p.id === selected)) await render(portrait);
  })().catch(error => { console.error(error); process.exitCode = 1; });
}
