// تست بصری واترمارک تکی — همان منطق watermarkLayer در uploads.service.ts
import sharp from '/home/z/my-project/megan-back/node_modules/sharp/dist/index.cjs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const WM_TILE_W = 354;
const WM_TILE_H = 150;
const WM_OPACITY = 0.28;
const WM_ANGLE = -25;

const tile = await readFile(join('/home/z/my-project/megan-back', 'assets', 'watermark-tile.png'));

async function watermarkLayer(w, h) {
  const tw = Math.max(140, Math.min(520, Math.round(w * 0.45)));
  const th = Math.round((tw * WM_TILE_H) / WM_TILE_W);
  const base = await sharp(tile).resize(tw, th).png().toBuffer();
  const fade = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${tw}" height="${th}">` +
      `<rect width="100%" height="100%" fill="#000" fill-opacity="${WM_OPACITY}"/></svg>`,
  );
  const faded = await sharp(base).composite([{ input: fade, blend: 'dest-in' }]).png().toBuffer();
  const cx = Math.round(w / 2);
  const cy = Math.round(h / 2);
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
      `<image href="data:image/png;base64,${faded.toString('base64')}" x="${cx - Math.round(tw / 2)}" y="${cy - Math.round(th / 2)}" width="${tw}" height="${th}" transform="rotate(${WM_ANGLE} ${cx} ${cy})"/>` +
      `</svg>`,
  );
  return sharp(svg).png().toBuffer();
}

// تصویر تستی: گرادیان رنگی (شبیه عکس واقعی با جزئیات) در دو نسبت
for (const [name, w, h] of [['landscape', 1200, 900], ['portrait', 900, 1200], ['thumb', 500, 400]]) {
  const base = await sharp({
    create: { width: w, height: h, channels: 3, background: { r: 120, g: 150, b: 90 } },
  })
    .composite([{
      input: Buffer.from(
        `<svg width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
        `<stop offset="0%" stop-color="#c9a961"/><stop offset="100%" stop-color="#4a6741"/></linearGradient></defs>` +
        `<rect width="100%" height="100%" fill="url(#g)"/></svg>`,
      ),
    }])
    .jpeg({ quality: 90 })
    .toBuffer();

  const wm = await watermarkLayer(w, h);
  const out = await sharp(base).composite([{ input: wm, left: 0, top: 0 }]).jpeg({ quality: 84 }).toBuffer();
  const { writeFileSync } = await import('node:fs');
  writeFileSync(`/tmp/wm-test-${name}.jpg`, out);
  console.log(`✓ /tmp/wm-test-${name}.jpg (${w}×${h}) — ${out.length} bytes`);
}
