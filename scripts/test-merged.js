const fs = require('fs');
const path = require('path');

const KEY = 'sk-of-GcNZaoayZfPJsNBSiKEhSGQIDIVsbMJaUhPpvWBBuknfaSRZXytgaXtLHVdvoHYu';

// Merged: user's structure/style + our character specifics
const MERGED_FRONT = `A soft hand-drawn fashion illustration base figure, standing in a clear A-pose with arms held 30 degrees away from the body, gentle watercolor shading but with crisp clean outlining, cream paper texture background, pure white background behind the paper texture, cozy and healing vibe, isolated full-body front view, perfectly symmetrical. Game asset.

The figure is a young female mannequin, front view facing camera directly. Illustration-style face with big round amber eyes, doll-like delicate features, calm gentle expression. Translucent fair skin with a creamy porcelain finish. Muted golden brown hair with a matte finish, pulled into a neat bun. Thin, smooth side-swept bangs swept evenly across the forehead with no parting. Soft wispy face-framing strands of hair at both sides of the bangs. Slim build.

She is wearing:
- Top: A burgundy red off-shoulder long-sleeve blouse. Slim fitted silhouette. The neckline sits below the shoulders exposing the collarbone. Front features vertical fishbone seam lines with criss-cross lacing. Clean cotton fabric. No bows, no ribbons, no ruffles, no extra decorations.
- Bottom: Cream white high-waisted cotton shorts with folded cuffs.

Strictly no accessories, no patterns, no bows, no ribbons, no extra design elements not listed above. No shoes.`;

const MERGED_BACK = `A soft hand-drawn fashion illustration base figure, standing in a clear A-pose with arms held 30 degrees away from the body, gentle watercolor shading but with crisp clean outlining, cream paper texture background, pure white background behind the paper texture, cozy and healing vibe, isolated full-body back view. Game asset.

The figure is a young female mannequin, back view from behind. Translucent fair skin with a creamy porcelain finish visible on the neck, shoulders, and arms. Muted golden brown hair with a matte finish, pulled into a neat bun at the back of the head. Slim build, standard A-pose with arms held 30 degrees away from body. No face visible.

She is wearing:
- Top: A burgundy red off-shoulder long-sleeve blouse. Slim fitted silhouette. The neckline sits below the shoulders exposing the collarbone. Clean cotton fabric. No bows, no ribbons, no ruffles, no extra decorations.
- Bottom: Cream white high-waisted cotton shorts with folded cuffs.

Strictly no accessories, no patterns, no bows, no ribbons, no extra design elements not listed above. No shoes.`;

async function generate(label, prompt) {
  console.log(`Generating ${label}...`);
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 180000);
  const res = await fetch('https://api.ofox.ai/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'openai/gpt-image-2', prompt, n: 1, size: '1024x1536', response_format: 'b64_json' }),
    signal: ctrl.signal,
  });
  const data = await res.json();
  if (data.data?.[0]?.b64_json) {
    const out = path.join(process.cwd(), 'public', 'outputs', `${label}.png`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.from(data.data[0].b64_json, 'base64'));
    console.log(`${label}: saved`);
    return out;
  }
  console.log(`${label}: error -`, JSON.stringify(data).slice(0, 300));
  return null;
}

async function main() {
  const r1 = await generate('merged-front', MERGED_FRONT);
  const r2 = await generate('merged-back', MERGED_BACK);
  const files = [r1, r2].filter(Boolean);
  if (files.length) require('child_process').execSync(`open "${files.join('" "')}"`);
}

main().catch(e => console.error(e));
