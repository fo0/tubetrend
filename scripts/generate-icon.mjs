/**
 * Generates a 512x512 PNG app icon for TubeTrend using only Node.js built-ins.
 * Design: Purple gradient background + cyan ascending trend line + glow dot + play triangle
 * Run: node scripts/generate-icon.mjs
 * Output: build/icon.png
 */
import { writeFileSync, mkdirSync } from "fs";
import { deflateSync } from "zlib";

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
  const margin = (size * 16) / 512; // 16px margin at 512
  const inner = size - 2 * margin;
  const lx = x - margin;
  const ly = y - margin;
  if (lx < 0 || ly < 0 || lx >= inner || ly >= inner) return false;
  if (lx < radius && ly < radius) return Math.hypot(lx - radius, ly - radius) <= radius;
  if (lx > inner - radius && ly < radius)
    return Math.hypot(lx - (inner - radius), ly - radius) <= radius;
  if (lx < radius && ly > inner - radius)
    return Math.hypot(lx - radius, ly - (inner - radius)) <= radius;
  if (lx > inner - radius && ly > inner - radius)
    return Math.hypot(lx - (inner - radius), ly - (inner - radius)) <= radius;
  return true;
}

// Distance from point to line segment
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
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
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcVal = Buffer.alloc(4);
  crcVal.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([length, typeBytes, data, crcVal]);
}

// --- Trend line points (mapped to 512x512) ---
const trendPoints = [
  [100, 340],
  [180, 300],
  [240, 320],
  [310, 240],
  [370, 200],
  [430, 140],
];

const LINE_WIDTH = 11; // half-width for the stroke (22px total)

// --- Generate pixel data ---
const rowSize = 1 + SIZE * 4;
const rawData = Buffer.alloc(SIZE * rowSize);
const cornerRadius = SIZE * 0.188; // ~96px at 512

// Play triangle vertices
const triAx = 155,
  triAy = 370;
const triBx = 155,
  triBy = 430;
const triCx = 200,
  triCy = 400;

function sign(p1x, p1y, p2x, p2y, p3x, p3y) {
  return (p1x - p3x) * (p2y - p3y) - (p2x - p3x) * (p1y - p3y);
}

function isInTriangle(px, py) {
  const d1 = sign(px, py, triAx, triAy, triBx, triBy);
  const d2 = sign(px, py, triBx, triBy, triCx, triCy);
  const d3 = sign(px, py, triCx, triCy, triAx, triAy);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

// Glow dot center & radii
const glowCx = 430,
  glowCy = 140;
const glowOuterR = 16,
  glowInnerR = 9;

for (let y = 0; y < SIZE; y++) {
  const rowOffset = y * rowSize;
  rawData[rowOffset] = 0; // PNG filter: None

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

    // --- Trend line ---
    let minDist = Infinity;
    for (let i = 0; i < trendPoints.length - 1; i++) {
      const d = distToSegment(
        x,
        y,
        trendPoints[i][0],
        trendPoints[i][1],
        trendPoints[i + 1][0],
        trendPoints[i + 1][1],
      );
      if (d < minDist) minDist = d;
    }
    if (minDist <= LINE_WIDTH + 1) {
      // Gradient along x: #38bdf8 -> #22d3ee
      const xt = Math.max(0, Math.min(1, (x - 100) / 330));
      const lineR = Math.round(lerp(56, 34, xt));
      const lineG = Math.round(lerp(189, 211, xt));
      const lineB = Math.round(lerp(248, 238, xt));
      const lineAlpha = Math.min(1, Math.max(0, LINE_WIDTH + 1 - minDist));
      r = blendPixel(r, lineR, lineAlpha);
      g = blendPixel(g, lineG, lineAlpha);
      b = blendPixel(b, lineB, lineAlpha);
    }

    // --- Glow dot (outer, cyan, 40% opacity) ---
    const glowDist = Math.hypot(x - glowCx, y - glowCy);
    if (glowDist <= glowOuterR + 1) {
      const glowAlpha = Math.min(1, Math.max(0, glowOuterR + 1 - glowDist)) * 0.4;
      r = blendPixel(r, 34, glowAlpha);
      g = blendPixel(g, 211, glowAlpha);
      b = blendPixel(b, 238, glowAlpha);
    }
    // --- Glow dot (inner, white) ---
    if (glowDist <= glowInnerR + 1) {
      const innerAlpha = Math.min(1, Math.max(0, glowInnerR + 1 - glowDist));
      r = blendPixel(r, 255, innerAlpha);
      g = blendPixel(g, 255, innerAlpha);
      b = blendPixel(b, 255, innerAlpha);
    }

    // --- Play triangle (white, 85% opacity) ---
    if (isInTriangle(x, y)) {
      const triAlpha = 0.85;
      r = blendPixel(r, 255, triAlpha);
      g = blendPixel(g, 255, triAlpha);
      b = blendPixel(b, 255, triAlpha);
    }

    rawData[idx] = r;
    rawData[idx + 1] = g;
    rawData[idx + 2] = b;
    rawData[idx + 3] = 255;
  }
}

// --- Assemble PNG ---
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

const png = Buffer.concat([
  signature,
  createChunk("IHDR", ihdr),
  createChunk("IDAT", compressed),
  createChunk("IEND", iend),
]);

mkdirSync("build", { recursive: true });
writeFileSync("build/icon.png", png);
console.log(`Icon generated: build/icon.png (${png.length} bytes, ${SIZE}x${SIZE})`);
