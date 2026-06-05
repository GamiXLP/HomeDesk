import { cn } from '../../utils/cn';
export function Button({ className, variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  return <button className={cn('inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-60', variant === 'primary' && 'bg-ha-blue text-white hover:bg-sky-500', variant === 'ghost' && 'bg-white text-slate-700 hover:bg-slate-100', variant === 'danger' && 'bg-red-500 text-white hover:bg-red-600', className)} {...props} />;
}
