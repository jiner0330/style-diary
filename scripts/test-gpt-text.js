const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });
const fs = require('fs');
const path = require('path');

async function main() {
  const prompt = `A hand-drawn fashion illustration style mannequin figure on a light beige background with soft diffused studio lighting. The mannequin has a clean sketch-like appearance with subtle shading.

Dress her in:
- Top: A burgundy off-shoulder long-sleeve blouse. The neckline sits below the shoulders exposing the collarbone. Fitted slim silhouette. Clean cotton finish.
- Bottom: High-waisted cream white cotton shorts with folded cuffs.

Keep the mannequin pose, body proportions, and illustration style consistent. Fashion e-commerce product photography style.`;

  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 120000);

  // Try gpt-image-1.5 first (older model, might match previous behavior)
  console.log('Testing gpt-image-1.5 (text-only)...');
  const res = await fetch('https://api.ofox.ai/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer sk-of-GcNZaoayZfPJsNBSiKEhSGQIDIVsbMJaUhPpvWBBuknfaSRZXytgaXtLHVdvoHYu', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai/gpt-image-1.5',
      prompt: prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    }),
    signal: ctrl.signal,
    agent: agent,
  });

  const data = await res.json();
  console.log('Status:', res.status);

  if (data.data?.[0]?.b64_json) {
    const out = path.join(process.cwd(), 'public', 'outputs', 'gpt-text-test.png');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.from(data.data[0].b64_json, 'base64'));
    console.log('Saved:', out);
  } else {
    console.log('Response:', JSON.stringify(data, null, 2).slice(0, 500));
  }
}
main().catch(e => console.error(e));
