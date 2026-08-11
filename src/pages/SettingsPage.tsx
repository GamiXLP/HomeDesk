import { Check, Eye, Home, LayoutList, Laptop, Moon, Palette, RotateCcw, Save, SlidersHorizontal, Sun, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../hooks/useAuth';
import { usePreferences, type DashboardRecentCount, type DefaultTicketScope, type TicketPageSize } from '../hooks/usePreferences';
import { useTheme } from '../hooks/useTheme';
import { cn } from '../utils/cn';
import { HomeAssistantSettingsCard } from '../components/settings/HomeAssistantSettingsCard';

export function SettingsPage() {
  const { profile, user, updateDisplayName } = useAuth();
  const { theme, setTheme } = useTheme();
  const { preferences, updatePreferences, resetPreferences } = usePreferences();
  const { showToast } = useToast();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => setDisplayName(profile?.display_name ?? ''), [profile?.display_name]);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    try {
      setSaving(true);
      await updateDisplayName(displayName);
      showToast('Profil gespeichert', { message: 'Dein Anzeigename wurde aktualisiert.' });
    } catch (error) {
      showToast('Profil konnte nicht gespeichert werden', { message: error instanceof Error ? error.message : undefined, tone: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-w-0 space-y-5 sm:space-y-7">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-500">Persönlich</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">Einstellungen</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Passe HomeDesk an deinen Arbeitsstil und dein Gerät an.</p>
      </section>

      <div className="grid gap-6 xl:grid-cols-2 2xl:grid-cols-3">
        <Card className="p-4 sm:p-6 2xl:row-span-2">
          <SectionHeader icon={UserRound} title="Profil" text="So wirst du in HomeDesk angezeigt." tone="sky" />
          <form onSubmit={saveProfile} className="mt-6 space-y-4">
            <div><label className="field-label">Anzeigename</label><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="field-input mt-1" /></div>
            <div><label className="field-label">E-Mail</label><input value={user?.email ?? ''} readOnly className="field-input mt-1 cursor-not-allowed opacity-60" /></div>
            <div><label className="field-label">Rolle</label><input value={profile?.role === 'admin' ? 'Administrator' : 'Benutzer'} readOnly className="field-input mt-1 cursor-not-allowed opacity-60" /></div>
            <div className="flex justify-end pt-2"><Button disabled={saving}><Save size={16} />{saving ? 'Speichert …' : 'Speichern'}</Button></div>
          </form>
        </Card>

        <Card className="p-4 sm:p-6">
          <SectionHeader icon={Palette} title="Darstellung" text="Das Theme gilt auf diesem Gerät." tone="violet" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <ThemeChoice active={theme === 'light'} label="Hell" description="Klare, helle Oberfläche" icon={Sun} onClick={() => setTheme('light')} />
            <ThemeChoice active={theme === 'dark'} label="Dunkel" description="Angenehm bei wenig Licht" icon={Moon} onClick={() => setTheme('dark')} />
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <SectionHeader icon={LayoutList} title="Ticketdarstellung" text="Dichte und Anzahl pro Seite." tone="emerald" />
          <div className="mt-6 space-y-5">
            <SettingGroup label="Dichte">
              <Segmented value={preferences.ticketDensity} options={[['comfortable', 'Komfortabel'], ['compact', 'Kompakt']]} onChange={(value) => updatePreferences({ ticketDensity: value as 'comfortable' | 'compact' })} />
            </SettingGroup>
            <SettingGroup label="Tickets pro Seite">
              <Segmented value={String(preferences.ticketPageSize)} options={[[10, '10'], [20, '20'], [40, '40']]} onChange={(value) => updatePreferences({ ticketPageSize: Number(value) as TicketPageSize })} />
            </SettingGroup>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <SectionHeader icon={SlidersHorizontal} title="Arbeitsweise" text="Standardansichten und Dashboard." tone="orange" />
          <div className="mt-6 space-y-5">
            <label className="block">
              <span className="field-label">Ticket Center startet mit</span>
              <select className="field-input mt-1" value={preferences.defaultTicketScope} onChange={(event) => updatePreferences({ defaultTicketScope: event.target.value as DefaultTicketScope })}>
                <option value="all">Allen Tickets</option><option value="open">Offenen Tickets</option><option value="closed">Abgeschlossenen Tickets</option>
              </select>
            </label>
            <SettingGroup label="Letzte Aktivität im Dashboard">
              <Segmented value={String(preferences.dashboardRecentCount)} options={[[4, '4 Tickets'], [6, '6 Tickets'], [8, '8 Tickets']]} onChange={(value) => updatePreferences({ dashboardRecentCount: Number(value) as DashboardRecentCount })} />
            </SettingGroup>
            <ToggleRow label="Archivierte Tickets im Dashboard" text="Standardmäßig werden archivierte Tickets aus der letzten Aktivität ausgeblendet." checked={preferences.showArchivedOnDashboard} onChange={(checked) => updatePreferences({ showArchivedOnDashboard: checked })} />
          </div>
        </Card>

        <HomeAssistantSettingsCard />

        <Card className="p-4 sm:p-6">
          <SectionHeader icon={Laptop} title="Schnellzugriff" text="Shortcuts für den Alltag." tone="slate" />
          <div className="mt-6 space-y-3">
            <Shortcut keys="Strg + K" text="Globale Ticketsuche öffnen" />
            <Shortcut keys="/" text="Suche öffnen, wenn du nicht schreibst" />
            <Shortcut keys="Esc" text="Suche oder Benachrichtigungen schließen" />
          </div>
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/70">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100"><Eye size={17} />Lokal gespeichert</div>
            <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">Darstellungsoptionen werden im Browser gespeichert. Dein Anzeigename wird in Supabase gespeichert.</p>
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button variant="ghost" onClick={() => { resetPreferences(); showToast('Ansicht zurückgesetzt', { message: 'Die lokalen HomeDesk-Einstellungen wurden auf Standard gesetzt.', tone: 'info' }); }}><RotateCcw size={16} />Ansicht zurücksetzen</Button>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, text, tone }: { icon: typeof UserRound; title: string; text: string; tone: 'sky' | 'violet' | 'emerald' | 'orange' | 'slate' }) {
  const toneClass = { sky: 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300', violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300', emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300', orange: 'bg-orange-50 text-orange-600 dark:bg-orange-950/60 dark:text-orange-300', slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' }[tone];
  return <div className="flex items-center gap-3"><div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', toneClass)}><Icon size={20} /></div><div><h3 className="font-black text-slate-950 dark:text-white">{title}</h3><p className="text-xs text-slate-500">{text}</p></div></div>;
}

function ThemeChoice({ active, label, description, icon: Icon, onClick }: { active: boolean; label: string; description: string; icon: typeof Sun; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={cn('rounded-2xl border p-4 text-left transition', active ? 'border-sky-300 bg-sky-50 ring-2 ring-sky-100 dark:border-sky-800 dark:bg-sky-950/40 dark:ring-sky-950' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600')}><div className="flex items-center justify-between"><Icon size={20} className={active ? 'text-sky-600 dark:text-sky-300' : 'text-slate-400'} />{active && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-white"><Check size={12} /></span>}</div><p className="mt-4 text-sm font-black text-slate-900 dark:text-white">{label}</p><p className="mt-1 text-xs text-slate-500">{description}</p></button>;
}

function SettingGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="field-label">{label}</p><div className="mt-2">{children}</div></div>;
}

function Segmented({ value, options, onChange }: { value: string; options: Array<[string | number, string]>; onChange: (value: string) => void }) {
  return <div className="flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">{options.map(([optionValue, label]) => <button key={String(optionValue)} type="button" onClick={() => onChange(String(optionValue))} className={cn('min-h-9 flex-1 rounded-xl px-2 text-xs font-bold transition', String(optionValue) === value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white')}>{label}</button>)}</div>;
}

function ToggleRow({ label, text, checked, onChange }: { label: string; text: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 p-4 text-left transition hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"><div className="min-w-0 flex-1"><p className="text-sm font-bold text-slate-900 dark:text-white">{label}</p><p className="mt-1 text-xs leading-5 text-slate-500">{text}</p></div><span className={cn('relative h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-sky-500' : 'bg-slate-200 dark:bg-slate-700')}><span className={cn('absolute top-1 h-4 w-4 rounded-full bg-white shadow transition', checked ? 'left-6' : 'left-1')} /></span></button>;
}

function Shortcut({ keys, text }: { keys: string; text: string }) {
  return <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 px-4 py-3 dark:border-slate-800"><span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{text}</span><kbd className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 font-mono text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">{keys}</kbd></div>;
}
