#!/usr/bin/env python3
"""تولید src/lib/mock/data.ts از دیتای واقعی APIهای باسکول
(دسته‌بندی‌ها، ۶۰ محصول واقعی با عکس‌های واقعی، ۶۰ درخواست خرید واقعی)
— قابل بازتولید: هر بار داده تازه از باسکول بگیر و این اسکریپت را اجرا کن.
"""
import json, re, random

BASE = '/home/z/my-project'
cats = json.load(open(f'{BASE}/scripts/buskool-data/categories.json'))
products_raw = json.load(open(f'{BASE}/scripts/buskool-data/products.json'))
buyads = json.load(open(f'{BASE}/scripts/buskool-data/buyads.json'))

# ترتیب نمایش صفحه اول باسکول (نمایش واقعی کارت‌ها)
TOP_ORDER = [76, 734, 136, 924, 996, 329, 77, 998, 923, 997]
CAT_IMAGES = {
    76: '/images/categories/agriculture.webp',
    734: '/images/categories/building.webp',
    136: '/images/categories/metals.webp',
    924: '/images/categories/fashion.webp',
    996: '/images/categories/bags.webp',
    329: '/images/categories/machinery.webp',
    77: '/images/categories/food.webp',
    998: '/images/categories/cosmetics.webp',
    923: '/images/categories/electronics.webp',
    997: '/images/categories/sports.webp',
}

def slugify(name: str) -> str:
    s = re.sub(r'[\s_/]+', '-', name.strip())
    return f'خرید-عمده-{s}'

def cat_slug(name: str) -> str:
    return re.sub(r'[\s_/]+', '-', name.strip())

# ─── دسته‌بندی‌ها ─────────────────────────────────────────────
lines = []
def emit_cat(c, parent):
    img = f", image: '{CAT_IMAGES[c['id']]}'" if c['id'] in CAT_IMAGES else ''
    ex = f", example: '{c['example']}'" if c.get('example') else ''
    lines.append(
        f"  {{ id: {c['id']}, categoryName: '{c['category_name']}', slug: '{cat_slug(c['category_name'])}', "
        f"unit: '{c['unit']}', min: {c['min'] or 0}{ex}, parentId: {parent}, score: {c['score'] or 0}{img} }},"
    )

out = []
out.append("/**")
out.append(" * دیتای ماک ایمچ — «دیتای واقعی باسکول» دریافت‌شده از APIهای زنده:")
out.append(" *   - POST /get_category_list (parent_id=0 → ۱۰ دسته اصلی، parent_id=76 → زیرشاخه‌های کشاورزی)")
out.append(" *   - POST /user/get_product_list (۶۰ محصول واقعی: پسته/خرما/سیب/زعفران/بادام)")
out.append(" *   - POST /get_buyAd_list (۶۰ درخواست خرید واقعی)")
out.append(" * نام فیلدها و ساختار عین باسکول است تا فاز مهاجرت بدون تبدیل داده انجام شود.")
out.append(" * نردبان: در ایمچ فروشنده ویژه نداریم؛ آگهی نردبان‌شده (۱۰٬۰۰۰ تومان در روز) بالای نتایج می‌آید.")
out.append(" */")
out.append("")
out.append("import type { BuyRequest, Category, City, Product, Province, User } from '@/lib/types';")
out.append("")
out.append("// ─── دسته‌بندی‌ها (شناسه‌ها/واحدها/حداقل‌ها/امتیازها: داده واقعی باسکول) ──")
out.append("")
out.append("export const categories: Category[] = [")

# سطح ۱ به ترتیب نمایش باسکول
top_by_id = {c['id']: c for c in cats['top']}
for tid in TOP_ORDER:
    emit_cat(top_by_id[tid], 'null')
# سطح ۲ کشاورزی + سطح ۳ همه زیرشاخه‌ها
agri = cats['agri']
for c in agri:
    emit_cat(c, 76)
    for s in cats['subs'].get(str(c['id']), []):
        emit_cat(s, c['id'])
# چند زیرشاخه از ریشه‌های دیگر که در درخواست‌های خرید واقعی دیده شد
extra = [
    (1035, 'بهداشت شخصی', 998, 'عدد', 100, 410),
    (239, 'پلی اتیلن', 136, 'کیلوگرم', 100, 640),
    (250, 'سایر مواد شیمیایی', 136, 'کیلوگرم', 100, 500),
    (955, 'کولر', 923, 'عدد', 5, 320),
]
for cid, name, parent, unit, mn, score in extra:
    lines.append(f"  {{ id: {cid}, categoryName: '{name}', slug: '{cat_slug(name)}', unit: '{unit}', min: {mn}, parentId: {parent}, score: {score} }},")
