const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  // Compress mannequin to reduce request size
  const manBuf = await sharp(path.join(process.cwd(), 'public', 'mannequin-female-000.png'))
    .resize(768)
    .jpeg({ quality: 75 })
    .toBuffer();
  const manB64 = manBuf.toString('base64');
  console.log('Mannequin base64 size:', manB64.length, '(was ~4.6MB uncompressed)');

  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 120000);

  const prompt = `Replace only the clothing on this model with:
- Top: A burgundy off-shoulder long-sleeve blouse. The neckline sits below the shoulders exposing the collarbone. Fitted slim silhouette. Clean cotton finish, no patterns, no zippers, no buttons.
- Bottom: High-waisted cream white cotton shorts with folded cuffs.

Keep the model's pose, body proportions, skin tone, facial features, hair, background, and studio lighting IDENTICAL to the reference image. Change nothing except the clothing items listed above. Fashion e-commerce product photo style.`;

  console.log('Testing GPT Image 2...');
  const res = await fetch('https://api.ofox.ai/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer sk-of-GcNZaoayZfPJsNBSiKEhSGQIDIVsbMJaUhPpvWBBuknfaSRZXytgaXtLHVdvoHYu', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai/gpt-image-2',
      prompt: prompt,
      n: 1,
      size: '1024x1536',
      image: ['data:image/jpeg;base64,' + manB64],
    }),
    signal: ctrl.signal,
    agent: agent,
  });

  const data = await res.json();
  console.log('Status:', res.status);

  if (data.data?.[0]?.b64_json) {
    const out = path.join(process.cwd(), 'public', 'outputs', 'gpt-image2-v2.png');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.from(data.data[0].b64_json, 'base64'));
    console.log('Saved:', out);
  } else if (data.data?.[0]?.url) {
    console.log('URL:', data.data[0].url);
  } else {
    console.log('Response:', JSON.stringify(data, null, 2).slice(0, 800));
  }
}
main().catch(e => console.error(e));
