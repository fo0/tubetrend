/**
 * Assembles the Chrome Extension from dist/ + chrome-extension/ source files.
 * Run after `vite build`: npm run build:extension
 * Output: dist-extension/ (ready for chrome://extensions/ "Load unpacked")
 */
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { deflateSync } from 'zlib';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const SRC = join(ROOT, 'chrome-extension');
const OUT = join(ROOT, 'dist-extension');

// --- Step 1: Clean and copy dist/ ---
if (existsSync(OUT)) {
  rmSync(OUT, { recursive: true });
}
cpSync(DIST, OUT, { recursive: true });
console.log('Copied dist/ -> dist-extension/');

// --- Step 2: Copy extension source files ---
for (const file of ['manifest.json', 'background.js', 'theme-init.js']) {
  cpSync(join(SRC, file), join(OUT, file));
}
console.log('Copied chrome-extension/ files');

// --- Step 3: Patch index.html — replace inline FOUC script with external ---
const indexPath = join(OUT, 'index.html');
let html = readFileSync(indexPath, 'utf-8');

// Match the inline FOUC prevention script block (including the comment above it)
const inlineScriptPattern = /\s*<!-- Apply theme class.*?-->\s*<script>[\s\S]*?<\/script>/;
if (inlineScriptPattern.test(html)) {
  html = html.replace(inlineScriptPattern, '\n    <script src="theme-init.js"></script>');
  writeFileSync(indexPath, html);
  console.log('Patched index.html: inline script -> theme-init.js');
} else {
  // Fallback: try matching just the script block without the comment
  const fallbackPattern = /<script>\s*\(function\(\)\s*\{[\s\S]*?\}\)\(\);\s*<\/script>/;
  if (fallbackPattern.test(html)) {
    html = html.replace(fallbackPattern, '<script src="theme-init.js"></script>');
    writeFileSync(indexPath, html);
    console.log('Patched index.html: inline script -> theme-init.js (fallback match)');
  } else {
    console.warn('Warning: Could not find inline FOUC script in index.html to patch');
  }
}

// --- Icon reference points (designed at 512, scaled to target size) ---
const REF_TREND = [
  [100, 340],
  [180, 300],
  [240, 320],
  [310, 240],
  [370, 200],
  [430, 140],
];
const REF_TRI = [[155, 370], [155, 430], [200, 400]];
const REF_GLOW = [430, 140];

// --- Step 4: Generate extension icons ---
const ICON_SIZES = [16, 48, 128];
const iconsDir = join(OUT, 'icons');
mkdirSync(iconsDir, { recursive: true });

for (const size of ICON_SIZES) {
  const png = generateIcon(size);
  writeFileSync(join(iconsDir, `icon-${size}.png`), png);
}
console.log(`Generated icons: ${ICON_SIZES.map(s => `${s}x${s}`).join(', ')}`);

console.log('\nChrome Extension built successfully!');
console.log(`Output: dist-extension/`);
console.log('Load via: chrome://extensions/ -> Developer mode -> Load unpacked');

// --- Icon generation (matches scripts/generate-icon.mjs — purple gradient + trend line) ---

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function blendPixel(bg, fg, alpha) {
  return Math.round(lerp(bg, fg, alpha));
}

