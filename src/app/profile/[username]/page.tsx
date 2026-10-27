import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BadgeCheck, MapPin, Phone } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { VerifiedBadge } from '@/components/shared/badges';
import { ProfileTabs } from '@/components/products/profile-tabs';
import { ShareBox } from '@/components/shared/share-box';
import { Button } from '@/components/ui/button';
import { toFa } from '@/lib/format';
import { apiBase } from '@/lib/api/client';
import { SITE_URL } from '@/lib/site';
import type { Product } from '@/lib/types';

interface Props {
  params: Promise<{ username: string }>;
}

interface SellerData {
  user: {
    id: string;
    userName: string;
    firstName: string;
    lastName: string;
    activePakageType: number;
    isVerified: boolean;
    businessDesc: string | null;
    avatarUrl: string | null;
    createdAt: string;
    daysInImach?: number;
    phone?: string;
  };
  products: Product[];
}

/** SSR — فروشنده زنده از بک‌اند.
 *  فالبک ماک حذف شد — پروفایل فقط با کاربر واقعی دیتابیس می‌آید؛ نبود = ۴۰۴. */
async function getSeller(userName: string): Promise<SellerData | null> {
  try {
    const res = await fetch(`${apiBase()}/products/getSeller`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName }),
      next: { revalidate: 120 },
    });
    const json = (await res.json()) as { status: boolean; data: SellerData };
    if (!json?.status || !json.data) return null;
    // شکل هم‌نما با User فرانت برای کامپوننت‌های موجود
    const u = json.data.user;
    return {
      user: {
        ...u,
        activePakageType: 0,
        daysInImach: Math.max(
          1,
          Math.round((Date.now() - new Date(u.createdAt || Date.now()).getTime()) / 86_400_000),
        ),
      },
      products: json.data.products.map((p) => ({
        ...p,
        isElevated: false,
        photoThumbs: p.photoThumbs ?? p.photos,
      })) as Product[],
    };
  } catch {
    // بک‌اند در دسترس نیست — دیتای ماک وجود ندارد؛ ۴۰۴
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const seller = await getSeller(decodeURIComponent(username));
  if (!seller) return { title: 'پروفایل یافت نشد' };
  const name = `${seller.user.firstName} ${seller.user.lastName}`;
  return {
    title: `فروشگاه ${name} | پروفایل فروشنده ایمچ`,
    description: `${name} — ${(seller.user.businessDesc ?? '').slice(0, 120)}`,
    alternates: { canonical: `/profile/${seller.user.userName}` },
  };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const seller = await getSeller(decodeURIComponent(username));
  if (!seller) notFound();
  const user = seller.user;

  const sellerProducts = seller.products;
  const name = `${user.firstName} ${user.lastName}`;

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* کارت هویت فروشنده + جعبه اشتراک گذاری */}
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <div className="flex flex-col gap-5 rounded-md border bg-card p-6 sm:flex-row sm:items-center">
              <span className="grid size-16 shrink-0 place-items-center rounded-md bg-primary/10 text-xl font-extrabold text-primary">
                {user.firstName[0]}
              </span>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold">{name}</h1>
                  {user.isVerified && <VerifiedBadge />}
                </div>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin size={14} className="text-primary/70" />
                  {toFa(user.daysInImach ?? 1)} روز در ایمچ
                </p>
              </div>
              <div className="flex gap-2 sm:flex-col">
                <Button className="rounded-md"><Phone size={16} /> شماره تماس</Button>
              </div>
            </div>
            <ShareBox url={`${SITE_URL}/profile/${user.userName}`} />
          </div>
        </div>

        <ProfileTabs
          user={user as unknown as Parameters<typeof ProfileTabs>[0]['user']}
          products={sellerProducts}
        />
      </main>
      <Footer />
    </>
  );
}
