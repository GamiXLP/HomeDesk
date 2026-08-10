import { ArrowRight, Home, LockKeyhole, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';

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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4">
      <div className="absolute left-[-15%] top-[-20%] h-[36rem] w-[36rem] rounded-full bg-sky-500/20 blur-3xl" />
      <div className="absolute bottom-[-25%] right-[-10%] h-[40rem] w-[40rem] rounded-full bg-cyan-400/15 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[36px] border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl lg:grid-cols-[1.05fr_.95fr]">
        <section className="hidden flex-col justify-between p-10 text-white lg:flex">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-sky-200"><Sparkles size={14} /> HomeDesk 2.0</div>
            <h1 className="mt-6 max-w-md text-5xl font-black tracking-tight">Dein Smart Home verdient einen besseren Helpdesk.</h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-300">Tickets, Ideen, Automationen und Geräteprobleme zentral erfassen und nachvollziehbar lösen.</p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold text-slate-400"><LockKeyhole size={15} /> Geschützter Bereich · Supabase Authentication</div>
        </section>

        <Card className="m-2 border-0 bg-white p-7 shadow-none dark:bg-slate-900 sm:p-9 lg:m-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-lg shadow-sky-500/20"><Home size={22} /></div>
            <div><h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">Willkommen zurück</h2><p className="text-sm text-slate-500">Bei HomeDesk anmelden</p></div>
          </div>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <div><label className="field-label">E-Mail</label><input className="field-input mt-1" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
            <div><div className="flex items-center justify-between"><label className="field-label">Passwort</label><Link to="/forgot-password" className="text-xs font-bold text-sky-600 hover:text-sky-500 dark:text-sky-300">Vergessen?</Link></div><input className="field-input mt-1" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
            {error && <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300">{error}</p>}
            <Button className="w-full" size="lg" disabled={loading}>{loading ? 'Anmeldung läuft …' : 'Einloggen'} {!loading && <ArrowRight size={17} />}</Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
