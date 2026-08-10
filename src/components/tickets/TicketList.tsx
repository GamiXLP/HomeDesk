import { Filter, LayoutList, Plus, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Ticket } from '../../types/database';
import { areas, categories, priorityLabels, priorityOptions, statusLabels, statusOptions } from '../../constants/tickets';
import { isTicketOpen, priorityWeight } from '../../utils/tickets';
import { EmptyState } from '../ui/States';
import { Button } from '../ui/Button';
import { TicketCard } from './TicketCard';

type SortMode = 'updated_desc' | 'updated_asc' | 'priority' | 'created_desc';

export function TicketList({ tickets }: { tickets: Ticket[] }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [compact, setCompact] = useState(() => localStorage.getItem('homedesk-ticket-density') === 'compact');

  const query = searchParams.get('q') ?? '';
  const scope = searchParams.get('scope') ?? 'all';
  const status = searchParams.get('status') ?? 'all';
  const priority = searchParams.get('priority') ?? 'all';
  const area = searchParams.get('area') ?? 'all';
  const category = searchParams.get('category') ?? 'all';
  const sort = (searchParams.get('sort') ?? 'updated_desc') as SortMode;

  function setParam(key: string, value: string, defaultValue = 'all') {
    const next = new URLSearchParams(searchParams);
    if (!value || value === defaultValue) next.delete(key);
    else next.set(key, value);
    setSearchParams(next, { replace: true });
  }

  function resetFilters() {
    setSearchParams({}, { replace: true });
  }

  function toggleCompact() {
    const next = !compact;
    setCompact(next);
    localStorage.setItem('homedesk-ticket-density', next ? 'compact' : 'comfortable');
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
        if (
          normalized &&
          !`${ticket.title} ${ticket.description} ${ticket.category} ${ticket.area} ${ticket.type} ${ticket.device ?? ''} ${ticket.entity_id ?? ''}`
            .toLowerCase()
            .includes(normalized)
        )
          return false;
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
  }, [tickets, query, scope, status, priority, area, category, sort]);

  const activeFilterCount = [scope !== 'all', status !== 'all', priority !== 'all', area !== 'all', category !== 'all'].filter(Boolean).length;

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-500">Ticket Center</p>
          <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Alle Anliegen im Blick</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {filtered.length} von {tickets.length} Tickets werden angezeigt.
          </p>
        </div>
        <Link to="/app/tickets/new">
          <Button>
            <Plus size={17} />
            Neues Ticket
          </Button>
        </Link>
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/85 p-3 shadow-card backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative min-w-0 flex-1">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setParam('q', event.target.value, '')}
              placeholder="Titel, Beschreibung, Gerät, Raum …"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-10 text-sm outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100/60 dark:border-slate-700 dark:bg-slate-950/50 dark:focus:ring-sky-950"
            />
            {query && (
              <button
                onClick={() => setParam('q', '', '')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select value={scope} onChange={(event) => setParam('scope', event.target.value)} className="filter-select">
            <option value="all">Alle Tickets</option>
            <option value="open">Nur offen</option>
            <option value="closed">Nur abgeschlossen</option>
          </select>

          <select value={sort} onChange={(event) => setParam('sort', event.target.value, 'updated_desc')} className="filter-select">
            <option value="updated_desc">Zuletzt geändert</option>
            <option value="priority">Priorität zuerst</option>
            <option value="created_desc">Neueste zuerst</option>
            <option value="updated_asc">Älteste Aktivität</option>
          </select>

          <Button variant="secondary" onClick={() => setFiltersOpen((current) => !current)}>
            <SlidersHorizontal size={16} />
            Filter
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-sky-500 px-1.5 py-0.5 text-[10px] font-black text-white">{activeFilterCount}</span>
            )}
          </Button>

          <Button variant="ghost" size="icon" onClick={toggleCompact} title="Darstellung wechseln">
            <LayoutList size={18} />
          </Button>
        </div>

        {filtersOpen && (
          <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800">
            <FilterSelect label="Status" value={status} onChange={(value) => setParam('status', value)}>
              <option value="all">Alle Status</option>
              {statusOptions.map((item) => (
                <option key={item} value={item}>{statusLabels[item]}</option>
              ))}
            </FilterSelect>

            <FilterSelect label="Priorität" value={priority} onChange={(value) => setParam('priority', value)}>
              <option value="all">Alle Prioritäten</option>
              {priorityOptions.map((item) => (
                <option key={item} value={item}>{priorityLabels[item]}</option>
              ))}
            </FilterSelect>

            <FilterSelect label="Bereich" value={area} onChange={(value) => setParam('area', value)}>
              <option value="all">Alle Bereiche</option>
              {areas.map((item) => <option key={item}>{item}</option>)}
            </FilterSelect>

            <FilterSelect label="Kategorie" value={category} onChange={(value) => setParam('category', value)}>
              <option value="all">Alle Kategorien</option>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </FilterSelect>

            <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
              <button onClick={resetFilters} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white">
                <RotateCcw size={14} /> Filter zurücksetzen
              </button>
            </div>
          </div>
        )}
      </section>

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400"><Filter size={13} /> Aktiv:</span>
          {scope !== 'all' && <FilterChip label={scope === 'open' ? 'Offen' : 'Abgeschlossen'} onRemove={() => setParam('scope', 'all')} />}
          {status !== 'all' && <FilterChip label={statusLabels[status as keyof typeof statusLabels]} onRemove={() => setParam('status', 'all')} />}
          {priority !== 'all' && <FilterChip label={priorityLabels[priority as keyof typeof priorityLabels]} onRemove={() => setParam('priority', 'all')} />}
          {area !== 'all' && <FilterChip label={area} onRemove={() => setParam('area', 'all')} />}
          {category !== 'all' && <FilterChip label={category} onRemove={() => setParam('category', 'all')} />}
        </div>
      )}

      <div className={compact ? 'space-y-2' : 'space-y-3'}>
        {filtered.length === 0 ? (
          <EmptyState
            title="Keine passenden Tickets"
            text="Passe Suche oder Filter an – oder erstelle direkt ein neues Ticket."
            action={
              <Button variant="secondary" onClick={resetFilters}>
                <RotateCcw size={16} /> Filter zurücksetzen
              </Button>
            }
          />
        ) : (
          filtered.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} compact={compact} />)
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="filter-select w-full">
        {children}
      </select>
    </label>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button onClick={onRemove} className="flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 ring-1 ring-sky-100 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900">
      {label}<X size={12} />
    </button>
  );
}
