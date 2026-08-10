import { Component, type ErrorInfo, type ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Button } from './Button';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('HomeDesk render error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5 dark:bg-slate-950">
        <div className="w-full max-w-lg rounded-[30px] border border-red-200 bg-white p-7 shadow-2xl dark:border-red-900 dark:bg-slate-900">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/70 dark:text-red-300">
            <TriangleAlert size={23} />
          </div>
          <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-950 dark:text-white">HomeDesk konnte diese Ansicht nicht laden.</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Die Anwendung ist nicht verloren. Lade die Seite neu. Falls der Fehler erneut auftritt, hilft die Browser-Konsole bei der Diagnose.</p>
          <p className="mt-4 rounded-2xl bg-slate-50 p-3 font-mono text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">{this.state.error.message}</p>
          <Button className="mt-5" onClick={() => window.location.reload()}>Seite neu laden</Button>
        </div>
      </main>
    );
  }
}
