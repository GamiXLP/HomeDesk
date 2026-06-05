import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
export function ForgotPasswordPage(){const[email,setEmail]=useState(''); const[msg,setMsg]=useState(''); async function submit(e:React.FormEvent){e.preventDefault(); const {error}=await supabase.auth.resetPasswordForEmail(email); setMsg(error?error.message:'Wenn die Adresse existiert, wurde eine Reset-Mail gesendet.');} return <main className="flex min-h-screen items-center justify-center p-4"><Card className="w-full max-w-md p-6"><h1 className="text-xl font-bold">Passwort zurücksetzen</h1><form onSubmit={submit} className="mt-4 space-y-3"><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full rounded-xl border border-ha-border px-4 py-2" placeholder="E-Mail"/><Button>Reset-Link senden</Button>{msg&&<p className="text-sm text-slate-500">{msg}</p>}</form></Card></main>}
