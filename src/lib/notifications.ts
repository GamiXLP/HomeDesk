import { supabase } from './supabase';

type TicketEmailEvent = 'ticket_created' | 'comment_created' | 'ticket_closed';

type TicketEmailPayload = {
    eventType: TicketEmailEvent;
    ticketId: string;
    commentId?: string;
};

export async function sendTicketEmailNotification(payload: TicketEmailPayload) {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) return;

    const response = await fetch('/.netlify/functions/send-ticket-email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        console.warn('HomeDesk mail notification failed:', text);
    }
}