out.extend(lines)
out.append("];")
out.append("")

# ─── استان‌ها و شهرها (بدون تغییر — واقعی) ──────────────────
out.append("// ─── استان‌ها (۳۱ استان — شناسه‌های باسکول) ──")
out.append("")
out.append("export const provinces: Province[] = [")
provs = ['آذربایجان شرقی','آذربایجان غربی','اردبیل','اصفهان','البرز','ایلام','بوشهر','تهران','چهارمحال و بختیاری','خراسان جنوبی','خراسان رضوی','خراسان شمالی','خوزستان','زنجان','سمنان','سیستان و بلوچستان','فارس','قزوین','قم','کردستان','کرمان','کرمانشاه','کهگیلویه و بویراحمد','گلستان','گیلان','لرستان','مازندران','مرکزی','هرمزگان','همدان','یزد']
for i, p in enumerate(provs, 1):
    out.append(f"  {{ id: {i}, name: '{p}' }},")
out.append("];")
out.append("")

citySeed = [
    (230,'شهر بابک',21),(231,'رفسنجان',21),(232,'کرمان',21),(233,'سیرجان',21),(234,'بم',21),(235,'جیرفت',21),
    (45,'اصفهان',4),(46,'کاشان',4),(47,'خوانسار',4),(48,'نجف‌آباد',4),
    (860,'تهران',8),(861,'اسلامشهر',8),(862,'پاکدشت',8),
    (1110,'مشهد',11),(1111,'تربت حیدریه',11),(1112,'نیشابور',11),(1113,'قوچان',11),
    (1010,'بیرجند',10),(1011,'قائن',10),
    (110,'تبریز',1),(111,'خوی',1),(112,'مراغه',1),
    (1710,'شیراز',17),(1711,'اقلید',17),(1712,'داراب',17),
    (2510,'رشت',25),(2511,'آستانه',25),
    (2710,'آمل',27),(2711,'بابل',27),(2712,'ساری',27),
    (3110,'یزد',31),(3111,'اردکان',31),
    (3010,'همدان',30),(3011,'تویسرکان',30),
    (1910,'قم',19),(1610,'زاهدان',16),(2810,'ارومیه',2),(310,'اهواز',13),
]
out.append("// ─── شهرها (شناسه‌های باسکول: شهر بابک=230، اصفهان=45) ──")
out.append("")
out.append("export const cities: City[] = [")
for cid, name, pid in citySeed:
    out.append(f"  {{ id: {cid}, name: '{name}', provinceId: {pid} }},")
out.append("];")
out.append("")

# ─── کاربران — از user_info محصولات واقعی باسکول ─────────────
users_map = {}
for q, lst in products_raw.items():
    for p in lst:
        u = p['user_info']
        if u['id'] not in users_map:
            users_map[u['id']] = u

random.seed(42)
phone_pool = iter([f'0912{random.randint(1000000, 9999999)}' for _ in range(200)])
biz = 'عرضه‌کننده عمده محصولات؛ ثبت‌نام‌شده در بازار ایمچ.'
out.append("// ─── کاربران/فروشندگان (user_info واقعی محصولات باسکول) ──")
out.append("")
out.append("export const users: User[] = [")
for uid, u in users_map.items():
    verified = bool(u.get('is_verified'))
    phone = '09962253970' if uid == 46676 else next(phone_pool)
    out.append(
        "  {\n"
        f"    id: {uid}, phone: '{phone}', userName: '{u['user_name']}',\n"
        f"    firstName: '{u['first_name']}', lastName: '{u['last_name']}',\n"
        f"    activePakageType: {u.get('active_pakage_type') or 0}, isVerified: {str(verified).lower()},\n"
        f"    businessDesc: '{biz}',\n"
        f"    createdAt: '{u['created_at']}',\n"
        "  },"
    )
out.append("];")
out.append("")

# ─── محصولات واقعی ────────────────────────────────────────────
out.append("// ─── محصولات (ساختار عین خروجی user/get_product_list باسکول؛ عکس‌ها واقعی) ──")
out.append("")
out.append("const seller = (id: number) => {")
out.append("  const u = users.find((x) => x.id === id)!;")
out.append("  return { id: u.id, userName: u.userName, firstName: u.firstName, lastName: u.lastName, activePakageType: u.activePakageType, isVerified: u.isVerified };")
out.append("};")
out.append("")
out.append("export const products: Product[] = [")

