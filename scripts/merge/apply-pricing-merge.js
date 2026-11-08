#!/usr/bin/env node
/**
 * ادغام تغییرات شمارشگر معکوس (خواسته مالک ۹-۱۱) در نسخهٔ جدید صفحه قیمت‌ها
 * (دور ۲۸ — کارت دارندهٔ بسته + آکاردئون رزرو). سه‌مرحله‌ای idempotent:
 *  ۱) درج بلوک کامپوننت‌ها قبل از PlanCard
 *  ۲) مسیریابی بنر داخل آکاردئون رزرو → CampaignBannerAuto
 *  ۳) مسیریابی بنر بالای صفحه (بی‌بسته‌ها) → CampaignBannerAuto
 */
const fs = require('node:fs');

const PAGE = '/home/z/my-project/src/app/panel/pricing/page.tsx';
const BLOCK = '/home/z/my-project/scripts/merge/countdown-block.txt';

let t = fs.readFileSync(PAGE, 'utf8');
const block = fs.readFileSync(BLOCK, 'utf8');

// ── ۱) مسیریابی بنر — قبل از درج بلوک (نسخهٔ پایه دقیقاً ۲ رندر‌سایت دارد) ──
const innerOld = '<CampaignBanner campaign={campaign} />';
const innerNew = '<CampaignBannerAuto campaign={campaign} />';
if (!t.includes('function CampaignBannerAuto')) {
  const occurrences = t.split(innerOld).length - 1;
  if (occurrences !== 2) throw new Error(`unexpected CampaignBanner occurrences: ${occurrences}`);
  t = t.split(innerOld).join(innerNew);
  console.log('1) both banner render sites routed via CampaignBannerAuto');
} else {
  console.log('1) banner routing already applied');
}

// ── ۲) درج بلوک کامپوننت‌ها قبل از PlanCard ──
if (!t.includes('function CampaignBannerAuto')) {
  const anchor = '/** کارت بستهٔ پولی';
  const idx = t.indexOf(anchor);
  if (idx < 0) throw new Error('anchor PlanCard not found');
  t = t.slice(0, idx) + block + t.slice(idx);
  console.log('2) countdown block inserted before PlanCard');
} else {
  console.log('2) countdown block already present');
}

fs.writeFileSync(PAGE, t);
console.log('merge done:', PAGE);
