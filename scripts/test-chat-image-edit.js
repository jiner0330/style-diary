const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const KEY = 'sk-of-GcNZaoayZfPJsNBSiKEhSGQIDIVsbMJaUhPpvWBBuknfaSRZXytgaXtLHVdvoHYu';

async function main() {
  // Use original mannequin at full res for best editing fidelity
  const manBuf = await sharp(path.join(process.cwd(), 'public', 'mannequin-female-000.png'))
    .resize(1024).png({ quality: 85 }).toBuffer();
  const manB64 = manBuf.toString('base64');
  console.log('Mannequin base64 size:', manB64.length);

  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 120000);

  // Chat-based image editing: send mannequin + edit instruction
  const res = await fetch('https://api.ofox.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai/gpt-image-2',
      messages: [
        {
          role: 'system',
          content: 'You are an image editor. Edit the user\'s image exactly as requested. Preserve the original image style, quality, and all details not explicitly mentioned for change. Return the edited image.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Change ONLY the clothing on this fashion illustration mannequin:\n- Replace the top with a burgundy red (#8B2252) off-shoulder long-sleeve blouse. Slim fitted silhouette. Front vertical fishbone seam line detailing. Cotton fabric.\n- Add cream white (#FAF7F4) cotton shorts with folded cuffs.\n\nDo NOT change: the hand-drawn watercolor illustration style, the mannequin\'s face, the bun hairstyle, skin tone, body pose, arms, legs, cream paper texture background, or any element other than the clothing.'
            },
            {
              type: 'image_url',
              image_url: { url: 'data:image/png;base64,' + manB64 }
            }
          ]
        }
      ],
      max_tokens: 4096,
    }),
    signal: ctrl.signal,
  });

  const data = await res.json();
  console.log('Status:', res.status);

  // Look for image in response
  const content = data.choices?.[0]?.message?.content;
  if (typeof content === 'string' && content.length > 0) {
    // Search for base64 image in markdown or raw
    const match = content.match(/!\[.*?\]\(data:image\/png;base64,([A-Za-z0-9+/=]+)\)/);
    const b64 = match?.[1];
    if (b64) {
      const out = path.join(process.cwd(), 'public', 'outputs', 'chat-edit.png');
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, Buffer.from(b64, 'base64'));
      console.log('Saved:', out);
    } else {
      // Check if the content itself is a data URI
      const rawMatch = content.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
      if (rawMatch) {
        const out = path.join(process.cwd(), 'public', 'outputs', 'chat-edit.png');
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, Buffer.from(rawMatch[1], 'base64'));
        console.log('Saved:', out);
      } else {
        console.log('Content (no image):', content.slice(0, 500));
      }
    }
  } else {
    console.log('Full response:', JSON.stringify(data, null, 2).slice(0, 2000));
  }
}
main().catch(e => console.error(e));
