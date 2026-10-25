import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BadgeCheck, MapPin, MessagesSquare, Phone, Star } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { VerifiedBadge } from '@/components/shared/badges';
import { ProfileTabs } from '@/components/products/profile-tabs';
import { Button } from '@/components/ui/button';
import { users, products } from '@/lib/mock/data';
import { toFa } from '@/lib/format';

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const user = users.find((u) => u.userName === decodeURIComponent(username));
  if (!user) return { title: 'پروفایل یافت نشد' };
  const name = `${user.firstName} ${user.lastName}`;
  return {
    title: `فروشگاه ${name} | پروفایل فروشنده ایمچ`,
    description: `${name} — ${user.businessDesc?.slice(0, 120)}`,
    alternates: { canonical: `/profile/${user.userName}` },
  };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;
  const user = users.find((u) => u.userName === decodeURIComponent(username));
  if (!user) notFound();

  const sellerProducts = products.filter((p) => p.myuserId === user.id);
  const name = `${user.firstName} ${user.lastName}`;

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* کارت هویت فروشنده */}
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
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
                فروشنده عمده — فعال از {new Intl.DateTimeFormat('fa-IR', { year: 'numeric', month: 'long' }).format(new Date(user.createdAt))}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Star size={13} className="text-ladder" /> {toFa(9)} نظر</span>
                <span className="inline-flex items-center gap-1"><MessagesSquare size={13} /> پاسخ‌گویی زیر ۲ ساعت</span>
              </div>
            </div>
            <div className="flex gap-2 sm:flex-col">
              <Button className="rounded-md"><Phone size={16} /> شماره تماس</Button>
            </div>
          </div>
        </div>

        <ProfileTabs
          user={user}
          products={sellerProducts}
        />
      </main>
      <Footer />
    </>
  );
}
