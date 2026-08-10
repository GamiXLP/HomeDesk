import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { areaIcons } from '../../constants/tickets';

export function AreaTile({ area, count }: { area: string; count: number }) {
  const Icon = areaIcons[area as keyof typeof areaIcons];

  return (
    <Link to={`/app/tickets?area=${encodeURIComponent(area)}&scope=open`}>
      <Card className="group h-full p-4 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-lg dark:hover:border-sky-800">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-50 to-cyan-50 text-sky-600 ring-1 ring-sky-100 dark:from-sky-950/60 dark:to-cyan-950/30 dark:text-sky-300 dark:ring-sky-900">
            {Icon && <Icon size={20} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{area}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {count === 0 ? 'Alles erledigt' : `${count} offen`}
            </p>
          </div>
          <ChevronRight size={17} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-sky-500" />
        </div>
      </Card>
    </Link>
  );
}
