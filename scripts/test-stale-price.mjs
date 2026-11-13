// تست واحد stalePriceFa — هشدار کهنگی قیمت (خواستهٔ مالک ۱۳-۱۱).
// منطق عین lib/format.ts اینجا تکرار شده؛ اگر فرمت عوض شد هم‌زمان آپدیت شود.
// اجرا: node scripts/test-stale-price.mjs
let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

const FA_COUNT_WORDS = ['یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه', 'ده', 'یازده'];
const toFa = (n) => new Intl.NumberFormat('fa-IR').format(n);

function stalePriceFa(iso) {
  if (!iso) return null;
  const days = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  if (days < 30.44) return null;
  if (days >= 365.25) {
    const years = Math.floor(days / 365.25);
    const word = years <= FA_COUNT_WORDS.length ? FA_COUNT_WORDS[years - 1] : toFa(years);
    return `این قیمت بیش از ${word} سال است که آپدیت نشده`;
  }
  const months = Math.min(Math.floor(days / 30.44), FA_COUNT_WORDS.length);
  return `این قیمت بیش از ${FA_COUNT_WORDS[months - 1]} ماه است که آپدیت نشده`;
}

const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString();

console.log('— زیر یک ماه: هیچی —');
check('۱ روز', stalePriceFa(daysAgo(1)) === null);
check('۲۹ روز', stalePriceFa(daysAgo(29)) === null);
check('null', stalePriceFa(null) === null);
check('خالی', stalePriceFa('') === null);

console.log('— ماه‌ها —');
check('۳۱ روز = بیش از یک ماه', stalePriceFa(daysAgo(31)) === 'این قیمت بیش از یک ماه است که آپدیت نشده');
check('۴۵ روز = بیش از یک ماه', stalePriceFa(daysAgo(45)) === 'این قیمت بیش از یک ماه است که آپدیت نشده');
check('۶۲ روز = بیش از دو ماه', stalePriceFa(daysAgo(62)) === 'این قیمت بیش از دو ماه است که آپدیت نشده');
check('۱۰۰ روز = بیش از سه ماه', stalePriceFa(daysAgo(100)) === 'این قیمت بیش از سه ماه است که آپدیت نشده');
check('۳۳۰ روز = بیش از ده ماه', stalePriceFa(daysAgo(330)) === 'این قیمت بیش از ده ماه است که آپدیت نشده');
check('۳۵۰ روز = بیش از یازده ماه', stalePriceFa(daysAgo(350)) === 'این قیمت بیش از یازده ماه است که آپدیت نشده');

console.log('— سال‌ها —');
check('۳۶۶ روز = بیش از یک سال', stalePriceFa(daysAgo(366)) === 'این قیمت بیش از یک سال است که آپدیت نشده');
check('۵۴۰ روز = بیش از یک سال (هنوز یک)', stalePriceFa(daysAgo(540)) === 'این قیمت بیش از یک سال است که آپدیت نشده');
check('۷۴۰ روز = بیش از دو سال', stalePriceFa(daysAgo(740)) === 'این قیمت بیش از دو سال است که آپدیت نشده');
check('۲۵۰۰ روز = بیش از شش سال', stalePriceFa(daysAgo(2500)) === 'این قیمت بیش از شش سال است که آپدیت نشده');

console.log('— قالب بک‌اند «YYYY-MM-DD HH:mm:ss» —');
const bkDaysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 19).replace('T', ' ');
check('قالب باسکول قدیمی (۲۰۲۰)', stalePriceFa('2020-01-12 00:00:00') === 'این قیمت بیش از شش سال است که آپدیت نشده');
check('قالب باسکول تازه (۵ روز پیش)', stalePriceFa(bkDaysAgo(5)) === null);

console.log(`\n${pass} پاس / ${fail} خطا`);
process.exit(fail ? 1 : 0);
