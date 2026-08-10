import { AlertTriangle, Inbox } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

export function LoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-label="Lädt" aria-busy="true">
      <div className="animate-pulse">
        <div className="h-3 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="mt-3 h-8 w-64 max-w-[75%] rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <Card key={index} className="animate-pulse p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="h-3 w-28 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="mt-3 h-4 w-2/5 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="mt-3 h-3 w-4/5 rounded-full bg-slate-100 dark:bg-slate-800" />
              <div className="mt-2 h-3 w-3/5 rounded-full bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="h-9 w-20 rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function EmptyState({ title = 'Hier ist gerade nichts offen.', text, action }: { title?: string; text?: string; action?: React.ReactNode }) {
  return (
    <Card className="p-8 text-center sm:p-10">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"><Inbox size={22} /></div>
      <h3 className="mt-4 font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      {text && <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500 dark:text-slate-400">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <Card className="border-red-200 p-6 dark:border-red-900">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/70 dark:text-red-300"><AlertTriangle size={20} /></div>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Etwas ist schiefgelaufen</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{message ?? 'Die Daten konnten nicht geladen werden.'}</p>
          {onRetry && <Button className="mt-4" variant="secondary" size="sm" onClick={onRetry}>Erneut versuchen</Button>}
        </div>
      </div>
    </Card>
  );
}
