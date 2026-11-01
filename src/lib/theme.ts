/**
 * سیستم ظاهر ایمچ — تم روشن/تیره + رنگ برند قابل انتخاب (خواسته مالک ۱-۱۱):
 * ۱۶ رنگ آماده کاملاً متفاوت + رنگ دلخواه کاربر (color picker).
 *
 * معماری:
 * - همه رنگ‌های برند از توکن‌های CSS می‌آیند (--primary و خانواده‌اش)؛
 *   اسکریپت بوت (THEME_BOOT_SCRIPT) همان‌جا در <head> اجرا می‌شود و قبل از
 *   اولین رنگ‌آمیزی، کلاس .dark و/یا توکن‌های رنگ انتخابی را روی <html> می‌گذارد
 *   → بدون هیچ فلشِ سفید (FOUC).
 * - یک پیاده‌سازی واحد: محاسبه پالت (روشن/تیره) فقط داخل خودِ اسکریپت بوت
 *   است و به‌صورت window.__aimchTheme در دسترس ری‌اکت قرار می‌گیرد؛
 *   این ماژول فقط پوشش TypeScript/UI روی همان توابع است.
 * - ذخیره: localStorage «aimch:theme» = {"m":"light|dark","a":"نام رنگ|#hex"}
 */

export type ThemeMode = 'light' | 'dark';

/** یک رنگ آماده — name فقط نام رنگ است (بدون برچسب «دخترانه/پسرانه» و…) */
export interface AccentOption {
  /** کلید ذخیره در localStorage/دیتا-اتریبیوت */
  key: string;
  /** نام نمایشی فارسی */
  name: string;
  /** رنگ پایه (روشن) */
  hex: string;
}

/** رنگ پیش‌فرض ایمچ — آبی اعتماد */
export const DEFAULT_ACCENT = 'آبی';

export const ACCENT_OPTIONS: AccentOption[] = [
  { key: 'آبی', name: 'آبی', hex: '#4c7dd0' },
  { key: 'سرمه‌ای', name: 'سرمه‌ای', hex: '#3d59a8' },
  { key: 'فیروزه‌ای', name: 'فیروزه‌ای', hex: '#12879b' },
  { key: 'سبز', name: 'سبز', hex: '#17976b' },
  { key: 'زیتونی', name: 'زیتونی', hex: '#74883c' },
  { key: 'بنفش', name: 'بنفش', hex: '#7a5bd1' },
  { key: 'یاسی', name: 'یاسی', hex: '#9d6bc6' },
  { key: 'سرخابی', name: 'سرخابی', hex: '#c2417c' },
  { key: 'صورتی', name: 'صورتی', hex: '#d9679c' },
  { key: 'قرمز', name: 'قرمز', hex: '#c23a30' },
  { key: 'شرابی', name: 'شرابی', hex: '#8e3050' },
  { key: 'نارنجی', name: 'نارنجی', hex: '#d97a16' },
  { key: 'خردلی', name: 'خردلی', hex: '#c29a17' },
  { key: 'قهوه‌ای', name: 'قهوه‌ای', hex: '#8a5f3c' },
  { key: 'خاکستری', name: 'خاکستری', hex: '#5c6673' },
  { key: 'زغالی', name: 'زغالی', hex: '#333a42' },
];

export const THEME_STORAGE_KEY = 'aimch:theme';

/** هگزِ نمایشی یک انتخاب (نام آماده یا #hex دلخواه) */
export function accentHex(accent: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(accent)) return accent.toLowerCase();
  return ACCENT_OPTIONS.find((a) => a.key === accent)?.hex ?? ACCENT_OPTIONS[0].hex;
}

/** آیا انتخاب فعلی رنگ دلخواه (نه یکی از ۱۶ رنگ آماده) است؟ */
export function isCustomAccent(accent: string): boolean {
  return accent !== DEFAULT_ACCENT && !ACCENT_OPTIONS.some((a) => a.key === accent);
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

/** خواندن تم ذخیره‌شده (کلاینت) — پیش‌فرض: روشن + آبی */
export function readTheme(): ThemeState {
  if (typeof window === 'undefined') return { mode: 'light', accent: DEFAULT_ACCENT };
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw) {
      const t = JSON.parse(raw) as { m?: unknown; a?: unknown };
      return {
        mode: t?.m === 'dark' ? 'dark' : 'light',
        accent: typeof t?.a === 'string' && t.a ? t.a : DEFAULT_ACCENT,
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

/**
 * اسکریپت بوت — بدون وابستگی، ES5، در <head> قبل از رندر بدنه اجرا می‌شود.
 * منطق پالت:
 *  - روشن: primary = خود رنگ (اگر خیلی روشن بود تا حد خوانایی تیره می‌شود)؛
 *    soft/line = مخلوط با سفید؛ متن دکمه با روشنایی نسبی WCAG انتخاب می‌شود.
 *  - تیره: primary = روشن‌شده با ۲۲٪ سفید تا روی زمینهٔ تیره بنشیند؛
 *    soft/line = مخلوط با کارت تیره.
 */
export const THEME_BOOT_SCRIPT = `(function(){
function hexRgb(h){var m=/^#?([0-9a-f]{6})$/i.exec(h||'');if(!m)return null;var v=parseInt(m[1],16);return[(v>>16)&255,(v>>8)&255,v&255];}
function toHex(r,g,b){return '#'+((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);}
function mix(a,b,t){var A=hexRgb(a),B=hexRgb(b);if(!A||!B)return a;return toHex(Math.round(A[0]+(B[0]-A[0])*t),Math.round(A[1]+(B[1]-A[1])*t),Math.round(A[2]+(B[2]-A[2])*t));}
function lum(h){var c=hexRgb(h);if(!c)return 0;function f(v){v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);}return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2]);}
function fgOf(h){return lum(h)>0.35?'#1f2226':'#ffffff';}
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
var ACCENTS={'آبی':'#4c7dd0','سرمه‌ای':'#3d59a8','فیروزه‌ای':'#12879b','سبز':'#17976b','زیتونی':'#74883c','بنفش':'#7a5bd1','یاسی':'#9d6bc6','سرخابی':'#c2417c','صورتی':'#d9679c','قرمز':'#c23a30','شرابی':'#8e3050','نارنجی':'#d97a16','خردلی':'#c29a17','قهوه‌ای':'#8a5f3c','خاکستری':'#5c6673','زغالی':'#333a42'};
var DEF='آبی';
var VARS=['primary','primary-deep','primary-foreground','primary-soft','primary-line','ring','verified','sidebar-primary','sidebar-primary-foreground','sidebar-accent','sidebar-accent-foreground','sidebar-ring'];
window.__aimchTheme={apply:function(t){
var root=document.documentElement;
var dark=!!(t&&t.m==='dark');
root.classList.toggle('dark',dark);
var a=t?String(t.a||''):'';
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
