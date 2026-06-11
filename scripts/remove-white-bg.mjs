import sharp from "sharp";
import { readdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const PUBLIC = resolve(import.meta.dirname, "..", "public");
const BACKUP = resolve(import.meta.dirname, "..", "public", "_mannequin-backup");

const files = readdirSync(PUBLIC).filter((f) => /^mannequin-.*\.png$/.test(f));

if (files.length === 0) {
  console.log("No mannequin PNGs found.");
  process.exit(0);
}

// Backup originals (only if backup doesn't already exist)
import { mkdirSync, existsSync } from "fs";
mkdirSync(BACKUP, { recursive: true });
const backupExists = files.every((f) => existsSync(resolve(BACKUP, f)));
if (!backupExists) {
  for (const f of files) {
    const src = resolve(PUBLIC, f);
    const dst = resolve(BACKUP, f);
    writeFileSync(dst, readFileSync(src));
  }
  console.log(`Backed up ${files.length} files to ${BACKUP}`);
} else {
  console.log("Backup already exists, skipping.");
}

for (const file of files) {
  const inputPath = resolve(PUBLIC, file);
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Build an alpha array using flood-fill from edges.
  // Only white pixels connected to the image boundary become transparent;
  // interior light areas (e.g. pale mannequin surfaces) are preserved.
  const { width, height } = info;
  const total = width * height;

  // Step 1: classify each pixel as "white-ish" based on whiteness score
  const isWhite = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const whiteness = (lum / 255) * (1 - (max - min) / 255);
    isWhite[i] = whiteness >= 0.88 ? 1 : 0;
  }

  // Step 2: flood-fill from all 4 edges — mark any white pixel reachable from border
  const visited = new Uint8Array(total);
  const queue = [];

  function idx(x, y) {
    return y * width + x;
  }
  function enqueue(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const i = idx(x, y);
    if (visited[i] || !isWhite[i]) return;
    visited[i] = 1;
    queue.push(x, y);
  }

  // Seed from all edge pixels that are white
  for (let x = 0; x < width; x++) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  // BFS
  let head = 0;
  while (head < queue.length) {
    const x = queue[head++];
    const y = queue[head++];
    enqueue(x - 1, y);
    enqueue(x + 1, y);
    enqueue(x, y - 1);
    enqueue(x, y + 1);
  }

  // Step 3: compute alpha from flood-fill result + distance-based feather
  const alpha = new Uint8Array(total);
  // First pass: core alpha (0 for flood-filled bg, 255 for figure)
  for (let i = 0; i < total; i++) {
    alpha[i] = visited[i] ? 0 : 255;
  }

  // Feather: for each opaque pixel, if any neighbor is transparent, fade based on whiteness
  const feathered = new Uint8Array(alpha);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = idx(x, y);
      if (alpha[i] === 0) continue;
      // Check 4 neighbors
      const hasTransparentNeighbor =
        alpha[idx(x - 1, y)] === 0 ||
        alpha[idx(x + 1, y)] === 0 ||
        alpha[idx(x, y - 1)] === 0 ||
        alpha[idx(x, y + 1)] === 0;
      if (hasTransparentNeighbor) {
        // Use whiteness to determine feather alpha
        const r = data[i * 3];
        const g = data[i * 3 + 1];
        const b = data[i * 3 + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const whiteness = (lum / 255) * (1 - (max - min) / 255);
        // Map whiteness 0.88-0.95 → alpha 255-128 (partial transparency at edges)
        if (whiteness > 0.88) {
          feathered[i] = Math.max(64, Math.round((1 - (whiteness - 0.88) / 0.07) * 255));
        }
      }
    }
  }

  // Re-assemble RGBA = original RGB + computed alpha
  const outputData = Buffer.alloc(total * 4);
  for (let i = 0; i < total; i++) {
    outputData[i * 4] = data[i * 3];
    outputData[i * 4 + 1] = data[i * 3 + 1];
    outputData[i * 4 + 2] = data[i * 3 + 2];
    outputData[i * 4 + 3] = feathered[i];
  }

  await sharp(outputData, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(inputPath);

  console.log(`Processed: ${file} (${info.width}×${info.height})`);
}

console.log("Done.");
