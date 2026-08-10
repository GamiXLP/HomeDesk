import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getTicketReads, getTickets, markTicketRead } from '../lib/tickets';
import { supabase } from '../lib/supabase';
import type { Ticket } from '../types/database';
import { useAuth } from './useAuth';

const CACHE_TTL_MS = 30_000;

type TicketCache = {
  userId: string;
  tickets: Ticket[];
  readAtByTicket: Record<string, string>;
  loadedAt: number;
};

let memoryCache: TicketCache | null = null;

type TicketDataContextValue = {
  tickets: Ticket[];
  unreadTicketIds: Set<string>;
  unreadCount: number;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: (force?: boolean) => Promise<void>;
  markRead: (ticketId: string) => Promise<void>;
  replaceTicket: (ticket: Ticket) => void;
};

const TicketDataContext = createContext<TicketDataContextValue | null>(null);

export function TicketDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const validCache = memoryCache?.userId === user?.id ? memoryCache : null;
  const [tickets, setTickets] = useState<Ticket[]>(() => validCache?.tickets ?? []);
  const [readAtByTicket, setReadAtByTicket] = useState<Record<string, string>>(() => validCache?.readAtByTicket ?? {});
  const [loading, setLoading] = useState(!validCache);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(validCache ? new Date(validCache.loadedAt) : null);
  const ticketsRef = useRef(tickets);
  const readsRef = useRef(readAtByTicket);

  useEffect(() => { ticketsRef.current = tickets; }, [tickets]);
  useEffect(() => { readsRef.current = readAtByTicket; }, [readAtByTicket]);

  const commitCache = useCallback((nextTickets: Ticket[], nextReads: Record<string, string>, loadedAt = Date.now()) => {
    if (!user) return;
    memoryCache = { userId: user.id, tickets: nextTickets, readAtByTicket: nextReads, loadedAt };
    setLastUpdated(new Date(loadedAt));
  }, [user]);

  const refresh = useCallback(async (force = false) => {
    if (!user) return;
    const currentCache = memoryCache?.userId === user.id ? memoryCache : null;

    if (!force && currentCache && Date.now() - currentCache.loadedAt < CACHE_TTL_MS) {
      setTickets(currentCache.tickets);
      setReadAtByTicket(currentCache.readAtByTicket);
      setLastUpdated(new Date(currentCache.loadedAt));
      setLoading(false);
      return;
    }

    try {
      setError(null);
      if (!currentCache) setLoading(true);
      const [nextTickets, reads] = await Promise.all([getTickets(), getTicketReads(user.id)]);
      const nextReads = Object.fromEntries(reads.map((read) => [read.ticket_id, read.last_read_at]));
      const loadedAt = Date.now();
      memoryCache = { userId: user.id, tickets: nextTickets, readAtByTicket: nextReads, loadedAt };
      setTickets(nextTickets);
      setReadAtByTicket(nextReads);
      setLastUpdated(new Date(loadedAt));
    } catch (nextError) {
      console.error(nextError);
      setError(nextError instanceof Error ? nextError.message : 'Tickets konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const replaceTicket = useCallback((ticket: Ticket) => {
    setTickets((current) => {
      const next = [ticket, ...current.filter((item) => item.id !== ticket.id)].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      );
      commitCache(next, readsRef.current);
      return next;
    });
  }, [commitCache]);

  const markRead = useCallback(async (ticketId: string) => {
    if (!user) return;
    const optimisticReadAt = new Date().toISOString();
    setReadAtByTicket((current) => {
      const next = { ...current, [ticketId]: optimisticReadAt };
      commitCache(ticketsRef.current, next);
      return next;
    });
    const persistedReadAt = await markTicketRead(ticketId, user.id);
    setReadAtByTicket((current) => ({ ...current, [ticketId]: persistedReadAt }));
  }, [commitCache, user]);

  useEffect(() => {
    if (!user) {
      memoryCache = null;
      setTickets([]);
      setReadAtByTicket({});
      setLastUpdated(null);
      return;
    }

    if (memoryCache && memoryCache.userId !== user.id) {
      memoryCache = null;
      setTickets([]);
      setReadAtByTicket({});
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
          memoryCache = { userId: user.id, tickets: nextTickets, readAtByTicket: readsRef.current, loadedAt };
          setLastUpdated(new Date(loadedAt));
          return nextTickets;
        });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  const unreadTicketIds = useMemo(() => {
    const unread = new Set<string>();
    for (const ticket of tickets) {
      const lastReadAt = readAtByTicket[ticket.id];
      if (!lastReadAt || new Date(ticket.updated_at).getTime() > new Date(lastReadAt).getTime() + 500) {
        unread.add(ticket.id);
      }
    }
    return unread;
  }, [readAtByTicket, tickets]);

  const value = useMemo(
    () => ({
      tickets,
      unreadTicketIds,
      unreadCount: unreadTicketIds.size,
      loading,
      error,
      lastUpdated,
      refresh,
      markRead,
      replaceTicket,
    }),
    [tickets, unreadTicketIds, loading, error, lastUpdated, refresh, markRead, replaceTicket],
  );

  return <TicketDataContext.Provider value={value}>{children}</TicketDataContext.Provider>;
}

export function useTickets() {
  const context = useContext(TicketDataContext);
  if (!context) throw new Error('useTickets must be used inside TicketDataProvider');
  return context;
}
