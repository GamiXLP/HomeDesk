import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export function LoginPage() {
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  if (user) return <Navigate to="/app/dashboard" replace/>;
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try { await signIn(email, password); navigate('/app/dashboard'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Login fehlgeschlagen'); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-ha-bg p-4"><Card className="w-full max-w-md p-8"><div className="mb-8 flex items-center gap-3"><div className="rounded-2xl bg-ha-blue p-3 text-white"><Home/></div><div><h1 className="text-2xl font-bold">HomeDesk</h1><p className="text-sm text-slate-500">Login für euer Smart-Home-Ticketsystem</p></div></div><form onSubmit={submit} className="space-y-4"><div><label className="text-sm font-medium">E-Mail</label><input className="mt-1 w-full rounded-xl border border-ha-border px-4 py-2 outline-none focus:border-ha-blue" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></div><div><label className="text-sm font-medium">Passwort</label><input className="mt-1 w-full rounded-xl border border-ha-border px-4 py-2 outline-none focus:border-ha-blue" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></div>{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<Button className="w-full">Einloggen</Button></form></Card></main>;
}
