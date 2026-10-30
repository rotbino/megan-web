'use client';

/**
 * نظرسنجی — عین MHTML باسکول:
 * «لطفاً نظر خود را درباره عملکرد ایمچ بیان کنید» + پنج گزینه (عالی تا خیلی بد) +
 * «نظر شما» (متن دلخواه) + «ثبت نظر» + حالت تشکر پس از ثبت.
 *
 * ذخیره واقعی (بک‌اند /survey): پاسخ قبلی کاربر می‌آید تا فرم ویرایش پر شود؛
 * ثبت مجدد = ویرایش همان پاسخ (upsert روی userId یکتا). پاسخ‌ها در پنل
 * ادمین (نظرسنجی‌ها) دیده می‌شوند.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Pencil, ScrollText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PanelCard } from '@/components/panel/panel-parts';
import { apiFetch } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { SurveyScore } from '@/lib/types';

const OPTIONS: { key: SurveyScore; label: string; tone: string }[] = [
  { key: 'excellent', label: 'عالی', tone: 'border-emerald-400 bg-emerald-50 text-emerald-700' },
  { key: 'good', label: 'خوب', tone: 'border-lime-400 bg-lime-50 text-lime-700' },
  { key: 'average', label: 'متوسط', tone: 'border-amber-400 bg-amber-50 text-amber-700' },
  { key: 'bad', label: 'بد', tone: 'border-orange-400 bg-orange-50 text-orange-700' },
  { key: 'very_bad', label: 'خیلی بد', tone: 'border-red-400 bg-red-50 text-red-700' },
];

interface MySurvey {
  score: SurveyScore;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function SurveyPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [score, setScore] = useState<SurveyScore | null>(null);
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);

  // پاسخ قبلی من — فرم را برای ویرایش پر می‌کند
  const { data: mine } = useQuery({
    queryKey: ['my-survey'],
    queryFn: () => apiFetch<MySurvey | null>('/survey/getMine', {}),
  });

  // پیش‌پر کردن فرم با پاسخ قبلی — الگوی «تنظیم state در زمان رندر»
  // (بدون effect؛ مثل بقیه فرم‌های ایمچ — sync با سرور بدون cascade)
  const [hydratedWith, setHydratedWith] = useState<unknown>(null);
  if (mine !== undefined && hydratedWith !== mine) {
    setHydratedWith(mine);
    if (mine) {
      setScore(mine.score);
      setNote(mine.note ?? '');
      setDone(true);
    }
  }

  const submit = useMutation({
    mutationFn: () =>
      apiFetch<MySurvey>('/survey/submit', {
        score: score as SurveyScore,
        ...(note.trim() ? { note: note.trim() } : {}),
      }),
    onSuccess: () => {
      setDone(true);
      queryClient.invalidateQueries({ queryKey: ['my-survey'] });
      toast({ description: 'نظر شما با موفقیت ثبت شد.' });
    },
    onError: (err) => {
      toast({ description: err instanceof Error ? err.message : 'ثبت نظر ناموفق بود.' });
    },
  });

  if (done) {
    return (
      <div className="mx-auto max-w-xl">
        <PanelCard className="text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={28} />
          </span>
          <h1 className="mt-4 text-base font-extrabold">نظر شما ثبت شد</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            از همراهی شما سپاسگزاریم؛ نظرات شما ایمچ را بهتر می‌کند.
            {mine?.score ? ' پاسخ شما هر زمان قابل ویرایش است.' : ''}
          </p>
          <Button variant="outline" className="mt-5 rounded-md" onClick={() => setDone(false)}>
            <Pencil size={14} /> ویرایش نظر
          </Button>
        </PanelCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-lg font-extrabold">نظرسنجی</h1>
        <p className="mt-1 text-sm text-muted-foreground">لطفاً نظر خود را درباره عملکرد ایمچ بیان کنید</p>
      </div>

      <PanelCard>
        <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
          <ScrollText size={14} />
          امتیاز شما
        </div>
        <div className="mt-3 grid grid-cols-5 gap-1.5 sm:gap-2">
          {OPTIONS.map(({ key, label, tone }) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={score === key}
              onClick={() => setScore(key)}
              className={cn(
                'rounded-md border px-1 py-2.5 text-xs font-bold transition-all sm:text-sm',
                score === key ? `${tone} shadow-sm` : 'border-border bg-card text-muted-foreground hover:border-foreground/30',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-2">
          <p className="text-sm font-bold">نظر شما</p>
          <Textarea
            dir="rtl"
            rows={5}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="resize-none text-sm leading-7"
            placeholder="چه چیز خوب بود؟ چه چیزی باید بهتر شود؟"
          />
        </div>

        <Button
          className="mt-4 w-full rounded-md sm:w-auto"
          disabled={!score || submit.isPending}
          onClick={() => submit.mutate()}
        >
          {submit.isPending && <Loader2 size={14} className="animate-spin" />}
          ثبت نظر
        </Button>
      </PanelCard>
    </div>
  );
}
