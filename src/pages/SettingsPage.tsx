import { Card } from '../components/ui/Card';
export function SettingsPage(){return <Card className="p-6"><h2 className="text-xl font-bold">Einstellungen</h2><p className="mt-2 text-sm text-slate-500">Im MVP sind Kategorien, Räume und Statuswerte statisch in <code>src/constants/tickets.ts</code> definiert. Später können sie in die Tabelle <code>settings</code> wandern.</p></Card>}
