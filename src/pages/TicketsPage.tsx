import { useEffect, useState } from 'react';
import { getTickets } from '../lib/tickets';
import type { Ticket } from '../types/database';
import { TicketList } from '../components/tickets/TicketList';
export function TicketsPage() { const [tickets, setTickets] = useState<Ticket[]>([]); useEffect(()=>{ getTickets().then(setTickets); }, []); return <TicketList tickets={tickets}/>; }
