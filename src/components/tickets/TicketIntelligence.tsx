import { Bell, BellOff, BrainCircuit, CheckCircle2, Circle, GitBranch, Lightbulb, Plus, Save, Timer, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { RecurrenceFrequency, Ticket, TicketRelationType, TicketSubtask } from '../../types/database';
import { addSubtask, addTicketRelation, disableTicketRecurrence, getTicketIntelligence, removeSubtask, removeTicketRelation, saveTicketRecurrence, setSubtaskCompleted, setWatching, updateTicketAdmin } from '../../lib/tickets';
import { ticketPath, ticketReference } from '../../utils/tickets';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useToast } from '../ui/Toast';

export function TicketIntelligence({ ticket, tickets, userId, isAdmin, onTicketChange }: {
  ticket: Ticket; tickets: Ticket[]; userId: string; isAdmin: boolean; onTicketChange: (ticket: Ticket) => void;
}) {
  const { showToast } = useToast();
  const [data, setData] = useState<Awaited<ReturnType<typeof getTicketIntelligence>> | null>(null);
  const [newSubtask, setNewSubtask] = useState('');
  const [relatedId, setRelatedId] = useState('');
  const [relationType, setRelationType] = useState<TicketRelationType>('relates_to');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [nextRun, setNextRun] = useState('');
  const [resolution, setResolution] = useState({ solution_summary: ticket.solution_summary ?? '', root_cause: ticket.root_cause ?? '', resolution_steps: ticket.resolution_steps ?? '' });
  const [busy, setBusy] = useState(false);

  async function reload() {
    try { setData(await getTicketIntelligence(ticket.id, userId)); }
    catch (error) { console.warn('Ticket intelligence unavailable:', error); }
  }
  useEffect(() => { void reload(); }, [ticket.id, userId]);

  async function run(action: () => Promise<void>, message: string) {
    try { setBusy(true); await action(); await reload(); showToast(message); }
    catch (error) { showToast('Aktion fehlgeschlagen', { message: error instanceof Error ? error.message : undefined, tone: 'error' }); }
    finally { setBusy(false); }
  }

  const completed = data?.subtasks.filter((item) => item.completed).length ?? 0;
  const total = data?.subtasks.length ?? 0;
  const similar = findSimilarTickets(ticket, tickets).slice(0, 3);
  const dueState = ticket.due_at ? getDueState(ticket.due_at) : null;
  return <div className="space-y-4">
    <Card className="overflow-hidden border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-4 dark:border-indigo-900/60 dark:from-indigo-950/40 dark:via-slate-900 dark:to-cyan-950/30 sm:p-6">
      <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg"><BrainCircuit size={21} /></span><div><p className="text-xs font-black uppercase tracking-[.16em] text-indigo-500 dark:text-indigo-300">Intelligence Briefing</p><h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Kontext & nächste Aktion</h3></div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-white/80 bg-white/70 p-4 dark:border-white/5 dark:bg-white/5"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-slate-400"><Timer size={14} />Zeitlage</p><p className={`mt-2 text-sm font-black ${dueState?.urgent ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>{dueState?.label ?? 'Keine Fälligkeit gesetzt'}</p><p className="mt-1 text-xs leading-5 text-slate-500">{intelligenceHint(ticket, completed, total)}</p></div><div className="rounded-2xl border border-white/80 bg-white/70 p-4 dark:border-white/5 dark:bg-white/5"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-slate-400"><Lightbulb size={14} />Ähnliche Fälle</p>{similar.length ? <div className="mt-2 space-y-1.5">{similar.map((item) => <a key={item.id} href={ticketPath(item)} className="block truncate text-xs font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-300">{ticketReference(item)} · {item.title}</a>)}</div> : <p className="mt-2 text-xs text-slate-500">Kein ähnlicher Fall im aktuellen Bestand.</p>}</div></div>
    </Card>
    <Card className="p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[.14em] text-indigo-500">Ticket Intelligence</p><h3 className="mt-1 font-black text-slate-950 dark:text-white">Plan & Abhängigkeiten</h3></div>
        <button type="button" onClick={() => data && void run(() => setWatching(ticket.id, userId, !data.watching), data.watching ? 'Beobachtung beendet' : 'Ticket wird beobachtet')} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
          {data?.watching ? <Bell size={16} className="text-sky-500" /> : <BellOff size={16} />} {data?.watching ? 'Beobachtet' : 'Beobachten'}
        </button>
      </div>
      <div className="mt-5">
        <div className="flex justify-between text-xs font-bold text-slate-500"><span>Unteraufgaben</span><span>{completed}/{total}</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${total ? completed / total * 100 : 0}%` }} /></div>
        <div className="mt-3 space-y-2">{data?.subtasks.map((subtask) => <SubtaskRow key={subtask.id} item={subtask} disabled={busy || !isAdmin} onToggle={() => void run(async () => { await setSubtaskCompleted(subtask.id, !subtask.completed); }, 'Unteraufgabe aktualisiert')} onDelete={() => void run(() => removeSubtask(subtask.id), 'Unteraufgabe entfernt')} />)}</div>
        {isAdmin && <form className="mt-3 flex gap-2" onSubmit={(event) => { event.preventDefault(); if (!newSubtask.trim()) return; void run(async () => { await addSubtask(ticket.id, newSubtask, userId, total); setNewSubtask(''); }, 'Unteraufgabe angelegt'); }}><input className="field-input" value={newSubtask} onChange={(event) => setNewSubtask(event.target.value)} placeholder="Neue Unteraufgabe …" /><Button size="icon" disabled={busy}><Plus size={16} /></Button></form>}
      </div>
      <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
        <p className="flex items-center gap-2 text-xs font-bold text-slate-500"><GitBranch size={15} />Ticketbeziehungen</p>
        <div className="mt-3 space-y-2">{data?.relations.map((relation) => <div key={relation.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs dark:bg-slate-800/60"><a className="min-w-0 flex-1 truncate font-bold hover:text-sky-500" href={relation.related_ticket ? ticketPath(relation.related_ticket) : '#'}>{relationLabel[relation.relation_type]} · {relation.related_ticket ? `${ticketReference(relation.related_ticket)} ${relation.related_ticket.title}` : 'Ticket'}</a>{isAdmin && <button onClick={() => void run(() => removeTicketRelation(relation.id), 'Beziehung entfernt')}><Trash2 size={14} /></button>}</div>)}</div>
        {isAdmin && <form className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px_auto]" onSubmit={(event) => { event.preventDefault(); if (!relatedId) return; void run(async () => { await addTicketRelation(ticket.id, relatedId, relationType, userId); setRelatedId(''); }, 'Tickets verknüpft'); }}><select className="field-input" value={relatedId} onChange={(event) => setRelatedId(event.target.value)}><option value="">Ticket auswählen …</option>{tickets.filter((item) => item.id !== ticket.id).map((item) => <option key={item.id} value={item.id}>{ticketReference(item)} · {item.title}</option>)}</select><select className="field-input" value={relationType} onChange={(event) => setRelationType(event.target.value as TicketRelationType)}>{Object.entries(relationLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><Button size="icon" disabled={busy}><Plus size={16} /></Button></form>}
      </div>
      {isAdmin && <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800"><div className="flex items-center justify-between"><p className="text-xs font-bold text-slate-500">Wiederkehrendes Ticket</p>{data?.recurrence?.active && <button className="text-xs font-bold text-red-500" onClick={() => void run(() => disableTicketRecurrence(ticket.id), 'Wiederholung pausiert')}>Pausieren</button>}</div>{data?.recurrence?.active && <p className="mt-2 text-xs text-emerald-600">Alle {data.recurrence.interval_count} · {frequencyLabel[data.recurrence.frequency]}, nächste Erstellung {new Date(data.recurrence.next_run_at).toLocaleString('de-DE')}</p>}<form className="mt-3 grid gap-2 sm:grid-cols-[140px_1fr_auto]" onSubmit={(event) => { event.preventDefault(); if (!nextRun) return; void run(() => saveTicketRecurrence(ticket.id, frequency, 1, new Date(nextRun).toISOString()).then(() => undefined), 'Wiederholung gespeichert'); }}><select className="field-input" value={frequency} onChange={(event) => setFrequency(event.target.value as RecurrenceFrequency)}>{Object.entries(frequencyLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input required type="datetime-local" className="field-input" value={nextRun} onChange={(event) => setNextRun(event.target.value)} /><Button size="sm">Planen</Button></form></div>}
    </Card>

    {isAdmin && <Card className="p-4 sm:p-6"><p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-500">Wissensbasis</p><h3 className="mt-1 font-black text-slate-950 dark:text-white">Lösungsdokumentation</h3><div className="mt-4 space-y-3"><TextField label="Kurzlösung" value={resolution.solution_summary} onChange={(value) => setResolution((current) => ({ ...current, solution_summary: value }))} /><TextField label="Ursache" value={resolution.root_cause} onChange={(value) => setResolution((current) => ({ ...current, root_cause: value }))} /><TextField label="Lösungsschritte" value={resolution.resolution_steps} onChange={(value) => setResolution((current) => ({ ...current, resolution_steps: value }))} rows={4} /><div className="flex justify-end"><Button disabled={busy} onClick={() => void run(async () => { const next = await updateTicketAdmin(ticket.id, resolution, ticket); onTicketChange(next); }, 'Lösung dokumentiert')}><Save size={16} />Speichern</Button></div></div></Card>}
  </div>;
}

const relationLabel: Record<TicketRelationType, string> = { relates_to: 'Bezieht sich auf', blocks: 'Blockiert', duplicates: 'Duplikat von', caused_by: 'Verursacht durch' };
const frequencyLabel: Record<RecurrenceFrequency, string> = { daily: 'Täglich', weekly: 'Wöchentlich', monthly: 'Monatlich', yearly: 'Jährlich' };
function findSimilarTickets(ticket: Ticket, tickets: Ticket[]) { const words = new Set(`${ticket.title} ${ticket.category} ${ticket.area} ${ticket.device ?? ''}`.toLowerCase().split(/[^a-zäöüß0-9]+/).filter((word) => word.length > 3)); return tickets.filter((item) => item.id !== ticket.id).map((item) => ({ item, score: `${item.title} ${item.category} ${item.area} ${item.device ?? ''}`.toLowerCase().split(/[^a-zäöüß0-9]+/).filter((word) => words.has(word)).length })).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).map(({ item }) => item); }
function getDueState(value: string) { const diff = new Date(value).getTime() - Date.now(); const hours = Math.round(Math.abs(diff) / 3600000); if (diff < 0) return { urgent: true, label: `${hours < 48 ? `${hours} Stunden` : `${Math.round(hours / 24)} Tage`} überfällig` }; if (hours < 24) return { urgent: true, label: `In ${hours} Stunden fällig` }; return { urgent: false, label: `Noch ${Math.round(hours / 24)} Tage bis zur Fälligkeit` }; }
function intelligenceHint(ticket: Ticket, completed: number, total: number) { if (ticket.escalation_level) return `Eskalationsstufe ${ticket.escalation_level}: Bearbeitung und Rückmeldung priorisieren.`; if (total && completed < total) return `${total - completed} Unteraufgaben sind noch offen.`; if (ticket.status === 'waiting_feedback') return 'Eine Rückmeldung ist der nächste Engpass.'; if (ticket.status === 'done' && !ticket.solution_summary) return 'Lösung dokumentieren, damit der Fall wiederverwendbar wird.'; return 'Ticket ist im erwarteten Ablauf. Nächsten Status aktiv pflegen.'; }
function SubtaskRow({ item, disabled, onToggle, onDelete }: { item: TicketSubtask; disabled: boolean; onToggle: () => void; onDelete: () => void }) { return <div className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-800"><button disabled={disabled} onClick={onToggle}>{item.completed ? <CheckCircle2 size={17} className="text-emerald-500" /> : <Circle size={17} className="text-slate-300" />}</button><span className={`min-w-0 flex-1 text-sm ${item.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{item.title}</span>{!disabled && <button onClick={onDelete} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>}</div>; }
function TextField({ label, value, onChange, rows = 2 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) { return <label className="block"><span className="field-label">{label}</span><textarea className="field-input mt-1 resize-y" rows={rows} value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
