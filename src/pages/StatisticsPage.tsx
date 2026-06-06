import { useEffect, useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card } from '../components/ui/Card';
import { getTickets } from '../lib/tickets';
import type { Ticket } from '../types/database';

export function StatisticsPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);

    useEffect(() => {
        getTickets().then(setTickets);
    }, []);

    const data = useMemo(
        () =>
            Object.entries(
                tickets.reduce<Record<string, number>>((acc, ticket) => {
                    acc[ticket.category] = (acc[ticket.category] || 0) + 1;
                    return acc;
                }, {}),
            ).map(([name, value]) => ({ name, value })),
        [tickets],
    );

    return (
        <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
                <Stat label="Tickets gesamt" value={tickets.length} />
                <Stat label="Offen" value={tickets.filter((ticket) => !['done', 'archived', 'rejected'].includes(ticket.status)).length} />
                <Stat label="Erledigt" value={tickets.filter((ticket) => ticket.status === 'done').length} />
            </div>

            <Card className="p-6">
                <h2 className="mb-4 text-lg font-bold text-slate-950 dark:text-slate-100">Tickets nach Kategorie</h2>

                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={data} dataKey="value" nameKey="name" outerRadius={110} label>
                                {data.map((_, index) => (
                                    <Cell key={index} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    background: 'rgb(15 23 42)',
                                    border: '1px solid rgb(51 65 85)',
                                    borderRadius: '12px',
                                    color: 'white',
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: number }) {
    return (
        <Card className="p-5">
            <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
        </Card>
    );
}