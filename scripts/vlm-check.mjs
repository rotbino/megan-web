import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

const file = process.argv[2];
const prompt = process.argv[3];

const b64 = fs.readFileSync(file).toString('base64');
const zai = await ZAI.create();
const r = await zai.chat.completions.createVision({
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } },
      ],
    },
  ],
  thinking: { type: 'disabled' },
});
console.log(r.choices[0].message.content);
