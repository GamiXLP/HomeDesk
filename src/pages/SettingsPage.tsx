import { Check, Laptop, Moon, Palette, Save, Sun, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { cn } from '../utils/cn';

export function SettingsPage() {
  const { profile, user, updateDisplayName } = useAuth();
  const { theme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => setDisplayName(profile?.display_name ?? ''), [profile?.display_name]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    try {
      setSaving(true);
      setMessage('');
      await updateDisplayName(displayName);
      setMessage('Profil gespeichert.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Profil konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-7">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-500">Persönlich</p>
        <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Einstellungen</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Passe HomeDesk an deinen Arbeitsstil an.</p>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300"><UserRound size={20} /></div>
            <div>
              <h3 className="font-black text-slate-950 dark:text-white">Profil</h3>
              <p className="text-xs text-slate-500">So wirst du in HomeDesk angezeigt.</p>
            </div>
          </div>

          <form onSubmit={saveProfile} className="mt-6 space-y-4">
            <div>
              <label className="field-label">Anzeigename</label>
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="field-input mt-1" />
            </div>
            <div>
              <label className="field-label">E-Mail</label>
              <input value={user?.email ?? ''} readOnly className="field-input mt-1 cursor-not-allowed opacity-60" />
            </div>
            <div>
              <label className="field-label">Rolle</label>
              <input value={profile?.role === 'admin' ? 'Administrator' : 'Benutzer'} readOnly className="field-input mt-1 cursor-not-allowed opacity-60" />
            </div>
            <div className="flex items-center justify-between gap-3 pt-2">
              <p className={cn('text-xs font-semibold', message.includes('gespeichert') ? 'text-emerald-600' : 'text-red-500')}>
                {message && <span className="inline-flex items-center gap-1">{message.includes('gespeichert') && <Check size={13} />}{message}</span>}
              </p>
              <Button disabled={saving}><Save size={16} /> {saving ? 'Speichert …' : 'Speichern'}</Button>
            </div>
          </form>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300"><Palette size={20} /></div>
            <div>
              <h3 className="font-black text-slate-950 dark:text-white">Darstellung</h3>
              <p className="text-xs text-slate-500">Das Theme wird lokal auf diesem Gerät gespeichert.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <ThemeChoice active={theme === 'light'} label="Hell" description="Klare helle Oberfläche" icon={Sun} onClick={() => setTheme('light')} />
            <ThemeChoice active={theme === 'dark'} label="Dunkel" description="Angenehm bei wenig Licht" icon={Moon} onClick={() => setTheme('dark')} />
          </div>

          <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100"><Laptop size={17} /> Tipp</div>
            <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">Mit <strong>Strg + K</strong> öffnest du überall die globale Ticketsuche. Mit <strong>/</strong> funktioniert es ebenfalls, solange du nicht gerade in einem Eingabefeld schreibst.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ThemeChoice({ active, label, description, icon: Icon, onClick }: { active: boolean; label: string; description: string; icon: typeof Sun; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn('rounded-2xl border p-4 text-left transition', active ? 'border-sky-300 bg-sky-50 ring-2 ring-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:ring-sky-950' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600')}>
      <div className="flex items-center justify-between"><Icon size={20} className={active ? 'text-sky-600 dark:text-sky-300' : 'text-slate-400'} />{active && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-white"><Check size={12} /></span>}</div>
      <p className="mt-4 text-sm font-black text-slate-900 dark:text-white">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </button>
  );
}
