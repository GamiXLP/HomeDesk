import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';

export function AdminPage() {
    return (
        <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-6">
                <h2 className="text-xl font-bold text-slate-950 dark:text-slate-100">Admin-Bereich</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Alle Tickets, hohe Prioritäten, Benutzer und spätere Systemeinstellungen.
                </p>
            </Card>

            <Link to="/app/tickets">
                <Card className="p-6 transition hover:border-sky-200 dark:hover:border-sky-700">
                    <h3 className="font-bold text-slate-950 dark:text-slate-100">Alle Tickets öffnen</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Status, Priorität und Kommentare bearbeiten.
                    </p>
                </Card>
            </Link>

            <Card className="p-6">
                <h3 className="font-bold text-slate-950 dark:text-slate-100">Systemstatus</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Supabase + Netlify vorbereitet. Home-Assistant-Webhooks können später ergänzt werden.
                </p>
            </Card>
        </div>
    );
}