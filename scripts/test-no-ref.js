const fs = require('fs');
const path = require('path');

const KEY = 'sk-of-GcNZaoayZfPJsNBSiKEhSGQIDIVsbMJaUhPpvWBBuknfaSRZXytgaXtLHVdvoHYu';

async function main() {
  const prompt = `A hand-drawn watercolor fashion illustration, game asset style, clear clean contour lines. Cream paper texture background with pure white base.

The figure is a young female mannequin, front view facing camera directly. Illustration-style face with big round amber eyes, doll-like delicate features. Translucent fair skin with a creamy porcelain finish. Muted golden brown hair with a matte finish, pulled into a neat bun. Thin, smooth side-swept bangs swept evenly across the forehead with no parting. Soft wispy face-framing strands of hair at both sides of the bangs. Slim build, standard A-pose with arms held 30 degrees away from body.

She is wearing:
- Top: A burgundy red off-shoulder long-sleeve blouse. Slim fitted silhouette. The neckline sits below the shoulders exposing the collarbone. Front features vertical fishbone seam lines with criss-cross lacing. Clean cotton fabric. No bows, no ribbons, no ruffles, no extra decorations.
- Bottom: Cream white high-waisted cotton shorts with folded cuffs.

Strictly no accessories, no patterns, no bows, no ribbons, no extra design elements not listed above. No shoes.`;

  console.log('Testing refined text prompt (v3)...');
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 120000);

  const res = await fetch('https://api.ofox.ai/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai/gpt-image-2',
      prompt: prompt,
      n: 1,
      size: '1024x1536',
      response_format: 'b64_json',
    }),
    signal: ctrl.signal,
  });

  const data = await res.json();
  console.log('Status:', res.status);

  if (data.data?.[0]?.b64_json) {
    const out = path.join(process.cwd(), 'public', 'outputs', 'text-v3.png');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.from(data.data[0].b64_json, 'base64'));
    console.log('Saved:', out);
    require('child_process').execSync(`open "${out}"`);
  } else {
    console.log('Error:', JSON.stringify(data).slice(0, 500));
  }
}
main().catch(e => console.error(e));
