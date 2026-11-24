/**
 * سیستم ظاهر ایمچ — تم روشن/تیره + رنگ برند قابل انتخاب (خواسته مالک ۱-۱۱):
 * ۴۱ رنگ آمادهٔ نام‌دار در ۱۰ خانوادهٔ رنگ + رنگ دلخواه کاربر (color picker).
 *
 * نام‌ها از فرهنگ رنگ فارسی (مرجع: چیدانه — «آبی نفتی»، «آبی زنگاری»، …)
 * گرفته شده‌اند تا کاربر با سلیقهٔ خودش رنگ را انتخاب کند.
 *
 * رنگ پیش‌فرض برند = **نقره‌ای (#64748B)** — انتخاب مالک (۸-۱۱): «رنگ
 * پیش‌فرض سایت به جای آبی نفتی نقره‌ای باشد؛ رنگ دوم اصلی مثل لوگو نارنجی
 * خوش‌رنگ». نارنجی (توکن emphasis در globals.css = #F97316) فقط برای
 * جاهایی که باید متمایز باشند (CTAهای بازاریابی) — هم‌رنگ نقطهٔ لوگو.
 *
 * معماری:
 * - همه رنگ‌های برند از توکن‌های CSS می‌آیند (--primary و خانواده‌اش)؛
 *   اسکریپت بوت (THEME_BOOT_SCRIPT) همان‌جا در <head> اجرا می‌شود و قبل از
 *   اولین رنگ‌آمیزی، کلاس .dark و/یا توکن‌های رنگ انتخابی را روی <html> می‌گذارد
 *   → بدون هیچ فلشِ سفید (FOUC).
 * - یک پیاده‌سازی واحد: محاسبه پالت (روشن/تیره) فقط داخل خودِ اسکریپت بوت
 *   است و به‌صورت window.__aimchTheme در دسترس ری‌اکت قرار می‌گیرد؛
 *   این ماژول فقط پوشش TypeScript/UI روی همان توابع است.
 * - ذخیره: localStorage «aimch:theme» = {"m":"light|dark|mono","a":"نام رنگ|#hex"}
 */

export type ThemeMode = 'light' | 'dark' | 'mono';

/** خانوادهٔ رنگ — چیپ‌های نوار افقی بالای انتخابگر */
export type AccentFamilyKey =
  | 'آبی'
  | 'فیروزه‌ای'
  | 'سبز'
  | 'بنفش'
  | 'صورتی'
  | 'قرمز'
  | 'نارنجی'
  | 'زرد'
  | 'قهوه‌ای'
  | 'خنثی';

/** یک رنگ آماده — نام‌ها نام واقعی رنگ در فرهنگ فارسی‌اند */
export interface AccentOption {
  /** کلید ذخیره در localStorage/دیتا-اتریبیوت */
  key: string;
  /** نام نمایشی فارسی */
  name: string;
  /** رنگ پایه (روشن) */
  hex: string;
  /** خانوادهٔ رنگ برای دسته‌بندی انتخابگر */
  family: AccentFamilyKey;
}

/** رنگ پیش‌فرض ایمچ — نقره‌ای: خنثی، جدی، تجاری (انتخاب مالک ۸-۱۱) */
export const DEFAULT_ACCENT = 'نقره‌ای';
export const DEFAULT_ACCENT_HEX = '#64748B';

/** ترتیب خانواده‌ها در نوار افقی — هر خانواده رنگ نمایندهٔ خودش را دارد */
export const ACCENT_FAMILIES: { key: AccentFamilyKey; hex: string }[] = [
  { key: 'آبی', hex: '#245B7A' },
  { key: 'فیروزه‌ای', hex: '#12879B' },
  { key: 'سبز', hex: '#17976B' },
  { key: 'بنفش', hex: '#7A5BD1' },
  { key: 'صورتی', hex: '#D9679C' },
  { key: 'قرمز', hex: '#C23A30' },
  { key: 'نارنجی', hex: '#D97A16' },
  { key: 'زرد', hex: '#C29A17' },
  { key: 'قهوه‌ای', hex: '#8A5F3C' },
  { key: 'خنثی', hex: '#5C6673' },
];

