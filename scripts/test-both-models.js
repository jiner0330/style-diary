const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const KEY = 'sk-of-GcNZaoayZfPJsNBSiKEhSGQIDIVsbMJaUhPpvWBBuknfaSRZXytgaXtLHVdvoHYu';

async function testModel(model, label, desc) {
  console.log(`\n=== Testing ${label} ===`);

  const manBuf = await sharp(path.join(process.cwd(), 'public', 'mannequin-female-000.png'))
    .resize(768).jpeg({ quality: 75 }).toBuffer();
  const manB64 = manBuf.toString('base64');

  const prompt = `Edit this hand-drawn fashion illustration. Change ONLY the upper clothing — replace it with a burgundy red off-shoulder long-sleeve blouse with a slim fitted silhouette and subtle waist pleats. Keep the hand-drawn watercolor style, face, hair, pose, arms, legs, background, and lighting EXACTLY identical. Do not redraw or restyle the illustration.`;

  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 120000);

  const res = await fetch('https://api.ofox.ai/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      prompt: prompt,
      image: ['data:image/jpeg;base64,' + manB64],
      n: 1,
      size: '1024x1536',
      response_format: 'b64_json',
    }),
    signal: ctrl.signal,
  });

  const data = await res.json();
  console.log('Status:', res.status);

  if (data.data?.[0]?.b64_json) {
    const filename = `compare-${label.replace(/\s/g, '-').toLowerCase()}.png`;
    const out = path.join(process.cwd(), 'public', 'outputs', filename);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.from(data.data[0].b64_json, 'base64'));
    console.log('Saved:', out);
    return out;
  } else {
    console.log('Error:', JSON.stringify(data, null, 2).slice(0, 500));
    return null;
  }
}

async function main() {
  const [a, b] = await Promise.all([
    testModel('openai/gpt-image-1.5', 'gpt-image-1.5', 'reference-based editing'),
    testModel('openai/gpt-image-2', 'gpt-image-2', 'reference-based editing'),
  ]);

  console.log('\n=== Results ===');
  if (a) console.log('GPT Image 1.5:', a);
  if (b) console.log('GPT Image 2:', b);
  if (a) require('child_process').execSync(`open "${a}"`);
  if (b) require('child_process').execSync(`open "${b}"`);
}
main().catch(e => console.error(e));
