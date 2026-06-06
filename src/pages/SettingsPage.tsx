import { Card } from '../components/ui/Card';

export function SettingsPage() {
    return (
        <Card className="p-6">
            <h2 className="text-xl font-bold text-slate-950 dark:text-slate-100">Einstellungen</h2>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Im MVP sind Kategorien, Räume und Statuswerte statisch in{' '}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    src/constants/tickets.ts
                </code>{' '}
                definiert. Später können sie in die Tabelle{' '}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    settings
                </code>{' '}
                wandern.
            </p>
        </Card>
    );
}