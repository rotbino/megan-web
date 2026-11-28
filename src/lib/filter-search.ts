/**
 * پل سرچِ محلی هدر ↔ صفحهٔ فیلتر پیشرفته (/product-filter).
 *
 * سرچ‌باکس هدر در صفحهٔ فیلتر (پراپ filterSearch) نباید به /product-list/search
 * برود؛ عبارت باید در همان صفحه فیلتر شود (خواستهٔ مالک ۲۸-۱۱ دور ۴). سمت
 * دیگر عبارت فعال (چیپ جستجو/پاک‌کردن آن) باید در جعبهٔ هدر هم منعکس شود.
 *
 * دو رویداد کوچک CustomEvent:
 *  • FILTER_SEARCH_SUBMIT — هدر → صفحه: کاربر اینتر/دکمهٔ جستجو زد؛ عبارت بی‌درنگ فیلتر شود.
 *  • FILTER_SEARCH_SYNC   — صفحه → هدر: عبارت فعال تغییر کرد (تایپ، چیپ پاک شد، ورود عمیق ?q=)؛ جعبه آینه شود.
 */

export const FILTER_SEARCH_SUBMIT = 'imach:filter-search-submit';
export const FILTER_SEARCH_SYNC = 'imach:filter-search-sync';

/** هدر → صفحه — عبارت تازه جستجو شد */
export function dispatchFilterSearchSubmit(term: string): void {
  window.dispatchEvent(new CustomEvent<string>(FILTER_SEARCH_SUBMIT, { detail: term }));
}

/** صفحه → هدر — عبارت فعال تغییر کرد (آینهٔ جعبه) */
export function dispatchFilterSearchSync(term: string): void {
  window.dispatchEvent(new CustomEvent<string>(FILTER_SEARCH_SYNC, { detail: term }));
}
