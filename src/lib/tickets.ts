import { supabase } from './supabase';
import { sendTicketEmailNotification } from './notifications';
import type {
  Profile,
  Ticket,
  TicketAttachment,
  TicketComment,
  TicketEvent,
  TicketPriority,
  TicketRead,
  TicketStatus,
} from '../types/database';

const TICKET_ATTACHMENTS_BUCKET = 'ticket-attachments';

export const COMMENT_IMAGE_MAX_COUNT = 5;
export const COMMENT_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const COMMENT_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function getTickets() {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data as Ticket[];
}

export async function getTicket(identifier: string) {
  const normalized = identifier.trim().replace(/^HD-/i, '');
  const query = supabase.from('tickets').select('*');
  const request = /^\d{8}$/.test(normalized)
    ? query.eq('ticket_number', Number(normalized)).single()
    : query.eq('id', normalized).single();

  const { data, error } = await request;
  if (error) throw error;
  return data as Ticket;
}

export async function getProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, role, avatar_url, created_at')
    .order('display_name');

  if (error) throw error;
  return data as Profile[];
}

export async function createTicket(
  input: Omit<
    Ticket,
    'id' | 'status' | 'created_at' | 'updated_at' | 'closed_at' | 'archived_at' | 'assigned_to'
  >,
) {
  const { data, error } = await supabase.from('tickets').insert(input).select('*').single();
  if (error) throw error;

  const ticket = data as Ticket;

  void sendTicketEmailNotification({ eventType: 'ticket_created', ticketId: ticket.id }).catch(
    (notificationError) => {
      console.warn('Ticket created, but email notification failed:', notificationError);
    },
  );

  return ticket;
}

export async function updateTicketAdmin(
  id: string,
  patch: Partial<Pick<Ticket, 'status' | 'priority' | 'category' | 'area' | 'assigned_to'>>,
  beforeTicket?: Ticket,
) {
  const before = beforeTicket ?? (await getTicket(id));
  const payload: Record<string, unknown> = { ...patch };

  if (patch.status === 'done' && before.status !== 'done') payload.closed_at = new Date().toISOString();
  if (patch.status && patch.status !== 'done' && before.status === 'done') payload.closed_at = null;
  if (patch.status === 'archived') payload.archived_at = new Date().toISOString();
  if (patch.status && patch.status !== 'archived' && before.status === 'archived') payload.archived_at = null;

  const { data, error } = await supabase.from('tickets').update(payload).eq('id', id).select('*').single();
  if (error) throw error;

  const ticket = data as Ticket;
  const changes = buildTicketChanges(before, ticket, patch);

  void sendTicketEmailNotification({ eventType: 'ticket_updated', ticketId: ticket.id, changes }).catch(
    (notificationError) => {
      console.warn('Ticket updated, but email notification failed:', notificationError);
    },
  );

  return ticket;
}

export async function deleteTicketAdmin(id: string) {
  try {
    await sendTicketEmailNotification({ eventType: 'ticket_deleted', ticketId: id });
  } catch (notificationError) {
    console.warn('Ticket delete mail failed, ticket will still be deleted:', notificationError);
  }

  const { error } = await supabase.from('tickets').delete().eq('id', id);
  if (error) throw error;
}

export async function getComments(ticketId: string) {
  const { data: commentData, error: commentError } = await supabase
    .from('ticket_comments')
    .select('*, profiles(display_name, role)')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  if (commentError) throw commentError;

  const comments = (commentData ?? []) as TicketComment[];
  const commentIds = comments.map((comment) => comment.id);
  if (commentIds.length === 0) return comments;

  const { data: attachmentData, error: attachmentError } = await supabase
    .from('ticket_attachments')
    .select('*')
    .eq('ticket_id', ticketId)
    .in('comment_id', commentIds)
    .order('created_at', { ascending: true });

  if (attachmentError) throw attachmentError;

  const attachments = (attachmentData ?? []) as TicketAttachment[];
  let attachmentsWithUrls = attachments;

  if (attachments.length > 0) {
    const { data: signedData, error: signedError } = await supabase.storage
      .from(TICKET_ATTACHMENTS_BUCKET)
      .createSignedUrls(
        attachments.map((attachment) => attachment.file_path),
        60 * 60,
      );

    if (signedError) console.warn('Signed attachment URLs could not be created:', signedError);

    attachmentsWithUrls = attachments.map((attachment, index) => ({
      ...attachment,
      signed_url: signedData?.[index]?.signedUrl ?? null,
    }));
  }

  const attachmentsByCommentId = new Map<string, TicketAttachment[]>();
  for (const attachment of attachmentsWithUrls) {
    if (!attachment.comment_id) continue;
    const existing = attachmentsByCommentId.get(attachment.comment_id) ?? [];
    existing.push(attachment);
    attachmentsByCommentId.set(attachment.comment_id, existing);
  }

  return comments.map((comment) => ({
    ...comment,
    attachments: attachmentsByCommentId.get(comment.id) ?? [],
  }));
}

export async function getTicketEvents(ticketId: string) {
  const { data, error } = await supabase
    .from('ticket_events')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as TicketEvent[];
}

export async function getTicketReads(userId: string) {
  const { data, error } = await supabase
    .from('ticket_reads')
    .select('ticket_id, user_id, last_read_at')
    .eq('user_id', userId);

  if (error) throw error;
  return (data ?? []) as TicketRead[];
}