/** ۴۱ رنگ نام‌دار در ۱۰ خانواده — کلیدهای قدیمی (سرمه‌ای، زیتونی، …) حفظ شده‌اند */
export const ACCENT_OPTIONS: AccentOption[] = [
  // ─── خانوادهٔ آبی ───
  { key: 'آبی نفتی', name: 'آبی نفتی', hex: '#245B7A', family: 'آبی' },
  { key: 'آبی لاجوردی', name: 'آبی لاجوردی', hex: '#26619C', family: 'آبی' },
  { key: 'آبی رویال', name: 'آبی رویال', hex: '#4169E1', family: 'آبی' },
  { key: 'آبی کبالت', name: 'آبی کبالت', hex: '#0047AB', family: 'آبی' },
  { key: 'آبی اقیانوسی', name: 'آبی اقیانوسی', hex: '#1D6FA3', family: 'آبی' },
  { key: 'آبی آسمانی', name: 'آبی آسمانی', hex: '#4C7DD0', family: 'آبی' },
  { key: 'آبی سرمه‌ای', name: 'آبی سرمه‌ای', hex: '#3D59A8', family: 'آبی' },
  // ─── خانوادهٔ فیروزه‌ای ───
  { key: 'فیروزه‌ای', name: 'فیروزه‌ای', hex: '#12879B', family: 'فیروزه‌ای' },
  { key: 'فیروزه‌ای تیفانی', name: 'فیروزه‌ای تیفانی', hex: '#0D9E97', family: 'فیروزه‌ای' },
  { key: 'سبزآبی', name: 'سبزآبی', hex: '#17827E', family: 'فیروزه‌ای' },
  { key: 'آبی زنگاری', name: 'آبی زنگاری', hex: '#43998F', family: 'فیروزه‌ای' },
  // ─── خانوادهٔ سبز ───
  { key: 'سبز', name: 'سبز', hex: '#17976B', family: 'سبز' },
  { key: 'سبز زمردی', name: 'سبز زمردی', hex: '#0E8A54', family: 'سبز' },
  { key: 'سبز جنگلی', name: 'سبز جنگلی', hex: '#2F6B4F', family: 'سبز' },
  { key: 'سبز زیتونی', name: 'سبز زیتونی', hex: '#74883C', family: 'سبز' },
  // ─── خانوادهٔ بنفش ───
  { key: 'بنفش', name: 'بنفش', hex: '#7A5BD1', family: 'بنفش' },
  { key: 'بنفش سیر', name: 'بنفش سیر', hex: '#5C3D99', family: 'بنفش' },
  { key: 'یاسی', name: 'یاسی', hex: '#9D6BC6', family: 'بنفش' },
  { key: 'ارغوانی', name: 'ارغوانی', hex: '#8E4585', family: 'بنفش' },
  // ─── خانوادهٔ صورتی ───
  { key: 'سرخابی', name: 'سرخابی', hex: '#C2417C', family: 'صورتی' },
  { key: 'صورتی', name: 'صورتی', hex: '#D9679C', family: 'صورتی' },
  { key: 'مجنتی', name: 'مجنتی', hex: '#A62D8C', family: 'صورتی' },
  { key: 'گلبهی', name: 'گلبهی', hex: '#DE8CA5', family: 'صورتی' },
  // ─── خانوادهٔ قرمز ───
  { key: 'قرمز', name: 'قرمز', hex: '#C23A30', family: 'قرمز' },
  { key: 'قرمز لاکی', name: 'قرمز لاکی', hex: '#A32E2A', family: 'قرمز' },
  { key: 'شرابی', name: 'شرابی', hex: '#8E3050', family: 'قرمز' },
  // ─── خانوادهٔ نارنجی ───
  { key: 'نارنجی', name: 'نارنجی', hex: '#D97A16', family: 'نارنجی' },
  { key: 'نارنجی سوخته', name: 'نارنجی سوخته', hex: '#BF5B16', family: 'نارنجی' },
  { key: 'مرجانی', name: 'مرجانی', hex: '#D8664F', family: 'نارنجی' },
  // ─── خانوادهٔ زرد ───
  { key: 'خردلی', name: 'خردلی', hex: '#C29A17', family: 'زرد' },
  { key: 'کهربایی', name: 'کهربایی', hex: '#C87E1F', family: 'زرد' },
  { key: 'زرد طلایی', name: 'زرد طلایی', hex: '#D4AC3E', family: 'زرد' },
  // ─── خانوادهٔ قهوه‌ای ───
  { key: 'قهوه‌ای', name: 'قهوه‌ای', hex: '#8A5F3C', family: 'قهوه‌ای' },
  { key: 'شکلاتی', name: 'شکلاتی', hex: '#6B4A30', family: 'قهوه‌ای' },
  { key: 'حنایی', name: 'حنایی', hex: '#A5794B', family: 'قهوه‌ای' },
  // ─── خانوادهٔ خنثی ───
  { key: 'خاکستری', name: 'خاکستری', hex: '#5C6673', family: 'خنثی' },
  { key: 'زغالی', name: 'زغالی', hex: '#333A42', family: 'خنثی' },
  { key: 'سنگی', name: 'سنگی', hex: '#5E7488', family: 'خنثی' },
  { key: 'دودی', name: 'دودی', hex: '#75808C', family: 'خنثی' },
  { key: 'نقره‌ای', name: 'نقره‌ای', hex: '#64748B', family: 'خنثی' },
  { key: 'بژ', name: 'بژ', hex: '#A89A85', family: 'خنثی' },
];

