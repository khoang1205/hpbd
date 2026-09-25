const fs = require('fs');
const jpeg = require('jpeg-js');
const { createCanvas } = require('canvas');

// Load image
const img = jpeg.decode(fs.readFileSync('anh1.jpg'), { useTArray: true });
const IW = img.width, IH = img.height;

// ── luminance + sobel edge at full res ────────────────────────────────
const lum = new Float32Array(IW*IH);
for(let y=0;y<IH;y++)for(let x=0;x<IW;x++){
  const p=(y*IW+x)*4;
  lum[y*IW+x]=(0.299*img.data[p]+0.587*img.data[p+1]+0.114*img.data[p+2]);
}
function sobel(x,y){
  if(x<1||y<1||x>=IW-1||y>=IH-1) return 0;
  const gx = -lum[(y-1)*IW+x-1]+lum[(y-1)*IW+x+1]-2*lum[y*IW+x-1]+2*lum[y*IW+x+1]-lum[(y+1)*IW+x-1]+lum[(y+1)*IW+x+1];
  const gy = -lum[(y-1)*IW+x-1]-2*lum[(y-1)*IW+x]-lum[(y-1)*IW+x+1]+lum[(y+1)*IW+x-1]+2*lum[(y+1)*IW+x]+lum[(y+1)*IW+x+1];
  return Math.sqrt(gx*gx+gy*gy);
}

// ── person mask (same segmentation as seg_v4.js) ──────────────────────
function cinfo(x,y){
  const p=(y*IW+x)*4;
  const r=img.data[p],g=img.data[p+1],b=img.data[p+2];
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;
  let h=0;if(d>0){if(mx===r)h=((g-b)/d)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360;}
  return {r,g,b,h,v:mx,s:mx>0?d/mx:0,l:lum[y*IW+x]};
}
function isPerson(x,y){
  const c=cinfo(x,y);const xr=x/IW,yr=y/IH;const rb=c.r-c.b;
  if(yr < 0.48) return false;
  if(c.l < 92 && xr>0.20 && xr<0.82) return true;
  if(c.h>=8 && c.h<=42 && c.l>=115 && c.l<=164 && c.s>=0.45 && rb>=95 && c.r>=c.g && c.g>=c.b){ if(xr>0.18 && xr<0.84) return true; }
  if(c.h>=6 && c.h<=45 && c.l>=110 && c.l<=168 && c.s>=0.14 && c.s<=0.42 && rb>=28 && rb<=95 && c.r>=c.g && c.g>=c.b){ if(xr>0.24 && xr<0.78) return true; }
  return false;
}
const raw=new Uint8Array(IW*IH);
for(let y=0;y<IH;y++)for(let x=0;x<IW;x++) raw[y*IW+x]=isPerson(x,y)?1:0;
function majority(m,it){let cur=m;for(let k=0;k<it;k++){const out=new Uint8Array(cur);
  for(let y=1;y<IH-1;y++)for(let x=1;x<IW-1;x++){let s=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)s+=cur[(y+dy)*IW+(x+dx)];out[y*IW+x]=s>=5?1:0;}cur=out;}return cur;}
function dilate(m){const o=new Uint8Array(m);for(let y=1;y<IH-1;y++)for(let x=1;x<IW-1;x++)if(m[y*IW+x]){for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)o[(y+dy)*IW+(x+dx)]=1;}return o;}
function erode(m){const o=new Uint8Array(m);for(let y=1;y<IH-1;y++)for(let x=1;x<IW-1;x++){let all=1;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(!m[(y+dy)*IW+(x+dx)]){all=0;break;}o[y*IW+x]=all;}return o;}
let clean=majority(raw,2);clean=dilate(clean);clean=dilate(clean);clean=erode(clean);clean=erode(clean);
function fillGaps(m,maxGap){const o=new Uint8Array(m);for(let x=0;x<IW;x++){let lp=-1;for(let y=0;y<IH;y++){if(m[y*IW+x]){if(lp>=0&&y-lp-1<=maxGap){for(let yy=lp+1;yy<y;yy++)o[yy*IW+x]=1;}lp=y;}}}return o;}
clean=fillGaps(clean,60);
function largestComponent(mask){const labels=new Int32Array(IW*IH).fill(-1);const sizes=[];let nid=0,maxSize=0;
  for(let y=0;y<IH;y++)for(let x=0;x<IW;x++){if(!mask[y*IW+x]||labels[y*IW+x]!==-1)continue;
    const q=[[x,y]];labels[y*IW+x]=nid;let sz=0;while(q.length){const [cx,cy]=q.pop();sz++;
      for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=IW||ny>=IH)continue;if(mask[ny*IW+nx]&&labels[ny*IW+nx]===-1){labels[ny*IW+nx]=nid;q.push([nx,ny]);}}}
    sizes[nid]=sz;if(sz>maxSize)maxSize=sz;nid++;}
  const out=new Uint8Array(IW*IH);for(let i=0;i<nid;i++)if(sizes[i]>=maxSize*0.08)for(let y=0;y<IH;y++)for(let x=0;x<IW;x++)if(labels[y*IW+x]===i)out[y*IW+x]=1;return out;}
const mask=largestComponent(clean);

// ── crop to person ────────────────────────────────────────────────────
let minX=IW,minY=IH,maxX=0,maxY=0;
for(let y=0;y<IH;y++)for(let x=0;x<IW;x++)if(mask[y*IW+x]){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}
// zoom: keep only the top ZOOM fraction of the person (head→shoulders→full)
const ZOOM=parseFloat(process.argv[3]||'1.0');
const rawMaxY=maxY;
maxY=Math.min(rawMaxY, Math.round(minY + (rawMaxY-minY)*ZOOM));
const pad=Math.round((maxY-minY)*0.01);
minX=Math.max(0,minX-pad);maxX=Math.min(IW-1,maxX+pad);minY=Math.max(0,minY-pad);maxY=Math.min(IH-1,maxY+pad);

