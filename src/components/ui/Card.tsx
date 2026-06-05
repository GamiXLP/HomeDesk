import { cn } from '../../utils/cn';
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('rounded-card border border-ha-border bg-white shadow-card', className)}>{children}</div>;
}