export async function markTicketRead(ticketId: string, userId: string) {
  const lastReadAt = new Date().toISOString();
  const { error } = await supabase.from('ticket_reads').upsert(
    { ticket_id: ticketId, user_id: userId, last_read_at: lastReadAt },
    { onConflict: 'ticket_id,user_id' },
  );

  if (error) console.warn('Ticket read marker could not be saved:', error);
  return lastReadAt;
}

export async function addComment(
  ticketId: string,
  authorId: string,
  body: string,
  visibility: 'public' | 'internal',
  files: File[] = [],
) {
  validateCommentImages(files);

  const safeBody = body.trim() || (files.length > 0 ? 'Bild angehängt.' : '');
  const { data, error } = await supabase
    .from('ticket_comments')
    .insert({ ticket_id: ticketId, author_id: authorId, body: safeBody, visibility })
    .select('*')
    .single();

  if (error) throw error;

  const comment = data as TicketComment;
  if (files.length > 0) await uploadCommentImages(ticketId, comment.id, authorId, files);

  void sendTicketEmailNotification({
    eventType: 'comment_created',
    ticketId,
    commentId: comment.id,
  }).catch((notificationError) => {
    console.warn('Comment created, but email notification failed:', notificationError);
  });

  return comment;
}

async function uploadCommentImages(ticketId: string, commentId: string, uploadedBy: string, files: File[]) {
  const plannedUploads = files.map((file) => ({
    file,
    filePath: `${ticketId}/${commentId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`,
  }));
  const uploadedFilePaths: string[] = [];

  try {
    await Promise.all(
      plannedUploads.map(async ({ file, filePath }) => {
        const { error: uploadError } = await supabase.storage
          .from(TICKET_ATTACHMENTS_BUCKET)
          .upload(filePath, file, {
            contentType: file.type,
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;
        uploadedFilePaths.push(filePath);
      }),
    );

    const rows = plannedUploads.map(({ file, filePath }) => ({
      ticket_id: ticketId,
      comment_id: commentId,
      uploaded_by: uploadedBy,
      file_name: file.name,
      file_path: filePath,
      file_type: file.type,
      file_size: file.size,
    }));

    const { error: insertError } = await supabase.from('ticket_attachments').insert(rows);
    if (insertError) throw insertError;
  } catch (error) {
    if (uploadedFilePaths.length > 0) {
      await supabase.storage
        .from(TICKET_ATTACHMENTS_BUCKET)
        .remove(uploadedFilePaths)
        .catch((cleanupError) => console.warn('Attachment cleanup failed:', cleanupError));
    }
    throw error;
  }
}

function validateCommentImages(files: File[]) {
  if (files.length > COMMENT_IMAGE_MAX_COUNT) {
    throw new Error(`Maximal ${COMMENT_IMAGE_MAX_COUNT} Bilder pro Kommentar erlaubt.`);
  }

  for (const file of files) {
    if (!COMMENT_IMAGE_MIME_TYPES.includes(file.type)) {
      throw new Error(`"${file.name}" ist kein erlaubtes Bildformat. Erlaubt sind JPG, PNG und WEBP.`);
    }
    if (file.size > COMMENT_IMAGE_MAX_SIZE_BYTES) {
      throw new Error(`"${file.name}" ist zu groß. Maximal erlaubt sind 5 MB pro Bild.`);
    }
  }
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

function buildTicketChanges(
  before: Ticket,
  after: Ticket,
  patch: Partial<Pick<Ticket, 'status' | 'priority' | 'category' | 'area' | 'assigned_to'>>,
) {
  const changes: Record<string, string> = {};

  if (patch.status && before.status !== after.status) {
    changes.Status = `${statusLabels[before.status]} → ${statusLabels[after.status]}`;
  }
  if (patch.priority && before.priority !== after.priority) {
    changes.Priorität = `${priorityLabels[before.priority]} → ${priorityLabels[after.priority]}`;
  }
  if (patch.category && before.category !== after.category) {
    changes.Kategorie = `${before.category} → ${after.category}`;
  }
  if (patch.area && before.area !== after.area) {
    changes.Bereich = `${before.area} → ${after.area}`;
  }
  if (patch.assigned_to !== undefined && before.assigned_to !== after.assigned_to) {
    changes.Zuweisung = after.assigned_to ? 'Bearbeiter zugewiesen' : 'Zuweisung entfernt';
  }

  return changes;
}

const statusLabels: Record<TicketStatus, string> = {
  new: 'Neu',
  seen: 'Angesehen',
  planned: 'In Planung',
  in_progress: 'In Bearbeitung',
  waiting_feedback: 'Wartet auf Rückmeldung',
  waiting_parts: 'Wartet auf Teile',
  tested: 'Getestet',
  done: 'Erledigt',
  rejected: 'Abgelehnt',
  archived: 'Archiviert',
};

const priorityLabels: Record<TicketPriority, string> = {
  low: 'Niedrig',
  normal: 'Normal',
  high: 'Hoch',
  urgent: 'Dringend',
};

export const typed = {
  status: (s: string) => s as TicketStatus,
  priority: (p: string) => p as TicketPriority,
};
