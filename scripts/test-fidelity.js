const fs = require('fs');
const path = require('path');

const KEY = 'sk-of-GcNZaoayZfPJsNBSiKEhSGQIDIVsbMJaUhPpvWBBuknfaSRZXytgaXtLHVdvoHYu';
const manUrl = 'https://vklltmfmttuaahqmwksu.supabase.co/storage/v1/object/public/images/vton/mannequin.jpg';

async function main() {
  const prompt = `Replace the top with a burgundy red off-shoulder long-sleeve blouse with vertical fishbone seam lines and criss-cross lacing. Replace the bottom with cream white cotton shorts. Do not alter the person, hairstyle, pose, or illustration style.`;

  console.log('Testing with input_fidelity: high ...');
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 120000);

  const res = await fetch('https://api.ofox.ai/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai/gpt-image-2',
      prompt: prompt,
      image: [manUrl],
      input_fidelity: 'high',
      n: 1,
      size: '1024x1536',
      response_format: 'b64_json',
    }),
    signal: ctrl.signal,
  });

  const data = await res.json();
  console.log('Status:', res.status);

  if (data.data?.[0]?.b64_json) {
    const out = path.join(process.cwd(), 'public', 'outputs', 'fidelity-high.png');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.from(data.data[0].b64_json, 'base64'));
    console.log('Saved:', out);
    require('child_process').execSync(`open "${out}"`);
  } else {
    console.log('Error:', JSON.stringify(data, null, 2).slice(0, 800));
  }
}
main().catch(e => console.error(e));
