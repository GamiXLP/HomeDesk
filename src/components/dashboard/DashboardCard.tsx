import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { cn } from '../../utils/cn';

export function DashboardCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'slate',
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon?: LucideIcon;
  tone?: 'slate' | 'sky' | 'orange' | 'emerald' | 'red' | 'violet';
}) {
  const toneClass = {
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-950/70 dark:text-sky-300',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-950/70 dark:text-orange-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-300',
    red: 'bg-red-50 text-red-600 dark:bg-red-950/70 dark:text-red-300',
    violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/70 dark:text-violet-300',
  }[tone];

  return (
    <Card className="group p-5 hover:-translate-y-0.5 hover:shadow-lg dark:hover:border-slate-700">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p>
        </div>
        {Icon && (
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-2xl', toneClass)}>
            <Icon size={19} />
          </div>
        )}
      </div>
      {hint && (
        <p className="mt-3 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          {hint}
          <ArrowUpRight size={12} className="opacity-0 transition group-hover:opacity-100" />
        </p>
      )}
    </Card>
  );
}
