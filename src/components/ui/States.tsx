import { Card } from './Card';
export function LoadingState() { return <Card className="p-6 text-sm text-slate-500">Lade HomeDesk …</Card>; }
export function EmptyState({ title = 'Aktuell gibt es keine offenen Smart-Home-Baustellen.', text }: { title?: string; text?: string }) { return <Card className="p-8 text-center"><h3 className="font-semibold text-slate-800">{title}</h3>{text && <p className="mt-2 text-sm text-slate-500">{text}</p>}</Card>; }
