const fs = require('fs');
const path = require('path');

const KEY = 'sk-of-GcNZaoayZfPJsNBSiKEhSGQIDIVsbMJaUhPpvWBBuknfaSRZXytgaXtLHVdvoHYu';

const BASE = `A hand-drawn watercolor fashion illustration, game asset style, clear clean contour lines. Cream paper texture background with pure white base.`;

const FACE_DETAIL = `big round amber eyes, doll-like delicate features. Translucent fair skin with a creamy porcelain finish. Muted golden brown hair with a matte finish, pulled into a neat bun. Thin, smooth side-swept bangs swept evenly across the forehead with no parting. Soft wispy face-framing strands.`;

// Different outfit for verification
const CLOTHING = `She is wearing:
- Top: A navy blue turtleneck sweater. Slim fitted silhouette. Soft knit fabric. Long sleeves.
- Bottom: Beige wide-leg trousers. High-waisted. Linen fabric, natural texture.
- Outerwear: A beige long trench coat, open front. Linen fabric. Clean tailored silhouette.

Strictly no accessories, no patterns, no bows, no ribbons, no extra design elements not listed above. No shoes.`;

const ANGLES = [
  {
    name: 'v2-000',
    view: `The figure is a young female mannequin, front view facing camera directly. Illustration-style face with ${FACE_DETAIL} Slim build, standard A-pose with arms held 30 degrees away from body.`,
  },
  {
    name: 'v2-045',
    view: `The figure is a young female mannequin, three-quarter front view, body turned approximately 45 degrees to the right. Illustration-style face visible in three-quarter profile with ${FACE_DETAIL} Slim build, standard A-pose with arms held 30 degrees away from body.`,
  },
  {
    name: 'v2-315',
    view: `The figure is a young female mannequin, three-quarter front view, body turned approximately 45 degrees to the left. Illustration-style face visible in three-quarter profile with ${FACE_DETAIL} Slim build, standard A-pose with arms held 30 degrees away from body.`,
  },
];

async function generate(angle) {
  const prompt = `${BASE}\n\n${angle.view}\n\n${CLOTHING}`;
  const outPath = path.join(process.cwd(), 'public', 'outputs', `angle-${angle.name}.png`);

  console.log(`Generating ${angle.name}...`);
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 180000);

  try {
    const res = await fetch('https://api.ofox.ai/v1/images/generations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai/gpt-image-2',
        prompt,
        n: 1,
        size: '1024x1536',
        response_format: 'b64_json',
      }),
      signal: ctrl.signal,
    });

    const data = await res.json();
    if (data.data?.[0]?.b64_json) {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, Buffer.from(data.data[0].b64_json, 'base64'));
      console.log(`${angle.name}: saved`);
      return outPath;
    } else {
      console.log(`${angle.name}: error -`, JSON.stringify(data).slice(0, 300));
      return null;
    }
  } catch (e) {
    console.log(`${angle.name}: ${e.message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const results = [];
  for (const angle of ANGLES) {
    const out = await generate(angle);
    if (out) results.push(out);
  }
  console.log(`\nDone: ${results.length}/${ANGLES.length}`);

  if (results.length > 0) {
    // Open both sets side by side
    require('child_process').execSync(
      `open "${results.join('" "')}" "/Users/jiner/projects/style-diary/public/outputs/angle-000.png" "/Users/jiner/projects/style-diary/public/outputs/angle-045.png" "/Users/jiner/projects/style-diary/public/outputs/angle-315.png"`
    );
  }
}

main().catch(e => console.error(e));