// ── grid: Balanced resolution for clear, larger readable Thanh words ─────────────────────────
const GW = parseInt(process.argv[4] || '70');
const GH = Math.round(GW * (maxY - minY) / (maxX - minX));
const maskG = new Uint8Array(GW * GH);
const lumG = new Float32Array(GW * GH);
const edgeG = new Float32Array(GW * GH);
const colG = new Float32Array(GW * GH * 3);

for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
  const x0 = minX + Math.floor((gx / GW) * (maxX - minX));
  const x1 = minX + Math.floor(((gx + 1) / GW) * (maxX - minX));
  const y0 = minY + Math.floor((gy / GH) * (maxY - minY));
  const y1 = minY + Math.floor(((gy + 1) / GH) * (maxY - minY));
  let mcnt = 0, n = 0, lsum = 0, esum = 0, rs = 0, gs = 0, bs = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    if (x < 0 || y < 0 || x >= IW || y >= IH) continue;
    const i = y * IW + x; n++;
    if (mask[i]) mcnt++;
    lsum += lum[i]; esum += sobel(x, y);
    rs += img.data[i * 4]; gs += img.data[i * 4 + 1]; bs += img.data[i * 4 + 2];
  }
  const ci = gy * GW + gx;
  if (n === 0) {
    maskG[ci] = 0; lumG[ci] = 0; edgeG[ci] = 0;
    colG[ci * 3] = 0; colG[ci * 3 + 1] = 0; colG[ci * 3 + 2] = 0;
    continue;
  }
  maskG[ci] = (mcnt / n > 0.45) ? 1 : 0;
  lumG[ci] = lsum / n / 255;
  edgeG[ci] = esum / n / 255;
  colG[ci * 3] = rs / n; colG[ci * 3 + 1] = gs / n; colG[ci * 3 + 2] = bs / n;
}

// ── render Ultra-HD Canvas ────────────────────────────────────────────
const CW = parseInt(process.argv[5] || '2400');
const CH = Math.round(CW * (GH / GW));
const canvas = createCanvas(CW, CH);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#0a0a18';
ctx.fillRect(0, 0, CW, CH);

const WORD = process.argv[2] || 'Thanh';
const cellW = CW / GW, cellH = CH / GH;

// Base font size scaled for clear readability
const baseFont = Math.min(cellW * 0.94 / (WORD.length * 0.52), cellH * 0.82);
console.log(`Rendering: Canvas ${CW}x${CH}, Grid ${GW}x${GH}, BaseFont ${baseFont.toFixed(1)}px, Cell ${cellW.toFixed(1)}x${cellH.toFixed(1)}px`);

for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
  if (!maskG[gy * GW + gx]) continue;
  const b = lumG[gy * GW + gx];
  const e = edgeG[gy * GW + gx];
  const darkness = 1 - b;
  const ink = Math.min(1, darkness * 0.85 + e * 1.5);

  let fontSize, alpha;
  if (ink > 0.80) { fontSize = baseFont * 1.08; alpha = 1.0; }
  else if (ink > 0.60) { fontSize = baseFont * 0.96; alpha = 0.94; }
  else if (ink > 0.42) { fontSize = baseFont * 0.86; alpha = 0.80; }
  else if (ink > 0.25) { fontSize = baseFont * 0.74; alpha = 0.60; }
  else if (ink > 0.12) { fontSize = baseFont * 0.64; alpha = 0.40; }
  else { fontSize = baseFont * 0.56; alpha = 0.22; }

  const angle = (Math.random() - 0.5) * 0.15;
  
  // Original color with readability boost
  let cr = colG[(gy * GW + gx) * 3], cg = colG[(gy * GW + gx) * 3 + 1], cb = colG[(gy * GW + gx) * 3 + 2];
  const clum = (0.299 * cr + 0.587 * cg + 0.114 * cb) / 255;
  
  let f = 1.0;
  if (clum < 0.30) f = 1.60;
  else if (clum < 0.50) f = 1.30;
  else if (clum < 0.70) f = 1.10;
  else f = 0.98;

  cr = Math.min(255, cr * f); cg = Math.min(255, cg * f); cb = Math.min(255, cb * f);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `bold ${Math.round(fontSize)}px "Segoe UI", Arial, sans-serif`;
  ctx.fillStyle = `rgb(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)})`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.translate((gx + 0.5) * cellW, (gy + 0.5) * cellH);
  ctx.rotate(angle);
  ctx.fillText(WORD, 0, 0);
  ctx.restore();
}

// Soft radial vignette
const v = ctx.createRadialGradient(CW / 2, CH / 2, CH * 0.22, CW / 2, CH / 2, CH * 0.72);
v.addColorStop(0, 'rgba(0,0,0,0)');
v.addColorStop(1, 'rgba(10,10,24,0.45)');
ctx.fillStyle = v; ctx.fillRect(0, 0, CW, CH);

fs.writeFileSync('assets/typography_thanh_color.png', canvas.toBuffer('image/png'));
fs.writeFileSync('typography_thanh_color.png', canvas.toBuffer('image/png'));
console.log(`✅ Saved typography_thanh_color.png (${CW}x${CH}) word="${WORD}" grid=${GW}x${GH}`);

