const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  // Compress mannequin image for API
  const manBuf = fs.readFileSync(path.join(process.cwd(), 'public', 'mannequin-female-000.png'));
  const resized = await sharp(manBuf).resize(1024).png({ quality: 80 }).toBuffer();
  const manB64 = resized.toString('base64');

  // Also load the garment image
  const gBuf = fs.readFileSync(path.join(process.cwd(), 'public', 'top-off-shoulder-longsleeve-12.png'));
  const gResized = await sharp(gBuf).resize(768).png({ quality: 80 }).toBuffer();
  const gB64 = gResized.toString('base64');

  console.log('Mannequin base64 size:', manB64.length);
  console.log('Garment base64 size:', gB64.length);

  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 120000);

  // Try Gemini image editing approach - use chat completions format
  const res = await fetch('https://api.ofox.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer sk-of-GcNZaoayZfPJsNBSiKEhSGQIDIVsbMJaUhPpvWBBuknfaSRZXytgaXtLHVdvoHYu', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-3.1-flash-image-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Edit this fashion illustration. Replace the existing top clothing with a burgundy red off-shoulder long-sleeve blouse that sits below the shoulders exposing the collarbone. Do NOT change the illustration style, pose, face, hair, background, lighting, or any other part of the image. Only modify the upper clothing area. Keep the hand-drawn illustration aesthetic exactly as is.'
            },
            {
              type: 'image_url',
              image_url: { url: 'data:image/png;base64,' + manB64 }
            }
          ]
        }
      ],
      max_tokens: 8000,
    }),
    signal: ctrl.signal,
    agent: agent,
  });

  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(data, null, 2).slice(0, 2000));

  // Check if image was returned in the response
  if (data.choices?.[0]?.message?.content) {
    const content = data.choices[0].message.content;
    if (typeof content === 'string' && content.includes('data:image')) {
      const b64 = content.split('data:image/png;base64,')[1] || content.split('data:image/jpeg;base64,')[1];
      if (b64) {
        const out = path.join(process.cwd(), 'public', 'outputs', 'nanobanana-test.png');
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, Buffer.from(b64, 'base64'));
        console.log('Saved:', out);
      }
    }
  }
}
main().catch(e => console.error(e));
