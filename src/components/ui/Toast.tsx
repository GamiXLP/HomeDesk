import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { cn } from '../../utils/cn';

type ToastTone = 'success' | 'error' | 'info';
type ToastItem = { id: number; title: string; message?: string; tone: ToastTone };

type ToastContextValue = {
  showToast: (title: string, options?: { message?: string; tone?: ToastTone }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const remove = useCallback((id: number) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback((title: string, options?: { message?: string; tone?: ToastTone }) => {
    const id = nextId.current++;
    const toast: ToastItem = {
      id,
      title,
      message: options?.message,
      tone: options?.tone ?? 'success',
    };
    setToasts((items) => [...items.slice(-2), toast]);
    window.setTimeout(() => remove(id), 4200);
  }, [remove]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 bottom-24 z-[160] flex flex-col items-end gap-2 sm:bottom-5 sm:left-auto sm:right-5 sm:w-[390px]">
        {toasts.map((toast) => {
          const Icon = toast.tone === 'success' ? CheckCircle2 : toast.tone === 'error' ? TriangleAlert : Info;
          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex w-full items-start gap-3 rounded-2xl border border-white/70 bg-white/95 p-4 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95"
              role="status"
            >
              <div className={cn(
                'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                toast.tone === 'success' && 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-300',
                toast.tone === 'error' && 'bg-red-50 text-red-600 dark:bg-red-950/70 dark:text-red-300',
                toast.tone === 'info' && 'bg-sky-50 text-sky-600 dark:bg-sky-950/70 dark:text-sky-300',
              )}>
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-slate-950 dark:text-white">{toast.title}</p>
                {toast.message && <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{toast.message}</p>}
              </div>
              <button type="button" onClick={() => remove(toast.id)} className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Hinweis schließen">
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
