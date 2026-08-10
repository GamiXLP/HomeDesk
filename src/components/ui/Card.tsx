import { cn } from '../../utils/cn';

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-white/70 bg-white/90 shadow-card backdrop-blur-sm transition duration-200 dark:border-slate-800/90 dark:bg-slate-900/90 dark:shadow-none',
        className,
      )}
    >
      {children}
    </div>
  );
}
