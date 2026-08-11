import {
  CheckCircle2,
  Home,
  LoaderCircle,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import {
  clearHomeAssistantOAuthState,
  consumeHomeAssistantCallback,
  exchangeHomeAssistantCode,
  type HomeAssistantTokenExchangeResult,
} from '../lib/homeAssistantAuth';

type ExchangeState =
  | {
      status: 'loading';
    }
  | {
      status: 'success';
      data: HomeAssistantTokenExchangeResult;
    }
  | {
      status: 'error';
      error: string;
    };

export function HomeAssistantCallbackPage() {
  const callbackResult = useMemo(
    () =>
      consumeHomeAssistantCallback(
        window.location.search,
      ),
    [],
  );

  const [exchangeState, setExchangeState] =
    useState<ExchangeState>({
      status: 'loading',
    });

  const exchangeStarted = useRef(false);

  useEffect(() => {
    if (exchangeStarted.current) {
      return;
    }

    exchangeStarted.current = true;

    if (!callbackResult.ok) {
      clearHomeAssistantOAuthState();

      setExchangeState({
        status: 'error',
        error: callbackResult.error,
      });

      return;
    }

    const exchange = async () => {
      try {
        const result =
          await exchangeHomeAssistantCode(
            callbackResult.code,
          );

        setExchangeState({
          status: 'success',
          data: result,
        });
      } catch (error) {
        setExchangeState({
          status: 'error',
          error:
            error instanceof Error
              ? error.message
              : 'Der Home-Assistant-Token konnte nicht erstellt werden.',
        });
      } finally {
        clearHomeAssistantOAuthState();
      }
    };

    void exchange();
  }, [callbackResult]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 p-4 transition-colors dark:bg-slate-950 sm:p-8">
      <div className="absolute left-[-15%] top-[-30%] h-[42rem] w-[42rem] rounded-full bg-sky-400/20 blur-3xl dark:bg-sky-500/15" />
      <div className="absolute bottom-[-30%] right-[-15%] h-[44rem] w-[44rem] rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-400/10" />

      <Card className="relative w-full max-w-lg p-7 shadow-2xl sm:p-10">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-gradient-to-br from-sky-500 to-cyan-400 text-white shadow-lg shadow-sky-500/20">
            <Home size={25} />
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sky-500">
              HomeDesk 2.4
            </p>

            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              Home Assistant
            </h1>
          </div>
        </div>

        {exchangeState.status === 'loading' && (
          <div className="mt-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-300">
              <LoaderCircle
                size={28}
                className="animate-spin"
              />
            </div>

            <h2 className="mt-5 text-xl font-black text-slate-950 dark:text-white">
              Verbindung wird hergestellt
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              HomeDesk tauscht den
              Autorisierungscode sicher gegen einen
              Home-Assistant-Zugang aus.
            </p>
          </div>
        )}

        {exchangeState.status === 'success' && (
          <div className="mt-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
              <CheckCircle2 size={28} />
            </div>

            <h2 className="mt-5 text-xl font-black text-slate-950 dark:text-white">
              Verbindung erfolgreich
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              HomeDesk konnte einen gültigen
              Home-Assistant-Zugang erstellen und
              die API erfolgreich erreichen.
            </p>

            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
              <div className="flex gap-3">
                <ShieldCheck
                  size={19}
                  className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-300"
                />

                <div className="text-sm">
                  <p className="font-bold text-emerald-900 dark:text-emerald-200">
                    Home Assistant API verbunden
                  </p>

                  <p className="mt-1 text-emerald-700 dark:text-emerald-300">
                    {exchangeState.data.apiMessage}
                  </p>

                  {exchangeState.data.expiresIn && (
                    <p className="mt-2 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                      Access Token gültig für{' '}
                      {Math.round(
                        exchangeState.data
                          .expiresIn / 60,
                      )}{' '}
                      Minuten
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm leading-6 text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/50 dark:text-sky-200">
              Noch werden keine Tokens dauerhaft
              gespeichert. Das machen wir erst im
              nächsten Schritt.
            </div>
          </div>
        )}

        {exchangeState.status === 'error' && (
          <div className="mt-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300">
              <XCircle size={28} />
            </div>

            <h2 className="mt-5 text-xl font-black text-slate-950 dark:text-white">
              Verbindung fehlgeschlagen
            </h2>

            <p className="mt-2 text-sm leading-6 text-red-600 dark:text-red-300">
              {exchangeState.error}
            </p>
          </div>
        )}

        <Link
          to="/login"
          className="mt-8 block"
        >
          <Button
            className="w-full"
            variant="secondary"
          >
            Zurück zur Anmeldung
          </Button>
        </Link>
      </Card>
    </main>
  );
}
