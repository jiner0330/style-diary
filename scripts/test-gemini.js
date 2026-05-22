const fs = require('fs');
const path = require('path');

const KEY = 'sk-of-GcNZaoayZfPJsNBSiKEhSGQIDIVsbMJaUhPpvWBBuknfaSRZXytgaXtLHVdvoHYu';
const manUrl = 'https://vklltmfmttuaahqmwksu.supabase.co/storage/v1/object/public/images/vton/mannequin.jpg';

const PROMPT = `Edit the clothing on this hand-drawn watercolor fashion mannequin illustration.

Replace the top with: A burgundy red off-shoulder long-sleeve blouse. Slim fitted silhouette. The neckline sits below the shoulders exposing the collarbone. Front features vertical fishbone seam lines with criss-cross lacing. Clean cotton fabric.

Replace the bottom with: Cream white high-waisted cotton shorts with folded cuffs.

CRITICAL: Preserve EVERYTHING else exactly — the hand-drawn watercolor illustration style, game asset look, clean contour lines, cream paper texture background, the mannequin's face, fair porcelain skin, muted golden brown hair in a neat bun with side-swept bangs, body pose. The result must look like the SAME illustration only with different clothes. No photorealistic conversion.`;

async function main() {
  // Test with reference image (no 'n' param)
  console.log('=== With reference image ===');
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 120000);
  const res = await fetch('https://api.ofox.ai/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-3.1-flash-image-preview',
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
    const out = path.join(process.cwd(), 'public', 'outputs', 'gemini-with-ref.png');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.from(data.data[0].b64_json, 'base64'));
    console.log('Saved:', out);
    require('child_process').execSync(`open "${out}"`);
  } else {
    console.log('Error:', JSON.stringify(data).slice(0, 800));
  }

  // Also test: can the model accept image as a separate parameter or does it need base64 inline?
  // Try with input_fidelity equivalent (some gemini models use different param names)
  console.log('\n=== With reference + guidance ===');
  const ctrl2 = new AbortController();
  setTimeout(() => ctrl2.abort(), 120000);
  const res2 = await fetch('https://api.ofox.ai/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-3.1-flash-image-preview',
      prompt: PROMPT,
      image: [manUrl],
      size: '1024x1536',
      response_format: 'b64_json',
      guidance_scale: 7,
    }),
    signal: ctrl2.signal,
  });
  const data2 = await res2.json();
  console.log('Status:', res2.status);
  if (data2.data?.[0]?.b64_json) {
    const out = path.join(process.cwd(), 'public', 'outputs', 'gemini-ref-guide.png');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, Buffer.from(data2.data[0].b64_json, 'base64'));
    console.log('Saved:', out);
    require('child_process').execSync(`open "${out}"`);
  } else {
    console.log('Error:', JSON.stringify(data2).slice(0, 800));
  }
}

main().catch(e => console.error(e));
