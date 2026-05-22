const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  // Resize mannequin for manageable request size
  const manBuf = await sharp(path.join(process.cwd(), 'public', 'mannequin-female-000.png'))
    .resize(768).jpeg({ quality: 80 }).toBuffer();
  const manB64 = manBuf.toString('base64');

  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 120000);

  // Chat editing: send mannequin + editing instructions
  const res = await fetch('https://api.ofox.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer sk-of-GcNZaoayZfPJsNBSiKEhSGQIDIVsbMJaUhPpvWBBuknfaSRZXytgaXtLHVdvoHYu', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'openai/gpt-image-1.5',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Edit this hand-drawn fashion illustration. Change ONLY the clothing — replace the top with a burgundy red off-shoulder long-sleeve blouse with waist pleats, and add cream white cotton shorts with folded cuffs on the bottom. Do NOT change: the illustration style, the face, the hair, the pose, the background, or ANY other part of the image. Keep the exact same hand-drawn watercolor aesthetic.'
            },
            {
              type: 'image_url',
              image_url: { url: 'data:image/jpeg;base64,' + manB64 }
            }
          ]
        }
      ],
    }),
    signal: ctrl.signal,
    // @ts-ignore - undici dispatcher
    dispatcher: undefined,
  });

  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(data, null, 2).slice(0, 3000));

  // Check for image in response
  if (data.choices?.[0]?.message?.content) {
    const content = data.choices[0].message.content;
    if (typeof content === 'string') {
      // May contain markdown image or data URI
      const b64Match = content.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/);
      if (b64Match) {
        const out = path.join(process.cwd(), 'public', 'outputs', 'chat-edit-test.png');
        fs.mkdirSync(path.dirname(out), { recursive: true });
        fs.writeFileSync(out, Buffer.from(b64Match[1], 'base64'));
        console.log('Saved from b64:', out);
      } else {
        console.log('Content (no image found):', content.slice(0, 500));
      }
    }
  }
}
main().catch(e => console.error(e));
