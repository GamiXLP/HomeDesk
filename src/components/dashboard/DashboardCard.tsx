import { Card } from '../ui/Card';

export function DashboardCard({
                                label,
                                value,
                                hint,
                              }: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
      <Card className="p-5">
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
        {hint && <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
      </Card>
  );
}