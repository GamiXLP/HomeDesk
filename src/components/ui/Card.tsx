import { cn } from '../../utils/cn';

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
      <div
          className={cn(
              'rounded-card border border-ha-border bg-white shadow-card transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none',
              className,
          )}
      >
        {children}
      </div>
  );
}