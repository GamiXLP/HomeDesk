import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export function ThemeToggle() {
    const { isDark, toggleTheme } = useTheme();

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-ha-border bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            title={isDark ? 'Lightmode aktivieren' : 'Darkmode aktivieren'}
            aria-label={isDark ? 'Lightmode aktivieren' : 'Darkmode aktivieren'}
        >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
    );
}