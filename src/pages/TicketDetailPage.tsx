import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  Copy,
  Cpu,
  ExternalLink,
  History,
  ImagePlus,
  MapPin,
  MessageSquare,
  RefreshCw,
  Send,
  Tag,
  Trash2,
  UserRound,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PriorityBadge, StatusBadge } from '../components/ui/Badge';
import { ErrorState, LoadingState } from '../components/ui/States';
import { useAuth } from '../hooks/useAuth';
import { useTickets } from '../hooks/useTickets';
import { useToast } from '../components/ui/Toast';
import {
  addComment,
  COMMENT_IMAGE_MAX_COUNT,
  COMMENT_IMAGE_MAX_SIZE_BYTES,
  COMMENT_IMAGE_MIME_TYPES,
  deleteTicketAdmin,
  downloadTicketAttachment,
  getComments,
  getProfiles,
  getTicket,
  getTicketEvents,
  typed,
  updateTicketAdmin,
} from '../lib/tickets';
import { supabase } from '../lib/supabase';
import {
  imagePickerErrorMessage,
  pickNativeCommentImages,
} from '../lib/mobileImages';
import {
  areas,
  categories,
  priorityLabels,
  priorityOptions,
  statusLabels,
  statusOptions,
} from '../constants/tickets';
import type { Profile, Ticket, TicketAttachment, TicketComment, TicketEvent } from '../types/database';
import { relativeTime, ticketPath, ticketReference } from '../utils/tickets';

