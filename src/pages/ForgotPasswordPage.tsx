import { ArrowLeft, KeyRound } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { supabase } from '../lib/supabase';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` });
    setMessage(error ? error.message : 'Wenn die Adresse existiert, wurde eine Reset-Mail gesendet.');
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <Card className="w-full max-w-md p-7 sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300"><KeyRound size={22} /></div>
        <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-950 dark:text-white">Passwort zurücksetzen</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Gib deine E-Mail-Adresse ein. Du erhältst einen Link zum Zurücksetzen.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div><label className="field-label">E-Mail</label><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="field-input mt-1" placeholder="name@beispiel.de" /></div>
          <Button className="w-full" disabled={loading}>{loading ? 'Wird gesendet …' : 'Reset-Link senden'}</Button>
          {message && <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">{message}</p>}
        </form>
        <Link to="/login" className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft size={14} /> Zurück zum Login</Link>
      </Card>
    </main>
  );
}
