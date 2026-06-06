import { Card } from '../ui/Card';
import { areaIcons } from '../../constants/tickets';

export function AreaTile({ area, count }: { area: string; count: number }) {
  const Icon = areaIcons[area as keyof typeof areaIcons];

  return (
      <Card className="p-4 transition hover:-translate-y-0.5 hover:border-sky-200 dark:hover:border-sky-700">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-sky-50 p-2 text-ha-blue dark:bg-sky-950/60 dark:text-sky-300">
            {Icon && <Icon size={20} />}
          </div>

          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{area}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{count} offene Tickets</p>
          </div>
        </div>
      </Card>
  );
}