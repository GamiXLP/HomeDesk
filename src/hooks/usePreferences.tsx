import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type TicketDensity = 'comfortable' | 'compact';
export type DefaultTicketScope = 'all' | 'open' | 'closed';
export type TicketPageSize = 10 | 20 | 40;
export type DashboardRecentCount = 4 | 6 | 8;

export type HomeDeskPreferences = {
  ticketDensity: TicketDensity;
  defaultTicketScope: DefaultTicketScope;
  ticketPageSize: TicketPageSize;
  dashboardRecentCount: DashboardRecentCount;
  showArchivedOnDashboard: boolean;
};

type PreferencesContextValue = {
  preferences: HomeDeskPreferences;
  updatePreferences: (patch: Partial<HomeDeskPreferences>) => void;
  resetPreferences: () => void;
};

const STORAGE_KEY = 'homedesk-preferences-v2';

const defaults: HomeDeskPreferences = {
  ticketDensity: 'comfortable',
  defaultTicketScope: 'all',
  ticketPageSize: 20,
  dashboardRecentCount: 6,
  showArchivedOnDashboard: false,
};

function getInitialPreferences(): HomeDeskPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacyDensity = localStorage.getItem('homedesk-ticket-density');
      return {
        ...defaults,
        ticketDensity: legacyDensity === 'compact' ? 'compact' : 'comfortable',
      };
    }
    return { ...defaults, ...(JSON.parse(raw) as Partial<HomeDeskPreferences>) };
  } catch {
    return defaults;
  }
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<HomeDeskPreferences>(() => getInitialPreferences());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    localStorage.setItem('homedesk-ticket-density', preferences.ticketDensity);
  }, [preferences]);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      preferences,
      updatePreferences(patch) {
        setPreferences((current) => ({ ...current, ...patch }));
      },
      resetPreferences() {
        setPreferences(defaults);
      },
    }),
    [preferences],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used inside PreferencesProvider');
  return context;
}
