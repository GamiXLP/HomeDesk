import { cn } from '../../utils/cn';

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-slate-950',
        size === 'sm' && 'min-h-9 px-3 py-1.5 text-xs',
        size === 'md' && 'min-h-10 px-4 py-2 text-sm',
        size === 'lg' && 'min-h-12 px-5 py-3 text-sm',
        size === 'icon' && 'h-10 w-10 p-0',
        variant === 'primary' &&
          'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-sm shadow-sky-500/20 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-sky-500/20 active:translate-y-0',
        variant === 'secondary' &&
          'border border-slate-200 bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800',
        variant === 'ghost' &&
          'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
        variant === 'danger' && 'bg-red-500 text-white hover:bg-red-600',
        className,
      )}
      {...props}
    />
  );
}
