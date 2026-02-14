/**
 * Generates a 512x512 PNG app icon for TubeTrend using only Node.js built-ins.
 * Run: node scripts/generate-icon.mjs
 * Output: build/icon.png
 */
import { writeFileSync, mkdirSync } from 'fs';
import { deflateSync } from 'zlib';

const SIZE = 512;

// --- Color helpers ---
function lerp(a, b, t) {
  return a + (b - a) * t;
}

function blendPixel(bg, fg, alpha) {
  return Math.round(lerp(bg, fg, alpha));
}

// --- Shape helpers ---
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
  // Play button triangle pointing right
  const halfH = triSize * 0.5;
  const triW = triSize * 0.866; // sqrt(3)/2
  const left = cx - triW * 0.4;
  const right = cx + triW * 0.6;
  const top = cy - halfH;
  const bottom = cy + halfH;

  if (x < left || x > right || y < top || y > bottom) return 0;

  // Right-pointing triangle: full height at left edge, point at right edge
  const progress = (x - left) / (right - left);
  const allowedHalf = halfH * (1 - progress);
  const distFromCenter = Math.abs(y - cy);

  if (distFromCenter <= allowedHalf) {
    // Anti-aliasing at edges
    const edgeDist = allowedHalf - distFromCenter;
    return Math.min(1, edgeDist * 2);
  }
  return 0;
}

// --- PNG creation helpers ---
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

// --- Generate pixel data ---
const rowSize = 1 + SIZE * 4; // filter byte + RGBA per pixel
const rawData = Buffer.alloc(SIZE * rowSize);
const cornerRadius = SIZE * 0.16;
const cx = SIZE / 2;
const cy = SIZE / 2;
const triSize = SIZE * 0.38;

for (let y = 0; y < SIZE; y++) {
  const rowOffset = y * rowSize;
  rawData[rowOffset] = 0; // PNG filter: None

  for (let x = 0; x < SIZE; x++) {
    const idx = rowOffset + 1 + x * 4;
    const t = y / SIZE;

    if (!isInRoundedRect(x, y, SIZE, cornerRadius)) {
      // Transparent outside rounded rect
      rawData[idx] = 0;
      rawData[idx + 1] = 0;
      rawData[idx + 2] = 0;
      rawData[idx + 3] = 0;
      continue;
    }

    // Background gradient: deep red (#CC0000) to darker red (#8B0000)
    const bgR = Math.round(lerp(204, 139, t));
    const bgG = 0;
    const bgB = 0;

    // Play button triangle (white)
    const triAlpha = isInTriangle(x, y, cx, cy, triSize);

    rawData[idx] = blendPixel(bgR, 255, triAlpha);
    rawData[idx + 1] = blendPixel(bgG, 255, triAlpha);
    rawData[idx + 2] = blendPixel(bgB, 255, triAlpha);
    rawData[idx + 3] = 255;
  }
}

// --- Assemble PNG ---
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// IHDR
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);  // width
ihdr.writeUInt32BE(SIZE, 4);  // height
ihdr[8] = 8;                   // bit depth
ihdr[9] = 6;                   // color type: RGBA
ihdr[10] = 0;                  // compression
ihdr[11] = 0;                  // filter
ihdr[12] = 0;                  // interlace

// IDAT (compressed image data)
const compressed = deflateSync(rawData, { level: 9 });

// IEND
const iend = Buffer.alloc(0);

const png = Buffer.concat([
  signature,
  createChunk('IHDR', ihdr),
  createChunk('IDAT', compressed),
  createChunk('IEND', iend),
]);

mkdirSync('build', { recursive: true });
writeFileSync('build/icon.png', png);
console.log(`Icon generated: build/icon.png (${png.length} bytes, ${SIZE}x${SIZE})`);
