import { ChevronLeft, ChevronRight, Filter, LayoutList, Plus, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { areas, categories, priorityLabels, priorityOptions, statusLabels, statusOptions } from '../../constants/tickets';
import { usePreferences } from '../../hooks/usePreferences';
import { useTickets } from '../../hooks/useTickets';
import type { Ticket } from '../../types/database';
import { isTicketOpen, priorityWeight, ticketReference } from '../../utils/tickets';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/States';
import { TicketCard } from './TicketCard';

type SortMode = 'updated_desc' | 'updated_asc' | 'priority' | 'created_desc';

export function TicketList({ tickets }: { tickets: Ticket[] }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { preferences, updatePreferences } = usePreferences();
  const { unreadTicketIds } = useTickets();

  const query = searchParams.get('q') ?? '';
  const scope = searchParams.get('scope') ?? preferences.defaultTicketScope;
  const status = searchParams.get('status') ?? 'all';
  const priority = searchParams.get('priority') ?? 'all';
  const area = searchParams.get('area') ?? 'all';
  const category = searchParams.get('category') ?? 'all';
  const assigned = searchParams.get('assigned') ?? 'all';
  const age = searchParams.get('age') ?? 'all';
  const sort = (searchParams.get('sort') ?? 'updated_desc') as SortMode;
  const requestedPage = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1);

  function setParam(key: string, value: string, defaultValue = 'all') {
    const next = new URLSearchParams(searchParams);
    if (!value || value === defaultValue) next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setSearchParams(next, { replace: true });
  }

  function resetFilters() {
    setSearchParams({}, { replace: true });
  }

  function toggleCompact() {
    updatePreferences({ ticketDensity: preferences.ticketDensity === 'compact' ? 'comfortable' : 'compact' });
  }

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return tickets
      .filter((ticket) => {
        if (scope === 'open' && !isTicketOpen(ticket)) return false;
        if (scope === 'closed' && isTicketOpen(ticket)) return false;
        if (status !== 'all' && ticket.status !== status) return false;
        if (priority !== 'all' && ticket.priority !== priority) return false;
        if (area !== 'all' && ticket.area !== area) return false;
        if (category !== 'all' && ticket.category !== category) return false;
        if (assigned === 'none' && ticket.assigned_to) return false;
        if (assigned !== 'all' && assigned !== 'none' && ticket.assigned_to !== assigned) return false;
        if (age !== 'all' && Date.now() - new Date(ticket.updated_at).getTime() < Number(age) * 86_400_000) return false;
        if (
          normalized &&
          !`${ticketReference(ticket)} ${ticket.ticket_number ?? ''} ${ticket.title} ${ticket.description} ${ticket.category} ${ticket.area} ${ticket.type} ${ticket.device ?? ''} ${ticket.entity_id ?? ''}`
            .toLowerCase()
            .includes(normalized)
        ) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === 'updated_asc') return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        if (sort === 'created_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sort === 'priority') {
          const byPriority = priorityWeight(b.priority) - priorityWeight(a.priority);
          return byPriority || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
  }, [tickets, query, scope, status, priority, area, category, assigned, age, sort]);

  const pageSize = preferences.ticketPageSize;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const pageTickets = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (requestedPage <= pageCount) return;
    const next = new URLSearchParams(searchParams);
    if (pageCount <= 1) next.delete('page');
    else next.set('page', String(pageCount));
    setSearchParams(next, { replace: true });
  }, [pageCount, requestedPage, searchParams, setSearchParams]);

  const activeFilterCount = [scope !== preferences.defaultTicketScope, status !== 'all', priority !== 'all', area !== 'all', category !== 'all', assigned !== 'all', age !== 'all'].filter(Boolean).length;
  const firstShown = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastShown = Math.min(page * pageSize, filtered.length);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5">
      <section className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-500">Ticket Center</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">Alle Anliegen im Blick</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {filtered.length === 0 ? 'Keine passenden Tickets.' : `${firstShown}–${lastShown} von ${filtered.length} Treffern`} · {tickets.length} insgesamt
          </p>
        </div>
        <Link to="/app/tickets/new" className="hidden sm:block"><Button><Plus size={17} />Neues Ticket</Button></Link>
      </section>

      <section className="ticket-toolbar sticky z-30 min-w-0 rounded-[24px] border border-white/70 bg-white/[0.92] p-2.5 shadow-card backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/[0.92] sm:rounded-3xl sm:p-3">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 md:flex md:items-center">
          <div className="relative col-span-2 min-w-0 flex-1 md:col-span-1">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(event) => setParam('q', event.target.value, '')} placeholder="Ticketnummer, Titel, Beschreibung, Gerät, Raum …" className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-10 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100/60 dark:border-slate-700 dark:bg-slate-950/50 dark:focus:ring-sky-950" />
            {query && <button onClick={() => setParam('q', '', '')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"><X size={14} /></button>}
          </div>

          <select value={scope} onChange={(event) => setParam('scope', event.target.value, preferences.defaultTicketScope)} className="filter-select min-w-0 w-full md:w-auto">
            <option value="all">Alle Tickets</option><option value="open">Nur offen</option><option value="closed">Nur abgeschlossen</option>
          </select>

          <select value={sort} onChange={(event) => setParam('sort', event.target.value, 'updated_desc')} className="filter-select col-span-2 min-w-0 w-full md:col-span-1 md:w-auto">
            <option value="updated_desc">Zuletzt geändert</option><option value="priority">Priorität zuerst</option><option value="created_desc">Neueste zuerst</option><option value="updated_asc">Älteste Aktivität</option>
          </select>

          <Button variant="secondary" className="w-full md:w-auto" onClick={() => setFiltersOpen((current) => !current)}>
            <SlidersHorizontal size={16} />Filter
            {activeFilterCount > 0 && <span className="rounded-full bg-sky-500 px-1.5 py-0.5 text-[10px] font-black text-white">{activeFilterCount}</span>}
          </Button>

          <Button variant="ghost" size="icon" className="shrink-0" onClick={toggleCompact} title="Darstellung wechseln"><LayoutList size={18} /></Button>
        </div>

        {filtersOpen && (
          <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800">
            <FilterSelect label="Status" value={status} onChange={(value) => setParam('status', value)}>
              <option value="all">Alle Status</option>{statusOptions.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}
            </FilterSelect>
            <FilterSelect label="Priorität" value={priority} onChange={(value) => setParam('priority', value)}>
              <option value="all">Alle Prioritäten</option>{priorityOptions.map((item) => <option key={item} value={item}>{priorityLabels[item]}</option>)}
            </FilterSelect>
            <FilterSelect label="Bereich" value={area} onChange={(value) => setParam('area', value)}>
              <option value="all">Alle Bereiche</option>{areas.map((item) => <option key={item}>{item}</option>)}
            </FilterSelect>
            <FilterSelect label="Kategorie" value={category} onChange={(value) => setParam('category', value)}>
              <option value="all">Alle Kategorien</option>{categories.map((item) => <option key={item}>{item}</option>)}
            </FilterSelect>
            <div className="flex justify-end sm:col-span-2 lg:col-span-4">
              <button onClick={resetFilters} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"><RotateCcw size={14} />Filter zurücksetzen</button>
            </div>
          </div>
        )}
      </section>

      {activeFilterCount > 0 && (
        <div className="no-scrollbar flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400"><Filter size={13} />Aktiv:</span>
          {scope !== preferences.defaultTicketScope && <FilterChip label={scope === 'open' ? 'Offen' : scope === 'closed' ? 'Abgeschlossen' : 'Alle'} onRemove={() => setParam('scope', preferences.defaultTicketScope, preferences.defaultTicketScope)} />}
          {status !== 'all' && <FilterChip label={statusLabels[status as keyof typeof statusLabels]} onRemove={() => setParam('status', 'all')} />}
          {priority !== 'all' && <FilterChip label={priorityLabels[priority as keyof typeof priorityLabels]} onRemove={() => setParam('priority', 'all')} />}
          {area !== 'all' && <FilterChip label={area} onRemove={() => setParam('area', 'all')} />}
          {category !== 'all' && <FilterChip label={category} onRemove={() => setParam('category', 'all')} />}
          {assigned === 'none' && <FilterChip label="Nicht zugewiesen" onRemove={() => setParam('assigned', 'all')} />}
          {assigned !== 'all' && assigned !== 'none' && <FilterChip label="Bearbeiter gefiltert" onRemove={() => setParam('assigned', 'all')} />}
          {age !== 'all' && <FilterChip label={`Seit ${age}+ Tagen ruhig`} onRemove={() => setParam('age', 'all')} />}
        </div>
      )}

      <div className={preferences.ticketDensity === 'compact' ? 'min-w-0 space-y-2' : 'min-w-0 space-y-2.5 sm:space-y-3'}>
        {filtered.length === 0 ? (
          <EmptyState title="Keine passenden Tickets" text="Passe Suche oder Filter an – oder erstelle direkt ein neues Ticket." action={<Button variant="secondary" onClick={resetFilters}><RotateCcw size={16} />Filter zurücksetzen</Button>} />
        ) : (
          pageTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} compact={preferences.ticketDensity === 'compact'} unread={unreadTicketIds.has(ticket.id)} />)
        )}
      </div>

      {filtered.length > pageSize && (
        <nav className="flex flex-col items-center justify-between gap-3 rounded-3xl border border-slate-200/70 bg-white/70 p-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 sm:flex-row" aria-label="Seitennavigation">
          <p className="px-2 text-xs font-semibold text-slate-500">Seite <strong className="text-slate-800 dark:text-slate-200">{page}</strong> von {pageCount}</p>
          <div className="flex items-center gap-1">
            <PageButton disabled={page <= 1} onClick={() => setParam('page', String(page - 1), '1')} ariaLabel="Vorherige Seite"><ChevronLeft size={16} /></PageButton>
            <span className="min-w-16 text-center text-xs font-black text-slate-700 dark:text-slate-200 sm:hidden">{page} / {pageCount}</span>
            <span className="hidden items-center gap-1 sm:flex">{pageNumbers(page, pageCount).map((item, index) => item === '…' ? <span key={`ellipsis-${index}`} className="px-1 text-slate-400">…</span> : <button key={item} onClick={() => setParam('page', String(item), '1')} className={`h-9 min-w-9 rounded-xl px-2 text-xs font-bold transition ${item === page ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>{item}</button>)}</span>
            <PageButton disabled={page >= pageCount} onClick={() => setParam('page', String(page + 1), '1')} ariaLabel="Nächste Seite"><ChevronRight size={16} /></PageButton>
          </div>
        </nav>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <label><span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="filter-select w-full">{children}</select></label>;
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return <button onClick={onRemove} className="flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 ring-1 ring-sky-100 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900">{label}<X size={12} /></button>;
}

function PageButton({ disabled, onClick, ariaLabel, children }: { disabled: boolean; onClick: () => void; ariaLabel: string; children: React.ReactNode }) {
  return <button disabled={disabled} onClick={onClick} aria-label={ariaLabel} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800">{children}</button>;
}

function pageNumbers(page: number, pageCount: number): Array<number | '…'> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, '…', pageCount];
  if (page >= pageCount - 3) return [1, '…', pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1, pageCount];
  return [1, '…', page - 1, page, page + 1, '…', pageCount];
}
