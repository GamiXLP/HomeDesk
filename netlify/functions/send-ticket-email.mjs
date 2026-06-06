import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const allowedEventTypes = new Set([
    'ticket_created',
    'comment_created',
    'ticket_closed',
]);

const statusLabels = {
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

const priorityLabels = {
    low: 'Niedrig',
    normal: 'Normal',
    high: 'Hoch',
    urgent: 'Dringend',
};

export async function handler(event) {
    if (event.httpMethod !== 'POST') {
        return jsonResponse(405, { error: 'Method not allowed' });
    }

    try {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const resendApiKey = process.env.RESEND_API_KEY;
        const mailFrom = process.env.MAIL_FROM;
        const adminEmail = process.env.ADMIN_EMAIL;
        const appUrl = process.env.APP_URL || process.env.URL || '';

        if (!supabaseUrl || !serviceRoleKey || !resendApiKey || !mailFrom) {
            return jsonResponse(500, {
                error: 'Mail function env vars are incomplete.',
            });
        }

        const authHeader = event.headers.authorization || event.headers.Authorization;
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return jsonResponse(401, { error: 'Missing authorization token.' });
        }

        const body = JSON.parse(event.body || '{}');
        const { eventType, ticketId, commentId } = body;

        if (!allowedEventTypes.has(eventType) || !ticketId) {
            return jsonResponse(400, { error: 'Invalid request body.' });
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });

        const resend = new Resend(resendApiKey);

        const {
            data: { user },
            error: userError,
        } = await supabaseAdmin.auth.getUser(token);

        if (userError || !user) {
            return jsonResponse(401, { error: 'Invalid user token.' });
        }

        const { data: requesterProfile, error: requesterProfileError } = await supabaseAdmin
            .from('profiles')
            .select('id, display_name, role')
            .eq('id', user.id)
            .single();

        if (requesterProfileError || !requesterProfile) {
            return jsonResponse(403, { error: 'Requester profile not found.' });
        }

        const { data: ticket, error: ticketError } = await supabaseAdmin
            .from('tickets')
            .select('*')
            .eq('id', ticketId)
            .single();

        if (ticketError || !ticket) {
            return jsonResponse(404, { error: 'Ticket not found.' });
        }

        const isAdmin = requesterProfile.role === 'admin';
        const isOwner = ticket.created_by === user.id;

        if (!isAdmin && !isOwner) {
            return jsonResponse(403, { error: 'Not allowed for this ticket.' });
        }

        let comment = null;

        if (eventType === 'comment_created') {
            if (!commentId) {
                return jsonResponse(400, { error: 'Missing commentId.' });
            }

            const { data: commentData, error: commentError } = await supabaseAdmin
                .from('ticket_comments')
                .select('*, profiles(display_name, role)')
                .eq('id', commentId)
                .eq('ticket_id', ticketId)
                .single();

            if (commentError || !commentData) {
                return jsonResponse(404, { error: 'Comment not found.' });
            }

            comment = commentData;

            if (comment.visibility === 'internal' && !isAdmin) {
                return jsonResponse(403, { error: 'Only admins can send internal comment notifications.' });
            }
        }

        const recipients = new Set();

        const ownerEmail = await getUserEmail(supabaseAdmin, ticket.created_by);

        if (eventType !== 'comment_created' || comment?.visibility === 'public') {
            if (ownerEmail) recipients.add(ownerEmail);
        }

        if (ticket.assigned_to) {
            const assignedEmail = await getUserEmail(supabaseAdmin, ticket.assigned_to);
            if (assignedEmail) recipients.add(assignedEmail);
        } else {
            const fallbackAdminEmails = await getAdminEmails(supabaseAdmin, adminEmail);
            for (const email of fallbackAdminEmails) {
                recipients.add(email);
            }
        }

        const to = [...recipients].filter(Boolean);

        if (to.length === 0) {
            return jsonResponse(200, {
                ok: true,
                skipped: true,
                reason: 'No recipients found.',
            });
        }

        const mail = buildMail({
            eventType,
            ticket,
            comment,
            requesterProfile,
            appUrl,
        });

        const { error: mailError } = await resend.emails.send({
            from: mailFrom,
            to,
            subject: mail.subject,
            html: mail.html,
        });

        if (mailError) {
            console.error(mailError);
            return jsonResponse(500, { error: 'Email could not be sent.' });
        }

        return jsonResponse(200, {
            ok: true,
            recipients: to.length,
        });
    } catch (error) {
        console.error(error);
        return jsonResponse(500, {
            error: 'Unexpected mail function error.',
        });
    }
}