ladder_idx = {0, 2, 5, 9}  # در هر گروه چندتا نردبان‌شده
n = 0
for q, lst in products_raw.items():
    for i, p in enumerate(lst):
        m = p['main']
        desc = (p['main'].get('description') or '').replace('<hr/>', '\n').replace('\r', '')
        desc = desc.replace('\\', '\\\\').replace("'", "\\'").replace('\n', '\\n')
        desc = re.sub(r'\s+', ' ', desc).replace('\\n', ' ').strip()
        # دیسکریپشن واقعی باسکول جمله‌های تکراری قیمت دارد — همان‌طور که هست نگه می‌داریم (دیتای واقعی)
        photos = ', '.join(f"'{ph['file_path']}'" for ph in (p.get('photos') or []))
        created = m.get('updated_at') or '2026-10-20 10:00:00'
        is_ladder = 'true' if i in ladder_idx else 'false'
        out.append("  {")
        out.append(f"    id: {m['id']}, productName: '{m['product_name']}', slug: '{slugify(m['product_name'])}',")
        out.append(f"    description: '{desc}',")
        out.append(f"    stock: {m['stock']}, minSalePrice: {m['min_sale_price'] if m['min_sale_price'] is not None else 'null'}, minSaleAmount: {m['min_sale_amount']}, unit: '{m['unit']}',")
        out.append(f"    categoryId: {m['category_id']}, categoryName: '{m['category_name']}', subCategoryId: {m['sub_category_id']}, subCategoryName: '{m['sub_category_name']}',")
        out.append(f"    provinceId: {m['province_id']}, provinceName: '{m['province_name']}', cityId: {m['city_id']}, cityName: '{m['city_name']}',")
        out.append(f"    myuserId: {m['myuser_id']}, seller: seller({m['myuser_id']}),")
        out.append(f"    isLadder: {is_ladder}, isElevated: false, hasVideo: {str(bool(m['has_video'])).lower()}, isOld: {str(bool(m['is_old'])).lower()},")
        out.append(f"    viewCount: {random.randint(300, 6000)},")
        out.append(f"    createdAt: '{created}', updatedAt: '{m.get('updated_at') or created}',")
        out.append(f"    photos: [{photos}],")
        out.append("  },")
        n += 1
out.append("];")
out.append("")

# ─── درخواست‌های خرید واقعی ───────────────────────────────────
out.append(f"// ─── درخواست‌های خرید ({len(buyads)} مورد — داده واقعی get_buyAd_list باسکول) ──")
out.append("")
out.append("export const buyRequests: BuyRequest[] = [")
for b in buyads:
    name = (b['name'] or '').replace("'", "\\'") if b['name'] else ''
    name_lit = f"'{name}'" if b['name'] else 'null'
    out.append(
        f"  {{ id: {b['id']}, name: {name_lit}, categoryId: {b['category_id']}, subcategoryName: '{b['subcategory_name']}', "
        f"requirementAmount: {b['requirement_amount']}, unit: '{b['unit']}', myuserId: {b['myuser_id']}, "
        f"firstName: '{b['first_name']}', lastName: '{b['last_name']}', city: '{b['city']}', "
        f"isVerified: {str(bool(b['is_verified'])).lower()}, createdAt: '{b['created_at']}' }},"
    )
out.append("];")
out.append("")

# ─── ابزارها ──────────────────────────────────────────────────
out.append("""// ─── ابزارها ──────────────────────────────────────────────────────────

export function findCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug || c.categoryName === slug);
}

export function categoryTree(): Category[] {
  const withChildren = (parentId: number): Category[] =>
    categories
      .filter((c) => c.parentId === parentId)
      .map((c) => ({ ...c, children: withChildren(c.id) }));
  return categories.filter((c) => c.parentId === null).map((r) => ({ ...r, children: withChildren(r.id) }));
}""")

with open(f'{BASE}/src/lib/mock/data.ts', 'w') as f:
    f.write('\n'.join(out) + '\n')

print(f"generated: {n} products, {len(users_map)} users, {len(buyads)} buy requests")
print(f"categories: 10 top + {len(agri)} L2 + {sum(len(v) for v in cats['subs'].values())} L3")
