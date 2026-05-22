const fs = require('fs');
const path = require('path');

const KEY = 'sk-of-GcNZaoayZfPJsNBSiKEhSGQIDIVsbMJaUhPpvWBBuknfaSRZXytgaXtLHVdvoHYu';
const manUrl = 'https://vklltmfmttuaahqmwksu.supabase.co/storage/v1/object/public/images/vton/mannequin.jpg';

const PROMPT = `Edit the clothing on this hand-drawn watercolor fashion mannequin illustration.

Replace the top with: A burgundy red off-shoulder long-sleeve blouse. Slim fitted silhouette. The neckline sits below the shoulders exposing the collarbone. Front features vertical fishbone seam lines with criss-cross lacing. Clean cotton fabric.

Replace the bottom with: Cream white high-waisted cotton shorts with folded cuffs.

CRITICAL: Preserve EVERYTHING else exactly — the hand-drawn watercolor illustration style, game asset look, clean contour lines, cream paper texture background, the mannequin's face, fair porcelain skin, muted golden brown hair in a neat bun with side-swept bangs, body pose. The result must look like the SAME illustration only with different clothes. No photorealistic conversion.`;

async function testModel(modelId, label) {
  console.log(`\n=== ${label} (${modelId}) ===`);
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 120000);
  const res = await fetch('https://api.ofox.ai/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelId,
      prompt: PROMPT,
      image: [manUrl],
      size: '1024x1536',
      response_format: 'b64_json',
    }),
    signal: ctrl.signal,
  });
  const data = await res.json();
  console.log('Status:', res.status);
  if (data.data?.[0]?.b64_json) {
    const out = path.join(process.cwd(), 'public', 'outputs', `${label}.png`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.from(data.data[0].b64_json, 'base64'));
    console.log('Saved:', out);
    require('child_process').execSync(`open "${out}"`);
    return true;
  } else if (data.data?.[0]?.url) {
    console.log('URL:', data.data[0].url);
  } else {
    console.log('Error:', JSON.stringify(data).slice(0, 600));
  }
  return false;
}

async function main() {
  const models = [
    ['google/gemini-3-pro-image-preview', 'banana-pro'],
    ['google/gemini-2.5-flash-image', 'banana-original'],
  ];
  for (const [id, label] of models) {
    await testModel(id, label);
  }
}

main().catch(e => console.error(e));