/** مهاجرت کلیدهای قدیمی — «آبی» (پیش‌فرض سابق) اکنون آبی نفتی است */
const LEGACY_ACCENTS: Record<string, string> = {
  آبی: 'آبی نفتی',
};

/** نرمال‌سازی انتخاب (مهاجرت کلیدهای قدیمی) */
export function normalizeAccent(accent: string): string {
  return LEGACY_ACCENTS[accent] ?? accent;
}

export const THEME_STORAGE_KEY = 'aimch:theme';

/** هگزِ نمایشی یک انتخاب (نام آماده یا #hex دلخواه) */
export function accentHex(accent: string): string {
  const a = normalizeAccent(accent);
  if (/^#[0-9a-fA-F]{6}$/.test(a)) return a.toLowerCase();
  return ACCENT_OPTIONS.find((o) => o.key === a)?.hex ?? DEFAULT_ACCENT_HEX;
}

/** آیا انتخاب فعلی رنگ دلخواه (نه یکی از رنگ‌های آماده) است؟ */
export function isCustomAccent(accent: string): boolean {
  const a = normalizeAccent(accent);
  return a !== DEFAULT_ACCENT && !ACCENT_OPTIONS.some((o) => o.key === a);
}

declare global {
  interface Window {
    /** توسط اسکریپت بوت تعریف می‌شود — پیاده‌سازی واحد پالت تم */
    __aimchTheme?: {
      apply: (t: { m: string; a: string }) => void;
    };
  }
}

export interface ThemeState {
  mode: ThemeMode;
  accent: string;
}

/** خواندن تم ذخیره‌شده (کلاینت) — پیش‌فرض: روشن + آبی نفتی */
export function readTheme(): ThemeState {
  if (typeof window === 'undefined') return { mode: 'light', accent: DEFAULT_ACCENT };
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw) {
      const t = JSON.parse(raw) as { m?: unknown; a?: unknown };
      return {
        mode: t?.m === 'dark' ? 'dark' : t?.m === 'mono' ? 'mono' : 'light',
        accent:
          typeof t?.a === 'string' && t.a ? normalizeAccent(t.a) : DEFAULT_ACCENT,
      };
    }
  } catch {
    /* سشن خصوصی یا JSON خراب — پیش‌فرض */
  }
  return { mode: 'light', accent: DEFAULT_ACCENT };
}

/** رویداد داخلی — تغییر تم در همین تب را به هوک اعلام می‌کند */
export const THEME_CHANGE_EVENT = 'aimch:theme-change';

/** اعمال + ذخیرهٔ همیشگی تم (کل سایت — توکن‌های CSS سراسری‌اند) */
export function writeTheme(t: ThemeState) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ m: t.mode, a: t.accent }));
  } catch {
    /* حالت ناشناس — فقط همین صفحه اعمال می‌شود */
  }
  window.__aimchTheme?.apply({ m: t.mode, a: t.accent });
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

/** نقشهٔ رنگ‌های آماده برای اسکریپت بوت — از همان دادهٔ واحد بالا ساخته می‌شود
 *  تا تناسب TS/بوت هرگز به‌هم نریزد */
const ACCENTS_JS = JSON.stringify(Object.fromEntries(ACCENT_OPTIONS.map((o) => [o.key, o.hex])));
const LEGACY_JS = JSON.stringify(LEGACY_ACCENTS);

/**
 * اسکریپت بوت — بدون وابستگی، ES5، در <head> قبل از رندر بدنه اجرا می‌شود.
 * منطق پالت:
 *  - روشن: primary = خود رنگ (اگر خیلی روشن بود تا حد خوانایی تیره می‌شود)؛
 *    soft/line = مخلوط با سفید؛ متن دکمه با روشنایی نسبی WCAG انتخاب می‌شود.
 *  - تیره: primary = روشن‌شده با ۲۲٪ سفید تا روی زمینهٔ تیره بنشیند؛
 *    soft/line = مخلوط با کارت تیره.
 *  - مقدار پیش‌فرض (نقره‌ای) توکنی نمی‌گذارد → مقادیر CSS سراسری
 *    (globals.css) اعمال می‌شوند؛ بقیهٔ رنگ‌ها data-accent + توکن‌های خطی.
 */
