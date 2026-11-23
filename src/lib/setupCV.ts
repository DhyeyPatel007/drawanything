// Phone-side setup CV (panel D3, Set-of-Mark): rectify the photographed sheet,
// find candidate ink regions, number them. The VLM only labels the numbers —
// geometry always comes from here, never from the model.

export interface Candidate {
  i: number;
  r: [number, number, number, number]; // normalized on the warped sheet
}

export interface SetupParseInput {
  warpedDataURL: string;
  markedDataURL: string;
  candidates: Candidate[];
}

const W = 1000;
const H = 707;

function otsu(gray: Uint8Array): number {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, max = 0, thr = 128;
  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += i * hist[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > max) { max = between; thr = i; }
  }
  return thr;
}

export async function processPhoto(img: HTMLImageElement): Promise<SetupParseInput> {
  // draw photo to a working canvas
  const scale = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight));
  const pw = Math.round(img.naturalWidth * scale);
  const ph = Math.round(img.naturalHeight * scale);
  const pc = document.createElement("canvas");
  pc.width = pw; pc.height = ph;
  const pctx = pc.getContext("2d", { willReadFrequently: true })!;
  pctx.drawImage(img, 0, 0, pw, ph);
  const pdata = pctx.getImageData(0, 0, pw, ph);

  // paper mask: bright pixels via Otsu on luminance; take its bbox as the sheet
  const gray = new Uint8Array(pw * ph);
  for (let i = 0; i < pw * ph; i++) {
    gray[i] = pdata.data[i * 4] * 0.3 + pdata.data[i * 4 + 1] * 0.55 + pdata.data[i * 4 + 2] * 0.15;
  }
  const thr = otsu(gray);
  let x0 = pw, x1 = 0, y0 = ph, y1 = 0, bright = 0;
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      if (gray[y * pw + x] > thr) {
        bright++;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  const frac = bright / (pw * ph);
  if (frac < 0.12 || frac > 0.95 || x1 - x0 < pw * 0.3 || y1 - y0 < ph * 0.3) {
    x0 = 0; y0 = 0; x1 = pw - 1; y1 = ph - 1;
  }

  // warp the sheet bbox to canonical W x H (bbox warp: the phone photo is
  // near-top-down during setup, so this is a good rectification)
  const warped = document.createElement("canvas");
  warped.width = W; warped.height = H;
  const wctx = warped.getContext("2d", { willReadFrequently: true })!;
  wctx.fillStyle = "#fff";
  wctx.fillRect(0, 0, W, H);
  wctx.drawImage(pc, x0, y0, x1 - x0, y1 - y0, 0, 0, W, H);

  // ink detection on a half-size copy: local-mean adaptive threshold
  const SW = 500, SH = 354;
  const small = document.createElement("canvas");
  small.width = SW; small.height = SH;
  const sctx = small.getContext("2d", { willReadFrequently: true })!;
  sctx.drawImage(warped, 0, 0, SW, SH);
  const sd = sctx.getImageData(0, 0, SW, SH);
  const sg = new Float32Array(SW * SH);
  for (let i = 0; i < SW * SH; i++) sg[i] = sd.data[i * 4] * 0.3 + sd.data[i * 4 + 1] * 0.55 + sd.data[i * 4 + 2] * 0.15;
  // integral image for local mean
  const integ = new Float32Array((SW + 1) * (SH + 1));
  for (let y = 0; y < SH; y++) {
    let row = 0;
    for (let x = 0; x < SW; x++) {
      row += sg[y * SW + x];
      integ[(y + 1) * (SW + 1) + x + 1] = integ[y * (SW + 1) + x + 1] + row;
    }
  }
  const B = 15, C = 14;
  const ink = new Uint8Array(SW * SH);
  for (let y = 0; y < SH; y++) {
    for (let x = 0; x < SW; x++) {
      const xa = Math.max(0, x - B), xb = Math.min(SW, x + B + 1);
      const ya = Math.max(0, y - B), yb = Math.min(SH, y + B + 1);
      const area = (xb - xa) * (yb - ya);
      const s = integ[yb * (SW + 1) + xb] - integ[ya * (SW + 1) + xb] - integ[yb * (SW + 1) + xa] + integ[ya * (SW + 1) + xa];
      ink[y * SW + x] = sg[y * SW + x] < s / area - C ? 1 : 0;
    }
  }

  // connected components on ink
  const label = new Int32Array(SW * SH).fill(-1);
  const boxes: { x0: number; y0: number; x1: number; y1: number; n: number }[] = [];
  for (let i = 0; i < SW * SH; i++) {
    if (!ink[i] || label[i] >= 0) continue;
    const id = boxes.length;
    const stack = [i];
    label[i] = id;
    let bx0 = SW, bx1 = 0, by0 = SH, by1 = 0, n = 0;
    while (stack.length) {
      const cur = stack.pop()!;
      n++;
      const cx = cur % SW, cy = (cur / SW) | 0;
      if (cx < bx0) bx0 = cx; if (cx > bx1) bx1 = cx;
      if (cy < by0) by0 = cy; if (cy > by1) by1 = cy;
      const nb = [cx > 0 ? cur - 1 : -1, cx < SW - 1 ? cur + 1 : -1, cy > 0 ? cur - SW : -1, cy < SH - 1 ? cur + SW : -1];
      for (const m of nb) if (m >= 0 && ink[m] && label[m] < 0) { label[m] = id; stack.push(m); }
    }
    boxes.push({ x0: bx0, y0: by0, x1: bx1, y1: by1, n });
  }

  // drop specks, then cluster boxes whose gaps are small (a drawn box +
  // its label merge into one control candidate)
  const GAP = 13;
  const kept = boxes.filter((b) => b.n >= 12 && (b.x1 - b.x0) >= 3 && (b.y1 - b.y0) >= 3);
  const clusters: { x0: number; y0: number; x1: number; y1: number }[] = [];
  for (const b of kept) {
    let merged = false;
    for (const cl of clusters) {
      if (b.x0 - GAP <= cl.x1 && b.x1 + GAP >= cl.x0 && b.y0 - GAP <= cl.y1 && b.y1 + GAP >= cl.y0) {
        cl.x0 = Math.min(cl.x0, b.x0); cl.y0 = Math.min(cl.y0, b.y0);
        cl.x1 = Math.max(cl.x1, b.x1); cl.y1 = Math.max(cl.y1, b.y1);
        merged = true;
        break;
      }
    }
    if (!merged) clusters.push({ ...b });
  }
  // one more merge pass (chains)
  for (let pass = 0; pass < 2; pass++) {
    for (let i = clusters.length - 1; i > 0; i--) {
      for (let j = 0; j < i; j++) {
        const a = clusters[i], b = clusters[j];
        if (a.x0 - GAP <= b.x1 && a.x1 + GAP >= b.x0 && a.y0 - GAP <= b.y1 && a.y1 + GAP >= b.y0) {
          b.x0 = Math.min(a.x0, b.x0); b.y0 = Math.min(a.y0, b.y0);
          b.x1 = Math.max(a.x1, b.x1); b.y1 = Math.max(a.y1, b.y1);
          clusters.splice(i, 1);
          break;
        }
      }
    }
  }

  const sheetArea = SW * SH;
  const cands = clusters
    .map((cl) => {
      const w = cl.x1 - cl.x0 + 1, h = cl.y1 - cl.y0 + 1;
      return { cl, w, h, area: w * h };
    })
    .filter(({ area, w, h }) => area > sheetArea * 0.0012 && area < sheetArea * 0.34 && w >= 12 && h >= 12)
    .sort((a, b) => a.cl.y0 - b.cl.y0 || a.cl.x0 - b.cl.x0)
    .slice(0, 16)
    .map(({ cl }, idx) => {
      const pad = 6;
      const r: [number, number, number, number] = [
        Math.max(0, (cl.x0 - pad) / SW),
        Math.max(0, (cl.y0 - pad) / SH),
        Math.min(1, (cl.x1 - cl.x0 + 1 + pad * 2) / SW),
        Math.min(1, (cl.y1 - cl.y0 + 1 + pad * 2) / SH),
      ];
      return { i: idx + 1, r };
    });

  // marked copy: numbered badges for the VLM
  const marked = document.createElement("canvas");
  marked.width = W; marked.height = H;
  const mctx = marked.getContext("2d")!;
  mctx.drawImage(warped, 0, 0);
  mctx.font = "bold 30px sans-serif";
  mctx.textAlign = "center";
  mctx.textBaseline = "middle";
  for (const c of cands) {
    const x = c.r[0] * W, y = c.r[1] * H;
    mctx.strokeStyle = "#e0342b";
    mctx.lineWidth = 3;
    mctx.strokeRect(x, y, c.r[2] * W, c.r[3] * H);
    mctx.fillStyle = "#e0342b";
    mctx.beginPath();
    mctx.arc(x + 16, y + 16, 16, 0, Math.PI * 2);
    mctx.fill();
    mctx.fillStyle = "#fff";
    mctx.fillText(String(c.i), x + 16, y + 17);
  }

  return {
    warpedDataURL: warped.toDataURL("image/jpeg", 0.88),
    markedDataURL: marked.toDataURL("image/jpeg", 0.88),
    candidates: cands,
  };
}
