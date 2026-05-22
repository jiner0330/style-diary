const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const KEY = 'sk-of-GcNZaoayZfPJsNBSiKEhSGQIDIVsbMJaUhPpvWBBuknfaSRZXytgaXtLHVdvoHYu';

async function main() {
  // Use public Supabase URL to avoid base64 encoding quality loss
  const manUrl = 'https://vklltmfmttuaahqmwksu.supabase.co/storage/v1/object/public/images/vton/mannequin.jpg';

  // Detailed garment descriptions based on actual item data
  const prompt = `Edit the clothing on this fashion mannequin illustration:

Top: Replace with a burgundy red off-shoulder long-sleeve blouse. Slim fitted silhouette. Front features vertical fishbone seam lines with criss-cross lacing detail. The neckline sits below the shoulders exposing the collarbone. Clean cotton fabric, no extra decorations beyond the fishbone lacing.

Bottom: Replace with cream white high-waisted cotton shorts with folded cuffs.

IMPORTANT: Only change the clothing items specified above. Do NOT alter or redraw the person, face, hairstyle, skin tone, body pose, arms, legs, illustration style, watercolor texture, or background in any way. The result must look like the SAME illustration with different clothes.`;

  console.log('Prompt:', prompt);

  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 120000);

  const res = await fetch('https://api.ofox.ai/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai/gpt-image-2',
      prompt: prompt,
      image: [manUrl],
      n: 1,
      size: '1024x1536',
      response_format: 'b64_json',
    }),
    signal: ctrl.signal,
  });

  const data = await res.json();
  console.log('Status:', res.status);

  if (data.data?.[0]?.b64_json) {
    const out = path.join(process.cwd(), 'public', 'outputs', 'ref-url-test.png');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.from(data.data[0].b64_json, 'base64'));
    console.log('Saved:', out);
    require('child_process').execSync(`open "${out}"`);
  } else if (data.data?.[0]?.url) {
    console.log('URL:', data.data[0].url);
  } else {
    console.log('Error:', JSON.stringify(data, null, 2).slice(0, 800));
  }
}
main().catch(e => console.error(e));