export const THEME_BOOT_SCRIPT = `(function(){
function hexRgb(h){var m=/^#?([0-9a-f]{6})$/i.exec(h||'');if(!m)return null;var v=parseInt(m[1],16);return[(v>>16)&255,(v>>8)&255,v&255];}
function toHex(r,g,b){return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);}
function mix(a,b,t){var A=hexRgb(a),B=hexRgb(b);if(!A||!B)return a;return toHex(Math.round(A[0]+(B[0]-A[0])*t),Math.round(A[1]+(B[1]-A[1])*t),Math.round(A[2]+(B[2]-A[2])*t));}
function lum(h){var c=hexRgb(h);if(!c)return 0;function f(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);}return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]);}
/* قانون متن سفید (خواسته مالک ۲-۱۱ دور ۱۵): فونتِ هر عنصری که پس‌زمینهٔ
   رنگی دارد همیشه سفید است — حتی رنگ‌های کمرنگِ تم؛ «رنگ مشکلی زیاد جالب
   در نمی‌آد». normLight خودش رنگ‌های خیلی روشن را تا حد خوانایی تیره می‌کند */
function fgOf(){return '#ffffff';}
function normLight(h){if(lum(h)<=0.5)return h;var c=h;for(var i=0;i<24;i++){c=mix(c,'#000000',0.08);if(lum(c)<=0.5)break;}return c;}
function normDark(h){if(lum(h)>=0.14)return h;var c=h;for(var i=0;i<24;i++){c=mix(c,'#ffffff',0.08);if(lum(c)>=0.14)break;}return c;}
function accentVars(hex,dark){
var CARD=dark?'#23262b':'#ffffff';
var base=dark?normDark(hex):normLight(hex);
var primary=dark?mix(base,'#ffffff',0.22):base;
var deep=dark?mix(primary,'#000000',0.12):mix(primary,'#000000',0.15);
var soft=dark?mix(primary,CARD,0.92):mix(primary,CARD,0.92);
var line=dark?mix(primary,CARD,0.72):mix(primary,CARD,0.72);
return{
'primary':primary,'primary-deep':deep,'primary-foreground':fgOf(primary),
'primary-soft':soft,'primary-line':line,
'ring':primary,'verified':primary,
'sidebar-primary':primary,'sidebar-primary-foreground':fgOf(primary),
'sidebar-accent':soft,
'sidebar-accent-foreground':dark?primary:mix(primary,'#000000',0.18),
'sidebar-ring':primary};
}
var KEY='aimch:theme';
var ACCENTS=${ACCENTS_JS};
var LEGACY=${LEGACY_JS};
var DEF=${JSON.stringify(DEFAULT_ACCENT)};
var VARS=['primary','primary-deep','primary-foreground','primary-soft','primary-line','ring','verified','sidebar-primary','sidebar-primary-foreground','sidebar-accent','sidebar-accent-foreground','sidebar-ring'];
window.__aimchTheme={apply:function(t){
var root=document.documentElement;
var dark=!!(t&&t.m==='dark');
root.classList.toggle('dark',dark);
/* تم روشن تک‌رنگ (خواستهٔ مالک ۲-۱۱): کلاس mono فقط مقیاس خنثی
   (زمینه/کارت/خط/متن) را در globals.css بازنویسی می‌کند؛ رنگ لهجهٔ
   کاربر (a) مثل قبل روی همان توکن‌های primary می‌نشیند — پس تک‌رنگ
   با هر ۴۱ رنگ و رنگ دلخواه کار می‌کند. */
var mono=!!(t&&t.m==='mono');
root.classList.toggle('mono',mono);
var a=t?String(t.a||''):'';
if(LEGACY[a])a=LEGACY[a];
var hex=/^#[0-9a-fA-F]{6}$/.test(a)?a.toLowerCase():(ACCENTS[a]||ACCENTS[DEF]);
if(!a||a===DEF){
root.removeAttribute('data-accent');
for(var i=0;i<VARS.length;i++)root.style.removeProperty('--'+VARS[i]);
}else{
root.setAttribute('data-accent',a);
var v=accentVars(hex,dark);
for(var k in v)root.style.setProperty('--'+k,v[k]);
}
}};
try{var s=localStorage.getItem(KEY);if(s)window.__aimchTheme.apply(JSON.parse(s));}catch(e){}
})();`;
