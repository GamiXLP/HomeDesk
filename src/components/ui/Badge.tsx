import type { TicketPriority, TicketStatus } from '../../types/database';
import { priorityLabels, statusLabels } from '../../constants/tickets';
import { cn } from '../../utils/cn';

const statusClass: Record<TicketStatus, string> = {
  new: 'bg-sky-50 text-sky-700 border-sky-200', seen: 'bg-slate-50 text-slate-700 border-slate-200', planned: 'bg-violet-50 text-violet-700 border-violet-200', in_progress: 'bg-orange-50 text-orange-700 border-orange-200', waiting_feedback: 'bg-yellow-50 text-yellow-800 border-yellow-200', waiting_parts: 'bg-amber-50 text-amber-800 border-amber-200', tested: 'bg-emerald-50 text-emerald-700 border-emerald-200', done: 'bg-green-50 text-green-700 border-green-200', rejected: 'bg-red-50 text-red-700 border-red-200', archived: 'bg-slate-100 text-slate-500 border-slate-200',
};
const priorityClass: Record<TicketPriority, string> = {
  low: 'bg-slate-50 text-slate-600 border-slate-200', normal: 'bg-blue-50 text-blue-700 border-blue-200', high: 'bg-orange-50 text-orange-700 border-orange-200', urgent: 'bg-red-50 text-red-700 border-red-200',
};
export function StatusBadge({ status }: { status: TicketStatus }) { return <span className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', statusClass[status])}>{statusLabels[status]}</span>; }
export function PriorityBadge({ priority }: { priority: TicketPriority }) { return <span className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', priorityClass[priority])}>{priorityLabels[priority]}</span>; }
