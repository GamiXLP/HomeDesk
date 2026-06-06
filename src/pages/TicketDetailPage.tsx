import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PriorityBadge, StatusBadge } from '../components/ui/Badge';
import { useAuth } from '../hooks/useAuth';
import {
  addComment,
  deleteTicketAdmin,
  getComments,
  getTicket,
  typed,
  updateTicketAdmin,
} from '../lib/tickets';
import { priorityLabels, priorityOptions, statusLabels, statusOptions } from '../constants/tickets';
import type { Ticket, TicketComment } from '../types/database';

export function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'internal'>('public');

  async function reload() {
    if (!id) return;

    setTicket(await getTicket(id));
    setComments(await getComments(id));
  }

  useEffect(() => {
    reload();
  }, [id]);

  async function adminPatch(key: 'status' | 'priority', value: string) {
    if (!ticket) return;

    const next = await updateTicketAdmin(ticket.id, {
      [key]: key === 'status' ? typed.status(value) : typed.priority(value),
    });

    setTicket(next);
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();

    if (!ticket || !user || body.trim().length === 0) return;

    await addComment(ticket.id, user.id, body.trim(), isAdmin ? visibility : 'public');

    setBody('');
    await reload();
  }

  async function deleteCurrentTicket() {
    if (!ticket) return;

    const confirmed = window.confirm(
        `Ticket wirklich löschen?\n\n"${ticket.title}"\n\nDiese Aktion kann nicht rückgängig gemacht werden.`,
    );

    if (!confirmed) return;

    await deleteTicketAdmin(ticket.id);
    navigate('/app/tickets', { state: { message: 'Ticket wurde gelöscht.' } });
  }

  if (!ticket) {
    return <Card className="p-6 text-slate-500 dark:text-slate-400">Lade Ticket …</Card>;
  }

  return (
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-950 dark:text-slate-100">{ticket.title}</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Erstellt am {format(new Date(ticket.created_at), 'dd.MM.yyyy HH:mm')}
                </p>
              </div>

              <div className="flex gap-2">
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
              </div>
            </div>

            <p className="mt-6 whitespace-pre-wrap text-slate-700 dark:text-slate-300">{ticket.description}</p>

            <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
              <Info label="Kategorie" value={ticket.category} />
              <Info label="Bereich" value={ticket.area} />
              <Info label="Typ" value={ticket.type} />
              <Info label="Gerät" value={ticket.device || '—'} />
              <Info label="Entity-ID" value={ticket.entity_id || '—'} />
              <Info label="Letzte Änderung" value={format(new Date(ticket.updated_at), 'dd.MM.yyyy HH:mm')} />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-lg font-bold text-slate-950 dark:text-slate-100">Kommentare</h3>

            <div className="space-y-4">
              {comments.map((comment) => (
                  <div
                      key={comment.id}
                      className="rounded-xl border border-ha-border bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70"
                  >
                    <div className="mb-2 flex justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    {comment.profiles?.display_name ?? 'Unbekannt'}{' '}
                    {comment.visibility === 'internal' && (
                        <b className="text-orange-600 dark:text-orange-300">Intern</b>
                    )}
                  </span>
                      <span>{format(new Date(comment.created_at), 'dd.MM.yyyy HH:mm')}</span>
                    </div>

                    <p className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200">{comment.body}</p>
                  </div>
              ))}
            </div>

            <form onSubmit={submitComment} className="mt-5 space-y-3">
            <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Antwort schreiben …"
                className="min-h-28 w-full rounded-xl border border-ha-border px-4 py-3 outline-none focus:border-ha-blue dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />

              {isAdmin && (
                  <select
                      value={visibility}
                      onChange={(event) => setVisibility(event.target.value as 'public' | 'internal')}
                      className="rounded-xl border border-ha-border bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="public">Öffentlich</option>
                    <option value="internal">Intern</option>
                  </select>
              )}

              <div>
                <Button>Kommentar hinzufügen</Button>
              </div>
            </form>
          </Card>
        </div>

        {isAdmin && (
            <Card className="h-fit p-6">
              <h3 className="mb-4 text-lg font-bold text-slate-950 dark:text-slate-100">Bearbeitung</h3>

              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Status</label>
              <select
                  value={ticket.status}
                  onChange={(event) => adminPatch('status', event.target.value)}
                  className="mb-4 mt-1 w-full rounded-xl border border-ha-border bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                ))}
              </select>

              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Priorität</label>
              <select
                  value={ticket.priority}
                  onChange={(event) => adminPatch('priority', event.target.value)}
                  className="mt-1 w-full rounded-xl border border-ha-border bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {priorityOptions.map((priority) => (
                    <option key={priority} value={priority}>
                      {priorityLabels[priority]}
                    </option>
                ))}
              </select>

              <p className="mt-4 rounded-xl bg-sky-50 p-3 text-sm text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                Wartet auf Teile: Bestellung oder neues Gerät nötig.
              </p>

              <button
                  type="button"
                  onClick={deleteCurrentTicket}
                  className="mt-6 w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-950"
              >
                Ticket löschen
              </button>
            </Card>
        )}
      </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
      <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="font-medium text-slate-900 dark:text-slate-100">{value}</p>
      </div>
  );
}