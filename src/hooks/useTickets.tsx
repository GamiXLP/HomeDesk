import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getTickets } from '../lib/tickets';
import { supabase } from '../lib/supabase';
import type { Ticket } from '../types/database';
import { useAuth } from './useAuth';

const CACHE_TTL_MS = 30_000;
let memoryCache: { userId: string; tickets: Ticket[]; loadedAt: number } | null = null;

type TicketDataContextValue = {
  tickets: Ticket[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: (force?: boolean) => Promise<void>;
};

const TicketDataContext = createContext<TicketDataContextValue | null>(null);

export function TicketDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const validCache = memoryCache?.userId === user?.id ? memoryCache : null;
  const [tickets, setTickets] = useState<Ticket[]>(() => validCache?.tickets ?? []);
  const [loading, setLoading] = useState(!validCache);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(validCache ? new Date(validCache.loadedAt) : null);

  const refresh = useCallback(async (force = false) => {
    if (!user) return;
    const currentCache = memoryCache?.userId === user.id ? memoryCache : null;

    if (!force && currentCache && Date.now() - currentCache.loadedAt < CACHE_TTL_MS) {
      setTickets(currentCache.tickets);
      setLastUpdated(new Date(currentCache.loadedAt));
      setLoading(false);
      return;
    }

    try {
      setError(null);
      if (!currentCache) setLoading(true);
      const nextTickets = await getTickets();
      const loadedAt = Date.now();
      memoryCache = { userId: user.id, tickets: nextTickets, loadedAt };
      setTickets(nextTickets);
      setLastUpdated(new Date(loadedAt));
    } catch (nextError) {
      console.error(nextError);
      setError(nextError instanceof Error ? nextError.message : 'Tickets konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      memoryCache = null;
      setTickets([]);
      return;
    }

    if (memoryCache && memoryCache.userId !== user.id) {
      memoryCache = null;
      setTickets([]);
      setLastUpdated(null);
    }

    void refresh();

    const channel = supabase
      .channel(`homedesk-ticket-feed-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, (payload) => {
        setTickets((currentTickets) => {
          let nextTickets = currentTickets;

          if (payload.eventType === 'INSERT') {
            const inserted = payload.new as Ticket;
            nextTickets = [inserted, ...currentTickets.filter((ticket) => ticket.id !== inserted.id)];
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Ticket;
            nextTickets = currentTickets.map((ticket) => (ticket.id === updated.id ? updated : ticket));
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as Partial<Ticket>;
            nextTickets = currentTickets.filter((ticket) => ticket.id !== deleted.id);
          }

          nextTickets = [...nextTickets].sort(
            (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
          );
          const loadedAt = Date.now();
          memoryCache = { userId: user.id, tickets: nextTickets, loadedAt };
          setLastUpdated(new Date(loadedAt));
          return nextTickets;
        });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  const value = useMemo(
    () => ({ tickets, loading, error, lastUpdated, refresh }),
    [tickets, loading, error, lastUpdated, refresh],
  );

  return <TicketDataContext.Provider value={value}>{children}</TicketDataContext.Provider>;
}

export function useTickets() {
  const context = useContext(TicketDataContext);
  if (!context) throw new Error('useTickets must be used inside TicketDataProvider');
  return context;
}
