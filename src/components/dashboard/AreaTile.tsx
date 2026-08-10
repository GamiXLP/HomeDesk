import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { areaIcons } from '../../constants/tickets';
import { Card } from '../ui/Card';

export function AreaTile({ area, count }: { area: string; count: number }) {
  const Icon = areaIcons[area as keyof typeof areaIcons];

  return (
    <Link to={`/app/tickets?area=${encodeURIComponent(area)}&scope=open`} className="min-w-0">
      <Card className="group h-full min-w-0 p-3 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-lg dark:hover:border-sky-800 sm:p-4">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50 to-cyan-50 text-sky-600 ring-1 ring-sky-100 dark:from-sky-950/60 dark:to-cyan-950/30 dark:text-sky-300 dark:ring-sky-900 sm:h-11 sm:w-11">
            {Icon && <Icon size={18} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-bold text-slate-900 dark:text-slate-100 sm:text-sm">{area}</p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">
              {count === 0 ? 'Alles erledigt' : `${count} offen`}
            </p>
          </div>
          <ChevronRight size={16} className="hidden shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-sky-500 sm:block" />
        </div>
      </Card>
    </Link>
  );
}