async function getUserEmail(supabaseAdmin, userId) {
    if (!userId) return null;

    const {
        data: { user },
        error,
    } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (error || !user?.email) return null;
    return user.email;
}

async function getAdminEmails(supabaseAdmin, adminEmailEnv) {
    const envEmails = splitEmails(adminEmailEnv);

    if (envEmails.length > 0) {
        return envEmails;
    }

    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

    if (error || !data) return [];

    const emails = [];

    for (const profile of data) {
        const email = await getUserEmail(supabaseAdmin, profile.id);
        if (email) emails.push(email);
    }

    return emails;
}

function splitEmails(value) {
    if (!value) return [];

    return value
        .split(',')
        .map((email) => email.trim())
        .filter(Boolean);
}

function buildMail({ eventType, ticket, comment, requesterProfile, appUrl }) {
    const ticketUrl = appUrl
        ? `${appUrl.replace(/\/$/, '')}/app/tickets/${ticket.id}`
        : '';

    if (eventType === 'ticket_created') {
        return {
            subject: `Neues HomeDesk Ticket: ${ticket.title}`,
            html: layout({
                headline: 'Neues Ticket erstellt',
                intro: `${escapeHtml(requesterProfile.display_name)} hat ein neues Ticket erstellt.`,
                ticket,
                ticketUrl,
            }),
        };
    }

    if (eventType === 'comment_created') {
        const isInternal = comment?.visibility === 'internal';

        return {
            subject: `${isInternal ? 'Interner Kommentar' : 'Neuer Kommentar'}: ${ticket.title}`,
            html: layout({
                headline: isInternal ? 'Neuer interner Kommentar' : 'Neuer Kommentar',
                intro: `${escapeHtml(requesterProfile.display_name)} hat einen Kommentar hinzugefügt.`,
                ticket,
                ticketUrl,
                comment,
            }),
        };
    }

    return {
        subject: `Ticket abgeschlossen: ${ticket.title}`,
        html: layout({
            headline: 'Ticket abgeschlossen',
            intro: `${escapeHtml(requesterProfile.display_name)} hat das Ticket als erledigt markiert.`,
            ticket,
            ticketUrl,
        }),
    };
}

function layout({ headline, intro, ticket, ticketUrl, comment }) {
    const status = statusLabels[ticket.status] || ticket.status;
    const priority = priorityLabels[ticket.priority] || ticket.priority;

    return `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="background:#0ea5e9;color:white;padding:20px 24px;">
          <h1 style="margin:0;font-size:22px;">${escapeHtml(headline)}</h1>
          <p style="margin:8px 0 0;font-size:14px;">HomeDesk</p>
        </div>

        <div style="padding:24px;">
          <p style="font-size:16px;margin-top:0;">${intro}</p>

          <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:20px 0;">
            <h2 style="margin:0 0 8px;font-size:20px;">${escapeHtml(ticket.title)}</h2>
            <p style="margin:0 0 16px;color:#475569;white-space:pre-wrap;">${escapeHtml(ticket.description)}</p>

            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr>
                <td style="padding:6px 0;color:#64748b;">Status</td>
                <td style="padding:6px 0;font-weight:bold;">${escapeHtml(status)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748b;">Priorität</td>
                <td style="padding:6px 0;font-weight:bold;">${escapeHtml(priority)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748b;">Kategorie</td>
                <td style="padding:6px 0;">${escapeHtml(ticket.category)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#64748b;">Bereich</td>
                <td style="padding:6px 0;">${escapeHtml(ticket.area)}</td>
              </tr>
              ${
        ticket.device
            ? `<tr>
                      <td style="padding:6px 0;color:#64748b;">Gerät</td>
                      <td style="padding:6px 0;">${escapeHtml(ticket.device)}</td>
                    </tr>`
            : ''
    }
            </table>
          </div>

          ${
        comment
            ? `<div style="border-left:4px solid #0ea5e9;background:#f0f9ff;padding:14px 16px;margin:20px 0;">
                  <p style="margin:0 0 6px;font-weight:bold;">Kommentar</p>
                  <p style="margin:0;white-space:pre-wrap;">${escapeHtml(comment.body)}</p>
                </div>`
            : ''
    }

          ${
        ticketUrl
            ? `<p style="margin-top:24px;">
                  <a href="${escapeHtml(ticketUrl)}" style="display:inline-block;background:#0ea5e9;color:white;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:bold;">
                    Ticket öffnen
                  </a>
                </p>`
            : ''
    }

          <p style="margin-top:28px;color:#64748b;font-size:12px;">
            Diese Nachricht wurde automatisch von HomeDesk versendet.
          </p>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function jsonResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    };
}