export function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { markRead, replaceTicket } = useTickets();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [events, setEvents] = useState<TicketEvent[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'internal'>('public');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [adminSaving, setAdminSaving] = useState(false);
  const [copied, setCopied] = useState<'link' | 'ref' | null>(null);

  const reload = useCallback(async (showLoader = false) => {
    if (!id) return;
    try {
      if (showLoader) setLoading(true);
      setError(null);
      const nextTicket = await getTicket(id);
      const [nextComments, nextEvents] = await Promise.all([
        getComments(nextTicket.id),
        getTicketEvents(nextTicket.id),
      ]);
      setTicket(nextTicket);
      replaceTicket(nextTicket);
      if (user) void markRead(nextTicket.id);
      setComments(nextComments);
      setEvents(nextEvents);

      const canonicalPath = ticketPath(nextTicket);
      if (window.location.pathname !== canonicalPath) {
        navigate(canonicalPath, { replace: true });
      }
    } catch (nextError) {
      console.error(nextError);
      setError(nextError instanceof Error ? nextError.message : 'Ticket konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, replaceTicket, user?.id, markRead]);

  useEffect(() => {
    void reload(true);
  }, [reload]);

  useEffect(() => {
    if (!isAdmin) return;
    void getProfiles().then(setProfiles).catch((nextError) => console.warn('Profiles could not be loaded:', nextError));
  }, [isAdmin]);

  useEffect(() => {
    if (!ticket?.id) return;
    const ticketId = ticket.id;
    let refreshTimer = 0;
    const requestRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => void reload(false), 180);
    };

    const channel = supabase
      .channel(`homedesk-ticket-${ticketId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `id=eq.${ticketId}` }, requestRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_comments', filter: `ticket_id=eq.${ticketId}` }, requestRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_attachments', filter: `ticket_id=eq.${ticketId}` }, requestRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_events', filter: `ticket_id=eq.${ticketId}` }, requestRefresh)
      .subscribe();

    return () => {
      window.clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [ticket?.id, reload]);

  async function adminPatch(
    patch: Partial<Pick<Ticket, 'status' | 'priority' | 'category' | 'area' | 'assigned_to'>>,
  ) {
    if (!ticket || adminSaving) return;
    try {
      setAdminSaving(true);
      const next = await updateTicketAdmin(ticket.id, patch, ticket);
      setTicket(next);
      replaceTicket(next);
      showToast('Ticket aktualisiert', { message: 'Die Änderung wurde gespeichert.' });
      void getTicketEvents(ticket.id).then(setEvents);
    } catch (nextError) {
      showToast('Änderung fehlgeschlagen', { message: nextError instanceof Error ? nextError.message : 'Änderung konnte nicht gespeichert werden.', tone: 'error' });
    } finally {
      setAdminSaving(false);
    }
  }

  function appendSelectedImages(files: File[]) {
  if (files.length === 0) {
    return;
  }

  const nextFiles = [
    ...selectedFiles,
    ...files,
  ];

  if (
    nextFiles.length >
    COMMENT_IMAGE_MAX_COUNT
  ) {
    setCommentError(
      `Maximal ${COMMENT_IMAGE_MAX_COUNT} Bilder pro Kommentar erlaubt.`,
    );

    return;
  }

  for (const file of files) {
    if (
      !COMMENT_IMAGE_MIME_TYPES.includes(
        file.type,
      )
    ) {
      setCommentError(
        `"${file.name}" ist kein erlaubtes Bildformat. Erlaubt sind JPG, PNG und WEBP.`,
      );

      return;
    }

    if (
      file.size >
      COMMENT_IMAGE_MAX_SIZE_BYTES
    ) {
      setCommentError(
        `"${file.name}" ist zu groß. Maximal erlaubt sind 5 MB pro Bild.`,
      );

      return;
    }
  }

  setCommentError(null);
  setSelectedFiles(nextFiles);
}

function handleFileSelection(
  event: React.ChangeEvent<HTMLInputElement>,
) {
  const files =
    Array.from(
      event.target.files ?? [],
    );

  appendSelectedImages(files);

  event.target.value = '';
}

async function openImagePicker() {
  if (
    selectedFiles.length >=
    COMMENT_IMAGE_MAX_COUNT
  ) {
    return;
  }

  const remaining =
    COMMENT_IMAGE_MAX_COUNT -
    selectedFiles.length;

  try {
    setCommentError(null);

    const nativeFiles =
      await pickNativeCommentImages(
        remaining,
        COMMENT_IMAGE_MAX_SIZE_BYTES,
      );

    // null = normale Webversion.
    if (nativeFiles === null) {
      fileInputRef.current?.click();
      return;
    }

    appendSelectedImages(
      nativeFiles,
    );
  } catch (error) {
    console.error(
      'Image picker failed:',
      error,
    );

    setCommentError(
      imagePickerErrorMessage(error),
    );
  }
}

async function submitComment(event: React.FormEvent) {
    event.preventDefault();
    if (!ticket || !user || isSubmittingComment) return;

    const trimmedBody = body.trim();
    if (!trimmedBody && selectedFiles.length === 0) {
      setCommentError('Bitte schreibe einen Kommentar oder hänge mindestens ein Bild an.');
      return;
    }

    try {
      setIsSubmittingComment(true);
      setCommentError(null);
      await addComment(ticket.id, user.id, trimmedBody, isAdmin ? visibility : 'public', selectedFiles);
      setBody('');
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await reload(false);
      showToast('Kommentar gesendet');
    } catch (nextError) {
      console.error(nextError);
      setCommentError(nextError instanceof Error ? nextError.message : 'Kommentar konnte nicht gespeichert werden.');
    } finally {
      setIsSubmittingComment(false);
    }
  }

  async function copyValue(kind: 'link' | 'ref') {
    if (!ticket) return;
    const value = kind === 'link' ? window.location.href : ticketReference(ticket);
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1400);
  }

  async function deleteCurrentTicket() {
    if (!ticket) return;
    const confirmed = window.confirm(`Ticket wirklich löschen?\n\n"${ticket.title}"\n\nDiese Aktion kann nicht rückgängig gemacht werden.`);
    if (!confirmed) return;
    try {
      await deleteTicketAdmin(ticket.id);
      showToast('Ticket gelöscht', { message: ticketReference(ticket) });
      navigate('/app/tickets', { state: { message: 'Ticket wurde gelöscht.' } });
    } catch (nextError) {
      showToast('Ticket konnte nicht gelöscht werden', { message: nextError instanceof Error ? nextError.message : undefined, tone: 'error' });
    }
  }

  if (loading && !ticket) return <LoadingState rows={4} />;
  if (error && !ticket) return <ErrorState message={error} onRetry={() => void reload(true)} />;
  if (!ticket) return <ErrorState message="Ticket wurde nicht gefunden." />;

  const assignedProfile = profiles.find((profile) => profile.id === ticket.assigned_to);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/app/tickets" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white">
          <ArrowLeft size={16} /> Alle Tickets
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => void copyValue('ref')}>
            {copied === 'ref' ? <Check size={14} /> : <Copy size={14} />} {ticketReference(ticket)}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void copyValue('link')}>
            {copied === 'link' ? <Check size={14} /> : <ExternalLink size={14} />} Link
          </Button>
          <Button variant="ghost" size="icon" onClick={() => void reload(false)} title="Aktualisieren">
            <RefreshCw size={17} />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <main className="space-y-6">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 p-4 sm:p-8 dark:border-slate-800">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                    <span>{ticketReference(ticket)}</span>
                    <span>•</span>
                    <span>{ticket.type}</span>
                    <span>•</span>
                    <span>{relativeTime(ticket.updated_at)} aktualisiert</span>
                  </div>
                  <h2 className="mt-2 break-words text-xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">{ticket.title}</h2>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2"><StatusBadge status={ticket.status} /><PriorityBadge priority={ticket.priority} /></div>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300 sm:mt-6 sm:text-[15px] sm:leading-7">{ticket.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-px bg-slate-100 lg:grid-cols-3 dark:bg-slate-800">
              <Info icon={Tag} label="Kategorie" value={ticket.category} />
              <Info icon={MapPin} label="Bereich" value={ticket.area} />
              <Info icon={Cpu} label="Gerät" value={ticket.device || 'Nicht angegeben'} />
              <Info icon={Cpu} label="Entity-ID" value={ticket.entity_id || 'Nicht angegeben'} mono />
              <Info icon={CalendarDays} label="Wunschdatum" value={ticket.desired_date ? formatDate(ticket.desired_date) : 'Kein Wunschdatum'} />
              <Info icon={Clock3} label="Erstellt" value={formatDateTime(ticket.created_at)} />
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300"><MessageSquare size={19} /></div>
                <div><h3 className="font-black text-slate-950 dark:text-white">Kommunikation</h3><p className="text-xs text-slate-500">{comments.length} Kommentar{comments.length === 1 ? '' : 'e'}</p></div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {comments.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400 dark:border-slate-700">Noch keine Kommentare. Starte die Unterhaltung unten.</div>}
              {comments.map((comment) => <Comment key={comment.id} comment={comment} />)}
            </div>

            <form onSubmit={submitComment} className="mt-5 rounded-[24px] bg-slate-50 p-3.5 dark:bg-slate-950/50 sm:mt-6 sm:rounded-3xl sm:p-5">
              <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Antwort schreiben …" className="min-h-24 w-full resize-y border-0 bg-transparent p-0 text-sm leading-6 outline-none focus:ring-0 dark:bg-transparent sm:min-h-28" />

              {selectedFiles.length > 0 && (
<div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
{selectedFiles.map((file, index) => (
<LocalImagePreview
  key={`${file.name}-${file.lastModified}-${index}`}
  file={file}
  onRemove={() =>
    setSelectedFiles((files) =>
      files.filter(
        (_, fileIndex) =>
          fileIndex !== index,
      ),
    )
  }
/>
))}
</div>
)}

{commentError && <p className="mt-3 rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/60 dark:text-red-300">{commentError}</p>}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <input ref={fileInputRef} type="file" accept={COMMENT_IMAGE_MIME_TYPES.join(',')} multiple onChange={handleFileSelection} className="hidden" />
                  <Button type="button" variant="secondary" size="sm" onClick={() => void openImagePicker()} disabled={selectedFiles.length >= COMMENT_IMAGE_MAX_COUNT}>
                    <ImagePlus size={15} /> Bild
                  </Button>
                  {isAdmin && (
                    <select value={visibility} onChange={(event) => setVisibility(event.target.value as 'public' | 'internal')} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-900">
                      <option value="public">Öffentlich</option>
                      <option value="internal">Intern</option>
                    </select>
                  )}
                  <span className="hidden text-[11px] text-slate-400 sm:inline">max. {COMMENT_IMAGE_MAX_COUNT} Bilder · je 5 MB</span>
                </div>
                <Button size="sm" className="min-w-24" disabled={isSubmittingComment}>
                  <Send size={15} /> {isSubmittingComment ? 'Sendet …' : 'Senden'}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="p-4 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300"><History size={19} /></div>
              <div><h3 className="font-black text-slate-950 dark:text-white">Aktivitätsverlauf</h3><p className="text-xs text-slate-500">Automatisch aus Ticket-Events</p></div>
            </div>
            <div className="mt-6 space-y-1">
              {events.length === 0 ? <p className="text-sm text-slate-400">Noch keine Historie vorhanden.</p> : events.map((event, index) => <EventRow key={event.id} event={event} last={index === events.length - 1} />)}
            </div>
          </Card>
        </main>

        {isAdmin ? (
          <aside className="space-y-4 xl:sticky xl:top-28 xl:h-fit">
            <Card className="p-5">
              <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-500">Bearbeitung</p><h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Ticket steuern</h3></div>{adminSaving && <RefreshCw size={16} className="animate-spin text-sky-500" />}</div>

              <div className="mt-5 space-y-4">
                <AdminSelect label="Status" value={ticket.status} disabled={adminSaving} onChange={(value) => void adminPatch({ status: typed.status(value) })}>
                  {statusOptions.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                </AdminSelect>
                <AdminSelect label="Priorität" value={ticket.priority} disabled={adminSaving} onChange={(value) => void adminPatch({ priority: typed.priority(value) })}>
                  {priorityOptions.map((priority) => <option key={priority} value={priority}>{priorityLabels[priority]}</option>)}
                </AdminSelect>
                <AdminSelect label="Bereich" value={ticket.area} disabled={adminSaving} onChange={(value) => void adminPatch({ area: value })}>
                  {areas.map((area) => <option key={area}>{area}</option>)}
                </AdminSelect>
                <AdminSelect label="Kategorie" value={ticket.category} disabled={adminSaving} onChange={(value) => void adminPatch({ category: value })}>
                  {categories.map((category) => <option key={category}>{category}</option>)}
                </AdminSelect>
                <AdminSelect label="Zugewiesen an" value={ticket.assigned_to ?? ''} disabled={adminSaving} onChange={(value) => void adminPatch({ assigned_to: value || null })}>
                  <option value="">Nicht zugewiesen</option>
                  {profiles.filter((profile) => profile.role === 'admin').map((profile) => <option key={profile.id} value={profile.id}>{profile.display_name}</option>)}
                </AdminSelect>
              </div>

              {assignedProfile && <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/70"><UserRound size={17} className="text-slate-400" /><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Bearbeiter</p><p className="text-sm font-bold text-slate-900 dark:text-white">{assignedProfile.display_name}</p></div></div>}
            </Card>

            <Card className="p-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Lebenszyklus</p>
              <div className="mt-4 space-y-3 text-xs text-slate-500 dark:text-slate-400">
                <SideInfo label="Erstellt" value={formatDateTime(ticket.created_at)} />
                <SideInfo label="Letzte Änderung" value={formatDateTime(ticket.updated_at)} />
                <SideInfo label="Geschlossen" value={ticket.closed_at ? formatDateTime(ticket.closed_at) : '—'} />
              </div>
              <button type="button" onClick={() => void deleteCurrentTicket()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-950">
                <Trash2 size={16} /> Ticket löschen
              </button>
            </Card>
          </aside>
        ) : (
          <aside className="xl:sticky xl:top-28 xl:h-fit">
            <Card className="p-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Aktueller Stand</p>
              <div className="mt-3 flex flex-wrap gap-2"><StatusBadge status={ticket.status} /><PriorityBadge priority={ticket.priority} /></div>
              <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">Änderungen am Status erscheinen hier automatisch. Für Rückfragen kannst du direkt einen öffentlichen Kommentar schreiben.</p>
            </Card>
          </aside>
        )}
      </div>
    </div>
  );
}

function LocalImagePreview({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const [src, setSrc] =
    useState<string | null>(null);

  const [previewFailed, setPreviewFailed] =
    useState(false);

  useEffect(() => {
    let active = true;

    const reader =
      new FileReader();

    reader.onload = () => {
      if (
        active &&
        typeof reader.result === 'string'
      ) {
        setSrc(reader.result);
        setPreviewFailed(false);
      }
    };

    reader.onerror = () => {
      if (!active) {
        return;
      }

      setSrc(null);
      setPreviewFailed(true);
    };

    reader.onabort = () => {
      if (!active) {
        return;
      }

      setSrc(null);
      setPreviewFailed(true);
    };

    try {
      reader.readAsDataURL(file);
    } catch {
      setPreviewFailed(true);
    }

    return () => {
      active = false;

      if (
        reader.readyState ===
        FileReader.LOADING
      ) {
        reader.abort();
      }
    };
  }, [file]);

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-slate-200 dark:bg-slate-800">
      {src && !previewFailed ? (
        <img
          src={src}
          alt={file.name}
          className="h-28 w-full object-cover"
        />
      ) : (
        <div className="flex h-28 flex-col items-center justify-center px-3 text-center">
          <ImagePlus
            size={22}
            className="text-slate-400"
          />

          <p className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {previewFailed
              ? 'Vorschau nicht möglich'
              : 'Bild wird geladen …'}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={onRemove}
        aria-label={`${file.name} entfernen`}
        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/70 text-white opacity-90 transition hover:bg-red-500"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function Comment({ comment }: { comment: TicketComment }) {
  return (
    <div className={`rounded-3xl border p-4 sm:p-5 ${comment.visibility === 'internal' ? 'border-orange-200 bg-orange-50/60 dark:border-orange-900 dark:bg-orange-950/20' : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">{(comment.profiles?.display_name ?? '?').slice(0, 1).toUpperCase()}</div><div><p className="text-sm font-bold text-slate-900 dark:text-white">{comment.profiles?.display_name ?? 'Unbekannt'} {comment.visibility === 'internal' && <span className="ml-1 rounded-full bg-orange-100 px-2 py-0.5 text-[9px] font-black uppercase text-orange-700 dark:bg-orange-950 dark:text-orange-300">Intern</span>}</p><p className="text-[11px] text-slate-400">{formatDateTime(comment.created_at)} · {relativeTime(comment.created_at)}</p></div></div>
      </div>
      {comment.body.trim() && <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">{comment.body}</p>}
      {comment.attachments && comment.attachments.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{comment.attachments.map((attachment) => <CommentAttachmentPreview key={attachment.id} attachment={attachment} />)}</div>}
    </div>
  );
}

function CommentAttachmentPreview({
  attachment,
}: {
  attachment: TicketAttachment;
}) {
  const [imageUrl, setImageUrl] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [viewerOpen, setViewerOpen] =
    useState(false);

  useEffect(() => {
    let disposed = false;
    let objectUrl: string | null = null;

    setLoading(true);
    setLoadError(null);

    void downloadTicketAttachment(
      attachment.file_path,
    )
      .then((blob: Blob) => {
        if (disposed) {
          return;
        }

        objectUrl =
          URL.createObjectURL(blob);

        setImageUrl(objectUrl);
      })
      .catch((error: unknown) => {
        if (disposed) {
          return;
        }

        console.error(
          'Attachment could not be loaded:',
          error,
        );

        setLoadError(
          error instanceof Error
            ? error.message
            : 'Bild konnte nicht geladen werden.',
        );
      })
      .finally(() => {
        if (!disposed) {
          setLoading(false);
        }
      });

    return () => {
      disposed = true;

      if (objectUrl) {
        URL.revokeObjectURL(
          objectUrl,
        );
      }
    };
  }, [attachment.file_path]);

  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
        <div className="h-40 animate-pulse bg-slate-200 dark:bg-slate-700" />

        <div className="p-3">
          <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    );
  }

  if (
    loadError ||
    !imageUrl
  ) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-300">
          <ImagePlus size={18} />

          <p className="text-xs font-bold">
            Bild konnte nicht geladen werden
          </p>
        </div>

        <p className="mt-2 break-words text-xs text-slate-600 dark:text-slate-300">
          {attachment.file_name}
        </p>

        {loadError && (
          <p className="mt-1 text-[10px] text-red-500">
            {loadError}
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setViewerOpen(true)
        }
        className="group block w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-left transition active:scale-[0.99] dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="relative overflow-hidden bg-slate-100 dark:bg-slate-900">
          <img
            src={imageUrl}
            alt={attachment.file_name}
            className="h-44 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            loading="lazy"
            decoding="async"
          />

          <div className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/70 text-white shadow-lg backdrop-blur">
            <ZoomIn size={17} />
          </div>
        </div>

        <div className="p-3">
          <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">
            {attachment.file_name}
          </p>

          <p className="mt-0.5 text-[10px] text-slate-400">
            {formatFileSize(
              attachment.file_size,
            )} · Antippen zum Vergrößern
          </p>
        </div>
      </button>

      {viewerOpen && (
        <ImageLightbox
          src={imageUrl}
          alt={attachment.file_name}
          onClose={() =>
            setViewerOpen(false)
          }
        />
      )}
    </>
  );
}

function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const [scale, setScale] =
    useState(1);

  const [offset, setOffset] =
    useState({
      x: 0,
      y: 0,
    });

  const pointers = useRef(
    new Map<
      number,
      {
        x: number;
        y: number;
      }
    >(),
  );

  const gesture = useRef({
    initialDistance: 0,
    initialScale: 1,
    lastX: 0,
    lastY: 0,
  });

  const clampScale = (
    value: number,
  ) =>
    Math.min(
      5,
      Math.max(1, value),
    );

  const reset = () => {
    setScale(1);

    setOffset({
      x: 0,
      y: 0,
    });
  };

  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      'hidden';

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === 'Escape') {
        onClose();
      }

      if (event.key === '+') {
        setScale((current) =>
          clampScale(
            current + 0.5,
          ),
        );
      }

      if (event.key === '-') {
        setScale((current) =>
          clampScale(
            current - 0.5,
          ),
        );
      }
    };

    window.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        'keydown',
        handleKeyDown,
      );
    };
  }, [onClose]);

  const pointerDistance = () => {
    const values =
      Array.from(
        pointers.current.values(),
      );

    if (values.length < 2) {
      return 0;
    }

    return Math.hypot(
      values[0].x - values[1].x,
      values[0].y - values[1].y,
    );
  };

  const handlePointerDown = (
    event:
      React.PointerEvent<HTMLDivElement>,
  ) => {
    event.currentTarget
      .setPointerCapture(
        event.pointerId,
      );

    pointers.current.set(
      event.pointerId,
      {
        x: event.clientX,
        y: event.clientY,
      },
    );

    if (
      pointers.current.size === 2
    ) {
      gesture.current.initialDistance =
        pointerDistance();

      gesture.current.initialScale =
        scale;
    } else {
      gesture.current.lastX =
        event.clientX;

      gesture.current.lastY =
        event.clientY;
    }
  };

  const handlePointerMove = (
    event:
      React.PointerEvent<HTMLDivElement>,
  ) => {
    if (
      !pointers.current.has(
        event.pointerId,
      )
    ) {
      return;
    }

    pointers.current.set(
      event.pointerId,
      {
        x: event.clientX,
        y: event.clientY,
      },
    );

    if (
      pointers.current.size >= 2
    ) {
      const distance =
        pointerDistance();

      if (
        gesture.current
          .initialDistance > 0
      ) {
        setScale(
          clampScale(
            gesture.current
              .initialScale *
              (
                distance /
                gesture.current
                  .initialDistance
              ),
          ),
        );
      }

      return;
    }

    if (scale <= 1) {
      return;
    }

    const deltaX =
      event.clientX -
      gesture.current.lastX;

    const deltaY =
      event.clientY -
      gesture.current.lastY;

    gesture.current.lastX =
      event.clientX;

    gesture.current.lastY =
      event.clientY;

    setOffset((current) => ({
      x: current.x + deltaX,
      y: current.y + deltaY,
    }));
  };

  const releasePointer = (
    event:
      React.PointerEvent<HTMLDivElement>,
  ) => {
    pointers.current.delete(
      event.pointerId,
    );

    const remaining =
      Array.from(
        pointers.current.values(),
      );

    if (
      remaining.length === 1
    ) {
      gesture.current.lastX =
        remaining[0].x;

      gesture.current.lastY =
        remaining[0].y;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-slate-950/98 text-white"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 [padding-top:calc(env(safe-area-inset-top)+0.75rem)]">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">
            {alt}
          </p>

          <p className="mt-0.5 text-[10px] text-slate-400">
            {Math.round(scale * 100)} %
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 transition active:scale-95"
          aria-label="Bild schließen"
        >
          <X size={22} />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden touch-none"
        onPointerDown={
          handlePointerDown
        }
        onPointerMove={
          handlePointerMove
        }
        onPointerUp={
          releasePointer
        }
        onPointerCancel={
          releasePointer
        }
        onWheel={(event) => {
          event.preventDefault();

          setScale((current) =>
            clampScale(
              current +
                (
                  event.deltaY < 0
                    ? 0.25
                    : -0.25
                ),
            ),
          );
        }}
        onDoubleClick={() => {
          if (scale > 1) {
            reset();
          } else {
            setScale(2);
          }
        }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="max-h-[82vh] max-w-[96vw] select-none object-contain will-change-transform"
          style={{
            transform:
              `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,

            transformOrigin:
              'center center',
          }}
        />
      </div>

      <div className="flex shrink-0 items-center justify-center gap-3 border-t border-white/10 bg-slate-950/90 px-4 py-3 [padding-bottom:calc(env(safe-area-inset-bottom)+0.75rem)]">
        <button
          type="button"
          onClick={() => {
            setScale((current) =>
              clampScale(
                current - 0.5,
              ),
            );
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 active:scale-95"
          aria-label="Herauszoomen"
        >
          <ZoomOut size={20} />
        </button>

        <button
          type="button"
          onClick={reset}
          className="flex h-11 min-w-28 items-center justify-center gap-2 rounded-full bg-white/10 px-4 text-xs font-bold active:scale-95"
        >
          <RotateCcw size={17} />
          Zurücksetzen
        </button>

        <button
          type="button"
          onClick={() => {
            setScale((current) =>
              clampScale(
                current + 0.5,
              ),
            );
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 active:scale-95"
          aria-label="Hineinzoomen"
        >
          <ZoomIn size={20} />
        </button>
      </div>
    </div>
  );
}

function EventRow({ event, last }: { event: TicketEvent; last: boolean }) {
  const description = describeEvent(event);
  return (
    <div className="relative flex gap-3 pb-4">
      {!last && <span className="absolute bottom-0 left-[15px] top-8 w-px bg-slate-200 dark:bg-slate-800" />}
      <div className="relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"><History size={14} /></div>
      <div className="min-w-0 pt-1"><p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{description}</p><p className="mt-0.5 text-[11px] text-slate-400">{formatDateTime(event.created_at)}</p></div>
    </div>
  );
}

function describeEvent(event: TicketEvent) {
  if (event.event_type === 'ticket_created') return 'Ticket wurde erstellt.';
  if (event.event_type === 'status_changed') return `Status: ${statusLabel(event.old_value)} → ${statusLabel(event.new_value)}`;
  if (event.event_type === 'priority_changed') return `Priorität: ${priorityLabel(event.old_value)} → ${priorityLabel(event.new_value)}`;
  if (event.event_type === 'category_changed') return `Kategorie: ${event.old_value ?? '—'} → ${event.new_value ?? '—'}`;
  if (event.event_type === 'area_changed') return `Bereich: ${event.old_value ?? '—'} → ${event.new_value ?? '—'}`;
  if (event.event_type === 'assignee_changed') return event.new_value ? 'Bearbeiter wurde geändert.' : 'Zuweisung wurde entfernt.';
  if (event.event_type === 'comment_created') return event.internal ? 'Interner Kommentar wurde hinzugefügt.' : 'Kommentar wurde hinzugefügt.';
  return event.event_type.replace(/_/g, ' ');
}

function statusLabel(value?: string | null) {
  return value && value in statusLabels ? statusLabels[value as keyof typeof statusLabels] : value ?? '—';
}

function priorityLabel(value?: string | null) {
  return value && value in priorityLabels ? priorityLabels[value as keyof typeof priorityLabels] : value ?? '—';
}

function Info({ icon: Icon, label, value, mono = false }: { icon: typeof Tag; label: string; value: string; mono?: boolean }) {
  return <div className="min-w-0 bg-white p-3 dark:bg-slate-900 sm:p-4"><div className="flex min-w-0 items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-400 sm:gap-2 sm:text-[10px]"><Icon size={12} className="shrink-0" /> <span className="truncate">{label}</span></div><p className={`mt-1.5 truncate text-xs font-bold text-slate-800 dark:text-slate-100 sm:text-sm ${mono ? 'font-mono text-[10px] sm:text-xs' : ''}`} title={value}>{value}</p></div>;
}

function AdminSelect({ label, value, onChange, disabled, children }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="field-label">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="field-input mt-1">{children}</select></label>;
}

function SideInfo({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-3"><span>{label}</span><span className="text-right font-bold text-slate-700 dark:text-slate-200">{value}</span></div>;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value.includes('T') ? value : `${value}T12:00:00`));
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
