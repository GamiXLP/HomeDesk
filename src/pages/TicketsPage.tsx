import { TicketList } from '../components/tickets/TicketList';
import { ErrorState, LoadingState } from '../components/ui/States';
import { useTickets } from '../hooks/useTickets';

export function TicketsPage() {
  const { tickets, loading, error, refresh } = useTickets();
  if (loading && tickets.length === 0) return <LoadingState rows={5} />;
  if (error && tickets.length === 0) return <ErrorState message={error} onRetry={() => void refresh(true)} />;
  return <TicketList tickets={tickets} />;
}
