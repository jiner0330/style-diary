const fs = require('fs');
const path = require('path');

const KEY = 'sk-of-GcNZaoayZfPJsNBSiKEhSGQIDIVsbMJaUhPpvWBBuknfaSRZXytgaXtLHVdvoHYu';

const BASE = `A hand-drawn watercolor fashion illustration, game asset style, clear clean contour lines. Cream paper texture background with pure white base.`;

const FACE_DETAIL = `big round amber eyes, doll-like delicate features. Translucent fair skin with a creamy porcelain finish. Muted golden brown hair with a matte finish, pulled into a neat bun. Thin, smooth side-swept bangs swept evenly across the forehead with no parting. Soft wispy face-framing strands.`;

const CLOTHING = `She is wearing:
- Top: A burgundy red off-shoulder long-sleeve blouse. Slim fitted silhouette. The neckline sits below the shoulders exposing the collarbone. Front features vertical fishbone seam lines with criss-cross lacing. Clean cotton fabric. No bows, no ribbons, no ruffles, no extra decorations.
- Bottom: Cream white high-waisted cotton shorts with folded cuffs.

Strictly no accessories, no patterns, no bows, no ribbons, no extra design elements not listed above. No shoes.`;

const ANGLES = [
  {
    name: '000',
    view: `The figure is a young female mannequin, front view facing camera directly. Illustration-style face with ${FACE_DETAIL} Slim build, standard A-pose with arms held 30 degrees away from body.`,
  },
  {
    name: '045',
    view: `The figure is a young female mannequin, three-quarter front view, body turned approximately 45 degrees to the right. Illustration-style face visible in three-quarter profile with ${FACE_DETAIL} Slim build, standard A-pose with arms held 30 degrees away from body.`,
  },
  {
    name: '090',
    view: `The figure is a young female mannequin, side profile view facing right. One arm visible along the body, the other arm partially hidden. Muted golden brown hair with a matte finish pulled into a neat bun visible at the back. Translucent fair skin with a creamy porcelain finish. Slim build.`,
  },
  {
    name: '135',
    view: `The figure is a young female mannequin, three-quarter back view, body turned approximately 135 degrees showing mostly the back with partial side visible. Muted golden brown hair with a matte finish pulled into a neat bun. Translucent fair skin with a creamy porcelain finish. Slim build, standard A-pose.`,
  },
  {
    name: '180',
    view: `The figure is a young female mannequin, back view from behind. Muted golden brown hair with a matte finish, pulled into a neat bun at the back of the head. Translucent fair skin on the neck and shoulders. Slim build, standard A-pose with arms held 30 degrees away from body. No face visible.`,
  },
  {
    name: '225',
    view: `The figure is a young female mannequin, three-quarter back view, body turned approximately 225 degrees showing mostly the back with partial left side visible. Muted golden brown hair with a matte finish pulled into a neat bun. Translucent fair skin with a creamy porcelain finish. Slim build, standard A-pose.`,
  },
  {
    name: '270',
    view: `The figure is a young female mannequin, side profile view facing left. One arm visible along the body, the other arm partially hidden. Muted golden brown hair with a matte finish pulled into a neat bun visible at the back. Translucent fair skin with a creamy porcelain finish. Slim build.`,
  },
  {
    name: '315',
    view: `The figure is a young female mannequin, three-quarter front view, body turned approximately 45 degrees to the left. Illustration-style face visible in three-quarter profile with ${FACE_DETAIL} Slim build, standard A-pose with arms held 30 degrees away from body.`,
  },
];

async function generate(angle) {
  const prompt = `${BASE}\n\n${angle.view}\n\n${CLOTHING}`;
  const outPath = path.join(process.cwd(), 'public', 'outputs', `angle-${angle.name}.png`);

  if (fs.existsSync(outPath)) {
    console.log(`${angle.name}: skip (exists)`);
    return outPath;
  }

  console.log(`\n=== Generating ${angle.name} ===`);
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
  fs.mkdirSync(path.join(process.cwd(), 'public', 'outputs'), { recursive: true });

  const results = [];
  for (const angle of ANGLES) {
    const out = await generate(angle);
    if (out) results.push(out);
  }

  const generated = results.filter(r => r !== null);
  console.log(`\nDone: ${generated.length}/${ANGLES.length} generated`);

  if (generated.length > 0) {
    const files = generated.map(r => `"${path.basename(r)}"`).join(' ');
    // Open all in Finder
    require('child_process').execSync(`open ${generated.map(r => `"${r}"`).join(' ')}`);
  }
}

main().catch(e => console.error(e));