function isInRoundedRect(x, y, size, radius) {
  if (x < radius && y < radius) {
    return Math.hypot(x - radius, y - radius) <= radius;
  }
  if (x > size - radius && y < radius) {
    return Math.hypot(x - (size - radius), y - radius) <= radius;
  }
  if (x < radius && y > size - radius) {
    return Math.hypot(x - radius, y - (size - radius)) <= radius;
  }
  if (x > size - radius && y > size - radius) {
    return Math.hypot(x - (size - radius), y - (size - radius)) <= radius;
  }
  return true;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function signTri(p1x, p1y, p2x, p2y, p3x, p3y) {
  return (p1x - p3x) * (p2y - p3y) - (p2x - p3x) * (p1y - p3y);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([length, typeBytes, data, crcVal]);
}

function generateIcon(SIZE) {
  const scale = SIZE / 512;
  const rowSize = 1 + SIZE * 4;
  const rawData = Buffer.alloc(SIZE * rowSize);
  const cornerRadius = SIZE * 0.188;
  const lineHalfW = Math.max(1, 11 * scale);

  const trend = REF_TREND.map(([x, y]) => [x * scale, y * scale]);
  const tri = REF_TRI.map(([x, y]) => [x * scale, y * scale]);
  const glow = [REF_GLOW[0] * scale, REF_GLOW[1] * scale];
  const glowOuterR = 16 * scale;
  const glowInnerR = 9 * scale;

  for (let y = 0; y < SIZE; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0;

    for (let x = 0; x < SIZE; x++) {
      const idx = rowOffset + 1 + x * 4;
      const t = y / SIZE;

      if (!isInRoundedRect(x, y, SIZE, cornerRadius)) {
        rawData[idx] = 0;
        rawData[idx + 1] = 0;
        rawData[idx + 2] = 0;
        rawData[idx + 3] = 0;
        continue;
      }

      // Background gradient: indigo (#6366f1) to violet (#8b5cf6)
      let r = Math.round(lerp(99, 139, t));
      let g = Math.round(lerp(102, 92, t));
      let b = Math.round(lerp(241, 246, t));

      // Trend line
      let minDist = Infinity;
      for (let i = 0; i < trend.length - 1; i++) {
        const d = distToSegment(x, y, trend[i][0], trend[i][1], trend[i + 1][0], trend[i + 1][1]);
        if (d < minDist) minDist = d;
      }
      if (minDist <= lineHalfW + 1) {
        const xt = Math.max(0, Math.min(1, (x - trend[0][0]) / (trend[trend.length - 1][0] - trend[0][0])));
        const lineR = Math.round(lerp(56, 34, xt));
        const lineG = Math.round(lerp(189, 211, xt));
        const lineB = Math.round(lerp(248, 238, xt));
        const lineAlpha = Math.min(1, Math.max(0, lineHalfW + 1 - minDist));
        r = blendPixel(r, lineR, lineAlpha);
        g = blendPixel(g, lineG, lineAlpha);
        b = blendPixel(b, lineB, lineAlpha);
      }

      // Glow dot outer (cyan, 40%)
      const glowDist = Math.hypot(x - glow[0], y - glow[1]);
      if (glowDist <= glowOuterR + 1) {
        const ga = Math.min(1, Math.max(0, glowOuterR + 1 - glowDist)) * 0.4;
        r = blendPixel(r, 34, ga);
        g = blendPixel(g, 211, ga);
        b = blendPixel(b, 238, ga);
      }
      // Glow dot inner (white)
      if (glowDist <= glowInnerR + 1) {
        const ia = Math.min(1, Math.max(0, glowInnerR + 1 - glowDist));
        r = blendPixel(r, 255, ia);
        g = blendPixel(g, 255, ia);
        b = blendPixel(b, 255, ia);
      }

      // Play triangle (white, 85%)
      const d1 = signTri(x, y, tri[0][0], tri[0][1], tri[1][0], tri[1][1]);
      const d2 = signTri(x, y, tri[1][0], tri[1][1], tri[2][0], tri[2][1]);
      const d3 = signTri(x, y, tri[2][0], tri[2][1], tri[0][0], tri[0][1]);
      const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
      const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
      if (!(hasNeg && hasPos)) {
        r = blendPixel(r, 255, 0.85);
        g = blendPixel(g, 255, 0.85);
        b = blendPixel(b, 255, 0.85);
      }

      rawData[idx] = r;
      rawData[idx + 1] = g;
      rawData[idx + 2] = b;
      rawData[idx + 3] = 255;
    }
  }

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = deflateSync(rawData, { level: 9 });
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', compressed),
    createChunk('IEND', iend),
  ]);
}
