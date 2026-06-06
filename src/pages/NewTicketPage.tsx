import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { areas, categories, priorityLabels, priorityOptions, ticketTypes } from '../constants/tickets';
import { useAuth } from '../hooks/useAuth';
import { createTicket, typed } from '../lib/tickets';

export function NewTicketPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'Home Assistant',
    area: 'Allgemein',
    priority: 'normal',
    type: 'Problem',
    device: '',
    entity_id: '',
    desired_date: '',
  });

  const [error, setError] = useState('');

  function update(key: string, value: string) {
    setForm((currentForm) => ({ ...currentForm, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (form.title.length < 5) return setError('Titel muss mindestens 5 Zeichen haben.');
    if (form.description.length < 10) return setError('Beschreibung muss mindestens 10 Zeichen haben.');
    if (!user) return;

    const ticket = await createTicket({
      title: form.title,
      description: form.description,
      category: form.category,
      area: form.area,
      type: form.type,
      priority: typed.priority(form.priority),
      created_by: user.id,
      device: form.device || null,
      entity_id: form.entity_id || null,
      desired_date: form.desired_date || null,
    });

    navigate(`/app/tickets/${ticket.id}`, {
      state: { message: 'Ticket ist angekommen.' },
    });
  }

  return (
      <Card className="p-6">
        <div className="mb-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">Neues Ticket</p>
          <h2 className="text-2xl font-bold text-slate-950 dark:text-slate-100">
            Was soll Gerhard als Nächstes fixen?
          </h2>
        </div>

        <form onSubmit={submit} className="grid gap-4 lg:grid-cols-2">
          <Field label="Titel" value={form.title} onChange={(value) => update('title', value)} required />

          <Select
              label="Typ"
              value={form.type}
              onChange={(value) => update('type', value)}
              options={[...ticketTypes]}
          />

          <div className="lg:col-span-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Beschreibung</label>
            <textarea
                className="mt-1 min-h-36 w-full rounded-xl border border-ha-border px-4 py-3 outline-none focus:border-ha-blue dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                value={form.description}
                onChange={(event) => update('description', event.target.value)}
                required
            />
          </div>

          <Select
              label="Kategorie"
              value={form.category}
              onChange={(value) => update('category', value)}
              options={[...categories]}
          />

          <Select
              label="Bereich / Raum"
              value={form.area}
              onChange={(value) => update('area', value)}
              options={[...areas]}
          />

          <Select
              label="Priorität"
              value={form.priority}
              onChange={(value) => update('priority', value)}
              options={priorityOptions.map((priority) => ({
                value: priority,
                label: priorityLabels[priority],
              }))}
          />

          <Field label="Gerät optional" value={form.device} onChange={(value) => update('device', value)} />

          <Field
              label="Home-Assistant Entity-ID optional"
              value={form.entity_id}
              onChange={(value) => update('entity_id', value)}
              placeholder="z. B. light.wohnzimmer"
          />

          <Field
              label="Wunschdatum optional"
              type="date"
              value={form.desired_date}
              onChange={(value) => update('desired_date', value)}
          />

          {error && (
              <p className="lg:col-span-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/60 dark:text-red-300">
                {error}
              </p>
          )}

          <div className="lg:col-span-2">
            <Button>Ticket erstellen</Button>
          </div>
        </form>
      </Card>
  );
}

function Field({
                 label,
                 value,
                 onChange,
                 type = 'text',
                 required,
                 placeholder,
               }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</label>
        <input
            type={type}
            required={required}
            placeholder={placeholder}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="mt-1 w-full rounded-xl border border-ha-border px-4 py-2 outline-none focus:border-ha-blue dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
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
        <label className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</label>
        <select
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="mt-1 w-full rounded-xl border border-ha-border bg-white px-4 py-2 outline-none focus:border-ha-blue dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          {options.map((option) =>
              typeof option === 'string' ? (
                  <option key={option}>{option}</option>
              ) : (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
              ),
          )}
        </select>
      </div>
  );
}