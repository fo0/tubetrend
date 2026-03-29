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

// --- Icon generation (reuses logic from scripts/generate-icon.mjs) ---

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

function isInTriangle(x, y, cx, cy, triSize) {
  const halfH = triSize * 0.5;
  const triW = triSize * 0.866;
  const left = cx - triW * 0.4;
  const right = cx + triW * 0.6;
  const top = cy - halfH;
  const bottom = cy + halfH;

  if (x < left || x > right || y < top || y > bottom) return 0;

  const progress = (x - left) / (right - left);
  const allowedHalf = halfH * (1 - progress);
  const distFromCenter = Math.abs(y - cy);

  if (distFromCenter <= allowedHalf) {
    const edgeDist = allowedHalf - distFromCenter;
    return Math.min(1, edgeDist * 2);
  }
  return 0;
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
  const rowSize = 1 + SIZE * 4;
  const rawData = Buffer.alloc(SIZE * rowSize);
  const cornerRadius = SIZE * 0.16;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const triSize = SIZE * 0.38;

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

      const bgR = Math.round(lerp(204, 139, t));
      const bgG = 0;
      const bgB = 0;
      const triAlpha = isInTriangle(x, y, cx, cy, triSize);

      rawData[idx] = blendPixel(bgR, 255, triAlpha);
      rawData[idx + 1] = blendPixel(bgG, 255, triAlpha);
      rawData[idx + 2] = blendPixel(bgB, 255, triAlpha);
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
