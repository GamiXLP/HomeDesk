import type { TicketPriority, TicketStatus } from '../../types/database';
import { priorityLabels, statusLabels } from '../../constants/tickets';
import { cn } from '../../utils/cn';

const statusClass: Record<TicketStatus, string> = {
  new: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/70 dark:text-sky-300 dark:ring-sky-800',
  seen: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  planned: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/70 dark:text-violet-300 dark:ring-violet-800',
  in_progress: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/70 dark:text-orange-300 dark:ring-orange-800',
  waiting_feedback: 'bg-yellow-50 text-yellow-800 ring-yellow-200 dark:bg-yellow-950/70 dark:text-yellow-300 dark:ring-yellow-800',
  waiting_parts: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:ring-amber-800',
  tested: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:ring-emerald-800',
  done: 'bg-green-50 text-green-700 ring-green-200 dark:bg-green-950/70 dark:text-green-300 dark:ring-green-800',
  rejected: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/70 dark:text-red-300 dark:ring-red-800',
  archived: 'bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700',
};

const priorityClass: Record<TicketPriority, string> = {
  low: 'bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
  normal: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:ring-blue-800',
  high: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/70 dark:text-orange-300 dark:ring-orange-800',
  urgent: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/70 dark:text-red-300 dark:ring-red-800',
};

const baseClass = 'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset';

export function StatusBadge({ status }: { status: TicketStatus }) {
  return <span className={cn(baseClass, statusClass[status])}>{statusLabels[status]}</span>;
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return <span className={cn(baseClass, priorityClass[priority])}>{priorityLabels[priority]}</span>;
}
