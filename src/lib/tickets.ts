import { supabase } from './supabase';
import { sendTicketEmailNotification } from './notifications';
import type {
  Ticket,
  TicketAttachment,
  TicketComment,
  TicketPriority,
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

export async function getTicket(id: string) {
  const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single();

  if (error) throw error;

  return data as Ticket;
}

export async function createTicket(
    input: Omit<
        Ticket,
        'id' | 'status' | 'created_at' | 'updated_at' | 'closed_at' | 'archived_at' | 'assigned_to'
    >,
) {
  const { data, error } = await supabase
      .from('tickets')
      .insert(input)
      .select('*')
      .single();

  if (error) throw error;

  const ticket = data as Ticket;

  await sendTicketEmailNotification({
    eventType: 'ticket_created',
    ticketId: ticket.id,
  }).catch((notificationError) => {
    console.warn('Ticket created, but email notification failed:', notificationError);
  });

  return ticket;
}

export async function updateTicketAdmin(
    id: string,
    patch: Partial<Pick<Ticket, 'status' | 'priority' | 'category' | 'area'>>,
) {
  const before = await getTicket(id);

  const payload: Record<string, unknown> = { ...patch };

  if (patch.status === 'done') {
    payload.closed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
      .from('tickets')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

  if (error) throw error;

  const ticket = data as Ticket;
  const changes = buildTicketChanges(before, ticket, patch);

  await sendTicketEmailNotification({
    eventType: 'ticket_updated',
    ticketId: ticket.id,
    changes,
  }).catch((notificationError) => {
    console.warn('Ticket updated, but email notification failed:', notificationError);
  });

  return ticket;
}

export async function deleteTicketAdmin(id: string) {
  await sendTicketEmailNotification({
    eventType: 'ticket_deleted',
    ticketId: id,
  }).catch((notificationError) => {
    console.warn('Ticket delete mail failed, ticket will still be deleted:', notificationError);
  });

  const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id);

  if (error) throw error;
}

export async function getComments(ticketId: string) {
  const { data: commentData, error: commentError } = await supabase
      .from('ticket_comments')
      .select('*, profiles(display_name, role)')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

  if (commentError) throw commentError;

  const comments = commentData as TicketComment[];
  const commentIds = comments.map((comment) => comment.id);

  if (commentIds.length === 0) {
    return comments;
  }

  const { data: attachmentData, error: attachmentError } = await supabase
      .from('ticket_attachments')
      .select('*')
      .eq('ticket_id', ticketId)
      .in('comment_id', commentIds)
      .order('created_at', { ascending: true });

  if (attachmentError) throw attachmentError;

  const attachmentsWithUrls = await Promise.all(
      ((attachmentData ?? []) as TicketAttachment[]).map(async (attachment) => {
        const { data } = await supabase.storage
            .from(TICKET_ATTACHMENTS_BUCKET)
            .createSignedUrl(attachment.file_path, 60 * 60);

        return {
          ...attachment,
          signed_url: data?.signedUrl ?? null,
        };
      }),
  );

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

export async function addComment(
    ticketId: string,
    authorId: string,
    body: string,
    visibility: 'public' | 'internal',
    files: File[] = [],
) {
  validateCommentImages(files);

  const { data, error } = await supabase
      .from('ticket_comments')
      .insert({
        ticket_id: ticketId,
        author_id: authorId,
        body,
        visibility,
      })
      .select('*')
      .single();

  if (error) throw error;

  const comment = data as TicketComment;

  if (files.length > 0) {
    await uploadCommentImages(ticketId, comment.id, authorId, files);
  }

  await sendTicketEmailNotification({
    eventType: 'comment_created',
    ticketId,
    commentId: comment.id,
  }).catch((notificationError) => {
    console.warn('Comment created, but email notification failed:', notificationError);
  });

  return comment;
}

async function uploadCommentImages(
    ticketId: string,
    commentId: string,
    uploadedBy: string,
    files: File[],
) {
  const uploadedFilePaths: string[] = [];

  try {
    const rows = [];

    for (const file of files) {
      const safeFileName = sanitizeFileName(file.name);
      const filePath = `${ticketId}/${commentId}/${crypto.randomUUID()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
          .from(TICKET_ATTACHMENTS_BUCKET)
          .upload(filePath, file, {
            contentType: file.type,
            cacheControl: '3600',
            upsert: false,
          });

      if (uploadError) throw uploadError;

      uploadedFilePaths.push(filePath);

      rows.push({
        ticket_id: ticketId,
        comment_id: commentId,
        uploaded_by: uploadedBy,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
      });
    }

    const { error: insertError } = await supabase
        .from('ticket_attachments')
        .insert(rows);

    if (insertError) throw insertError;
  } catch (error) {
    if (uploadedFilePaths.length > 0) {
      await supabase.storage
          .from(TICKET_ATTACHMENTS_BUCKET)
          .remove(uploadedFilePaths)
          .catch((cleanupError) => {
            console.warn('Attachment cleanup failed:', cleanupError);
          });
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
    patch: Partial<Pick<Ticket, 'status' | 'priority' | 'category' | 'area'>>,
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

  return changes;
}

const statusLabels: Record<TicketStatus, string> = {
  new: 'Neu',
  seen: 'Gesehen',
  planned: 'Geplant',
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