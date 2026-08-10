import { ArrowLeft, Check, Lightbulb, Save, Send, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import {
  areas,
  categories,
  priorityLabels,
  priorityOptions,
  ticketTemplates,
  ticketTypes,
} from '../constants/tickets';
import { useAuth } from '../hooks/useAuth';
import { createTicket, typed } from '../lib/tickets';
import type { TicketPriority } from '../types/database';

const DRAFT_KEY = 'homedesk-new-ticket-draft-v2';

const emptyForm = {
  title: '',
  description: '',
  category: 'Home Assistant',
  area: 'Allgemein',
  priority: 'normal',
  type: 'Problem',
  device: '',
  entity_id: '',
  desired_date: '',
};

export function NewTicketPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<typeof emptyForm>(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      const parsed = draft ? (JSON.parse(draft) as Partial<typeof emptyForm>) : {};
      return { ...emptyForm, ...parsed };
    } catch {
      return { ...emptyForm };
    }
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const hasContent = form.title.trim() || form.description.trim() || form.device.trim();
      if (hasContent) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
        setSaved(true);
        window.setTimeout(() => setSaved(false), 1300);
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [form]);

  const completion = useMemo(() => {
    let points = 0;
    if (form.title.trim().length >= 5) points += 35;
    if (form.description.trim().length >= 10) points += 35;
    if (form.area) points += 10;
    if (form.category) points += 10;
    if (form.type) points += 10;
    return points;
  }, [form]);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setError('');
  }

  function applyTemplate(template: (typeof ticketTemplates)[number]) {
    setForm((current) => ({
      ...current,
      type: template.type,
      category: template.category,
      priority: template.priority,
      description: current.description.trim() ? current.description : template.description,
    }));
  }

  function discardDraft() {
    localStorage.removeItem(DRAFT_KEY);
    setForm(emptyForm);
    setError('');
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');

    if (form.title.trim().length < 5) return setError('Der Titel muss mindestens 5 Zeichen haben.');
    if (form.description.trim().length < 10) return setError('Die Beschreibung muss mindestens 10 Zeichen haben.');
    if (!user || submitting) return;

    try {
      setSubmitting(true);
      const ticket = await createTicket({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        area: form.area,
        type: form.type,
        priority: typed.priority(form.priority),
        created_by: user.id,
        device: form.device.trim() || null,
        entity_id: form.entity_id.trim() || null,
        desired_date: form.desired_date || null,
      });

      localStorage.removeItem(DRAFT_KEY);
      navigate(`/app/tickets/${ticket.id}`, { state: { message: 'Ticket wurde erstellt.' } });
    } catch (nextError) {
      console.error(nextError);
      setError(nextError instanceof Error ? nextError.message : 'Ticket konnte nicht erstellt werden.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/app/tickets" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white">
          <ArrowLeft size={16} /> Zurück zu Tickets
        </Link>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          {saved ? <><Check size={14} className="text-emerald-500" /> Entwurf gespeichert</> : <><Save size={14} /> Automatisch gespeichert</>}
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 bg-gradient-to-r from-sky-50 to-cyan-50 px-6 py-6 dark:border-slate-800 dark:from-sky-950/30 dark:to-cyan-950/20 sm:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm dark:bg-slate-900 dark:text-sky-300">
                <Sparkles size={22} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-600 dark:text-sky-300">Neues Anliegen</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">Was soll verbessert werden?</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">Je genauer die Beschreibung, desto schneller lässt sich das Ticket später bearbeiten.</p>
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-6 p-6 sm:p-8">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                <Lightbulb size={14} /> Schnellvorlagen
              </div>
              <div className="flex flex-wrap gap-2">
                {ticketTemplates.map((template) => (
                  <button key={template.label} type="button" onClick={() => applyTemplate(template)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-sky-800 dark:hover:bg-sky-950/40 dark:hover:text-sky-300">
                    {template.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <Field label="Titel" value={form.title} onChange={(value) => update('title', value)} required placeholder="Kurz und eindeutig" hint={`${form.title.trim().length}/5 Mindestzeichen`} />
              <Select label="Typ" value={form.type} onChange={(value) => update('type', value)} options={[...ticketTypes]} />

              <div className="lg:col-span-2">
                <label className="field-label">Beschreibung</label>
                <textarea
                  className="field-input mt-1 min-h-48 resize-y py-3 leading-6"
                  value={form.description}
                  onChange={(event) => update('description', event.target.value)}
                  placeholder="Was ist der aktuelle Zustand, was soll passieren und wann tritt es auf?"
                  required
                />
                <div className="mt-1.5 flex justify-between gap-3 text-[11px] text-slate-400">
                  <span>Zeilenumbrüche und technische Details sind willkommen.</span>
                  <span>{form.description.trim().length} Zeichen</span>
                </div>
              </div>

              <Select label="Kategorie" value={form.category} onChange={(value) => update('category', value)} options={[...categories]} />
              <Select label="Bereich / Raum" value={form.area} onChange={(value) => update('area', value)} options={[...areas]} />
              <Select
                label="Priorität"
                value={form.priority}
                onChange={(value) => update('priority', value)}
                options={priorityOptions.map((priority) => ({ value: priority, label: priorityLabels[priority] }))}
              />
              <Field label="Gerät" value={form.device} onChange={(value) => update('device', value)} placeholder="Optional, z. B. Stehlampe" />
              <Field label="Home-Assistant Entity-ID" value={form.entity_id} onChange={(value) => update('entity_id', value)} placeholder="Optional, z. B. light.wohnzimmer" />
              <Field label="Wunschdatum" type="date" value={form.desired_date} onChange={(value) => update('desired_date', value)} />
            </div>

            {error && <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300">{error}</p>}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
              <Button type="button" variant="ghost" onClick={discardDraft}>
                <Trash2 size={16} /> Entwurf verwerfen
              </Button>
              <Button type="submit" size="lg" disabled={submitting}>
                <Send size={17} /> {submitting ? 'Wird erstellt …' : 'Ticket erstellen'}
              </Button>
            </div>
          </form>
        </Card>

        <aside className="space-y-4 xl:sticky xl:top-28 xl:h-fit">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-slate-900 dark:text-white">Vollständigkeit</p>
              <span className="text-sm font-black text-sky-600 dark:text-sky-300">{completion}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-300" style={{ width: `${completion}%` }} />
            </div>
            <ul className="mt-4 space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <Checklist ok={form.title.trim().length >= 5}>Aussagekräftiger Titel</Checklist>
              <Checklist ok={form.description.trim().length >= 10}>Beschreibung vorhanden</Checklist>
              <Checklist ok={Boolean(form.area)}>Bereich ausgewählt</Checklist>
              <Checklist ok={Boolean(form.category)}>Kategorie ausgewählt</Checklist>
            </ul>
          </Card>

          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Vorschau</p>
            <h3 className="mt-2 line-clamp-2 text-lg font-black text-slate-950 dark:text-white">{form.title.trim() || 'Dein Ticket-Titel'}</h3>
            <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-sm leading-6 text-slate-500 dark:text-slate-400">{form.description.trim() || 'Hier erscheint eine Vorschau deiner Beschreibung.'}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">{form.area}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">{form.category}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">{priorityLabels[form.priority as TicketPriority]}</span>
            </div>
          </Card>
        </aside>
      </section>
    </div>
  );
}

function Checklist({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <li className="flex items-center gap-2"><span className={`flex h-4 w-4 items-center justify-center rounded-full ${ok ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300 dark:bg-slate-800'}`}>{ok && <Check size={10} />}</span>{children}</li>;
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <input type={type} required={required} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} className="field-input mt-1" />
      {hint && <p className="mt-1.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: (string | { value: string; label: string })[];
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="field-input mt-1">
        {options.map((option) =>
          typeof option === 'string' ? <option key={option}>{option}</option> : <option key={option.value} value={option.value}>{option.label}</option>,
        )}
      </select>
    </div>
  );
}
