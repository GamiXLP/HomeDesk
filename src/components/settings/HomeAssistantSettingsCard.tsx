import {
  CheckCircle2,
  Home,
  LoaderCircle,
  RefreshCw,
  Unlink,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import {
  disconnectHomeAssistantIdentity,
  getHomeAssistantIdentity,
  type HomeAssistantIdentityStatus,
} from '../../lib/homeAssistantIdentity';
import {
  startHomeAssistantAuthorization,
} from '../../lib/homeAssistantAuth';

type LoadState =
  | {
      status: 'loading';
    }
  | {
      status: 'ready';
      data: HomeAssistantIdentityStatus;
    }
  | {
      status: 'error';
      error: string;
    };

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(
    'de-DE',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(date);
}

export function HomeAssistantSettingsCard() {
  const [state, setState] =
    useState<LoadState>({
      status: 'loading',
    });

  const [disconnecting, setDisconnecting] =
    useState(false);

  const load = useCallback(async () => {
    setState({
      status: 'loading',
    });

    try {
      const result =
        await getHomeAssistantIdentity();

      setState({
        status: 'ready',
        data: result,
      });
    } catch (error) {
      setState({
        status: 'error',
        error:
          error instanceof Error
            ? error.message
            : 'Verknüpfung konnte nicht geladen werden.',
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const disconnect = async () => {
    const confirmed = window.confirm(
      'Möchtest du die Verbindung mit Home Assistant wirklich trennen?',
    );

    if (!confirmed) {
      return;
    }

    try {
      setDisconnecting(true);

      await disconnectHomeAssistantIdentity();

      await load();
    } catch (error) {
      setState({
        status: 'error',
        error:
          error instanceof Error
            ? error.message
            : 'Verknüpfung konnte nicht getrennt werden.',
      });
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300">
          <Home size={18} />
        </div>

        <div>
          <p className="font-black text-slate-950 dark:text-white">
            Home Assistant
          </p>

          <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Verbinde dein HomeDesk-Konto mit deinem
            Home-Assistant-Benutzer.
          </p>
        </div>
      </div>

      {state.status === 'loading' && (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <LoaderCircle
            size={19}
            className="animate-spin text-sky-500"
          />

          <p className="text-sm text-slate-600 dark:text-slate-300">
            Verbindung wird geprüft …
          </p>
        </div>
      )}

      {state.status === 'error' && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
          <p className="text-sm font-bold text-red-700 dark:text-red-300">
            Status konnte nicht geladen werden
          </p>

          <p className="mt-1 text-xs leading-5 text-red-600 dark:text-red-400">
            {state.error}
          </p>

          <Button
            type="button"
            variant="secondary"
            className="mt-4"
            onClick={() => void load()}
          >
            <RefreshCw size={16} />
            Erneut versuchen
          </Button>
        </div>
      )}

      {state.status === 'ready' &&
        !state.data.linked && (
          <>
            <div className="mt-6 rounded-2xl border border-sky-100 bg-sky-50 p-4 dark:border-sky-900/60 dark:bg-sky-950/30">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Noch nicht verbunden
              </p>

              <p className="mt-1.5 text-xs leading-5 text-slate-600 dark:text-slate-300">
                Verknüpfe deinen
                Home-Assistant-Benutzer einmalig
                mit diesem HomeDesk-Konto.
              </p>

              <Button
                type="button"
                className="mt-4 w-full sm:w-auto"
                onClick={() =>
                  startHomeAssistantAuthorization(
                    'link',
                  )
                }
              >
                <Home size={16} />
                Konto verknüpfen
              </Button>
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Dein Home-Assistant-Passwort wird
              niemals an HomeDesk übertragen.
            </p>
          </>
        )}

      {state.status === 'ready' &&
        state.data.linked &&
        state.data.identity && (
          <>
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/70 dark:bg-emerald-950/30">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-300">
                  <CheckCircle2 size={20} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-emerald-950 dark:text-emerald-100">
                      Verbunden
                    </p>

                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                      Aktiv
                    </span>
                  </div>

                  <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">
                    {state.data.identity.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    Mit diesem HomeDesk-Konto
                    verknüpft
                  </p>

                  {formatDate(
                    state.data.identity.lastLoginAt,
                  ) && (
                    <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                      Verknüpft / bestätigt:{' '}
                      {formatDate(
                        state.data.identity
                          .lastLoginAt,
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="sm:flex-1"
                onClick={() =>
                  startHomeAssistantAuthorization(
                    'link',
                  )
                }
              >
                <RefreshCw size={16} />
                Konto wechseln
              </Button>

              <Button
                type="button"
                variant="secondary"
                className="sm:flex-1"
                disabled={disconnecting}
                onClick={() =>
                  void disconnect()
                }
              >
                {disconnecting ? (
                  <LoaderCircle
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Unlink size={16} />
                )}

                Verknüpfung trennen
              </Button>
            </div>

            <p className="mt-4 break-all text-[10px] text-slate-400 dark:text-slate-500">
              HA-ID:{' '}
              {state.data.identity.userId}
            </p>
          </>
        )}
    </Card>
  );
}
