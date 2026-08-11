import { ArrowRight, Gauge, Home, LockKeyhole, Moon, Search, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';
import { startHomeAssistantAuthorization } from '../lib/homeAssistantAuth';

export function LoginPage() {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/app/dashboard" replace />;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      setLoading(true);
      setError('');
      await signIn(email, password);
      navigate('/app/dashboard');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Login fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 p-4 transition-colors dark:bg-slate-950 sm:p-8">
      <div className="absolute left-[-12%] top-[-28%] h-[48rem] w-[48rem] rounded-full bg-sky-400/25 blur-3xl dark:bg-sky-500/20" />
      <div className="absolute bottom-[-35%] right-[-10%] h-[52rem] w-[52rem] rounded-full bg-cyan-300/25 blur-3xl dark:bg-cyan-400/15" />
      <div className="absolute inset-0 opacity-[0.055] [background-image:linear-gradient(rgba(15,23,42,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,.18)_1px,transparent_1px)] [background-size:44px_44px] dark:opacity-[0.035] dark:[background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)]" />

      <div className="relative grid w-full max-w-[1180px] overflow-hidden rounded-[40px] border border-slate-200 bg-white/70 shadow-2xl shadow-slate-300/40 backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-white/[0.055] dark:shadow-black/30 lg:min-h-[650px] lg:grid-cols-[1.08fr_.92fr]">
        <section className="hidden flex-col justify-between p-12 text-slate-950 lg:flex dark:text-white xl:p-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-bold text-sky-700 dark:border-white/10 dark:bg-white/10 dark:text-sky-200">
              <Sparkles size={14} /> HomeDesk 2.1
            </div>
            <h1 className="mt-8 max-w-xl text-5xl font-black leading-[1.02] tracking-[-0.045em] xl:text-6xl">
              Der Helpdesk für dein vernetztes Zuhause.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-slate-600 dark:text-slate-300 xl:text-lg xl:leading-8">
              Probleme, Ideen, Automationen und Geräte zentral erfassen, priorisieren und nachvollziehbar lösen.
            </p>

            <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
              <Feature icon={Gauge} label="Schnell" text="Realtime & Cache" />
              <Feature icon={Search} label="Findbar" text="Globale Suche" />
              <Feature icon={Moon} label="Flexibel" text="Hell & Dunkel" />
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <LockKeyhole size={15} /> Geschützter Bereich · Supabase Authentication
          </div>
        </section>

        <div className="flex items-center p-2 sm:p-3 lg:p-4">
          <Card className="w-full border-0 bg-white p-7 shadow-none dark:bg-slate-900 sm:p-10 lg:p-11 xl:p-12">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-lg shadow-sky-500/20">
                <Home size={25} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sky-500">HomeDesk</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">Willkommen zurück</h2>
                <p className="mt-1 text-sm text-slate-500">Melde dich an, um deine Tickets zu öffnen.</p>
              </div>
            </div>

            <form onSubmit={submit} className="mt-9 space-y-5">
              <div>
                <label className="field-label">E-Mail</label>
                <input className="field-input mt-1.5 min-h-12" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoFocus />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="field-label">Passwort</label>
                  <Link to="/forgot-password" className="text-xs font-bold text-sky-600 hover:text-sky-500 dark:text-sky-300">Passwort vergessen?</Link>
                </div>
                <input className="field-input mt-1.5 min-h-12" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </div>
              {error && <p className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300">{error}</p>}
              <Button className="w-full" size="lg" disabled={loading}>
                {loading ? 'Anmeldung läuft …' : 'Einloggen'} {!loading && <ArrowRight size={17} />}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                oder
              </span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>

            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={async () => {
                try {
                  setError('');

                  await startHomeAssistantAuthorization();
                } catch (nextError) {
                  setError(
                    nextError instanceof Error
                      ? nextError.message
                      : 'Home-Assistant-Anmeldung konnte nicht gestartet werden.',
                  );
                }
              }}
            >
              <Home size={18} />
              Mit Home Assistant anmelden
            </Button>

            <p className="mt-6 text-center text-xs text-slate-400 lg:hidden">HomeDesk 2.1 · Smart Home Support</p>
          </Card>
        </div>
      </div>
    </main>
  );
}

function Feature({ icon: Icon, label, text }: { icon: typeof Gauge; label: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-3.5 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:shadow-none">
      <Icon size={17} className="text-sky-600 dark:text-sky-300" />
      <p className="mt-3 text-sm font-black text-slate-950 dark:text-white">{label}</p>
      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}
