import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'light' | 'dark';

type ThemeContextValue = {
    theme: Theme;
    isDark: boolean;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'homedesk-theme';

function getInitialTheme(): Theme {
    const storedTheme = localStorage.getItem(STORAGE_KEY);

    if (storedTheme === 'light' || storedTheme === 'dark') {
        return storedTheme;
    }

    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }

    return 'light';
}

function applyTheme(theme: Theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => getInitialTheme());

    useEffect(() => {
        applyTheme(theme);
        localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);

    function setTheme(nextTheme: Theme) {
        setThemeState(nextTheme);
    }

    function toggleTheme() {
        setThemeState((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
    }

    const value = useMemo<ThemeContextValue>(
        () => ({
            theme,
            isDark: theme === 'dark',
            toggleTheme,
            setTheme,
        }),
        [theme],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error('useTheme must be used inside ThemeProvider');
    }

    return context;
}