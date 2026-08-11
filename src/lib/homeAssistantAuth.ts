import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { supabase } from './supabase';

const HOME_ASSISTANT_URL = import.meta.env.VITE_HOME_ASSISTANT_URL?.replace(/\/+$/, '');

const PUBLIC_APP_URL = (
  import.meta.env.VITE_PUBLIC_APP_URL ||
  'https://homedesk-smaragd.netlify.app'
).replace(/\/+$/, '');

const NATIVE_REDIRECT_URI =
  'de.gamixlp.homedesk://auth';

const OAUTH_STATE_KEY = 'homedesk:home-assistant:oauth-state';

function getOAuthStorage() {
  return Capacitor.isNativePlatform()
    ? localStorage
    : sessionStorage;
}
const OAUTH_MODE_KEY = 'homedesk:home-assistant:oauth-mode';

export type HomeAssistantAuthMode = 'login' | 'link';

export type HomeAssistantCallbackResult =
  | {
      ok: true;
      code: string;
      state: string;
    }
  | {
      ok: false;
      error: string;
    };

function getHomeAssistantUrl() {
  if (!HOME_ASSISTANT_URL) {
    throw new Error(
      'Die Home-Assistant-Adresse ist in diesem HomeDesk-Build nicht konfiguriert.',
    );
  }

  return HOME_ASSISTANT_URL;
}

function createOAuthState() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function getHomeAssistantClientId() {
  if (Capacitor.isNativePlatform()) {
    return PUBLIC_APP_URL;
  }

  return window.location.origin;
}

export function getHomeAssistantRedirectUri() {
  if (Capacitor.isNativePlatform()) {
    return NATIVE_REDIRECT_URI;
  }

  return `${window.location.origin}/auth/home-assistant/callback`;
}

export function buildHomeAssistantAuthorizeUrl(
  mode: HomeAssistantAuthMode = 'login',
) {
  const state = createOAuthState();

  getOAuthStorage().setItem(OAUTH_STATE_KEY, state);
  getOAuthStorage().setItem(OAUTH_MODE_KEY, mode);

  const authorizeUrl = new URL(
    `${getHomeAssistantUrl()}/auth/authorize`,
  );

  authorizeUrl.searchParams.set(
    'client_id',
    getHomeAssistantClientId(),
  );

  authorizeUrl.searchParams.set(
    'redirect_uri',
    getHomeAssistantRedirectUri(),
  );

  authorizeUrl.searchParams.set(
    'state',
    state,
  );

  return authorizeUrl.toString();
}

export async function startHomeAssistantAuthorization(
  mode: HomeAssistantAuthMode = 'login',
) {
  const authorizeUrl =
    buildHomeAssistantAuthorizeUrl(mode);

  if (Capacitor.isNativePlatform()) {
    await Browser.open({
      url: authorizeUrl,
    });

    return;
  }

  window.location.assign(authorizeUrl);
}

export function consumeHomeAssistantCallback(
  search: string,
): HomeAssistantCallbackResult {
  const params = new URLSearchParams(search);

  const error = params.get('error');

  if (error) {
    return {
      ok: false,
      error:
        params.get('error_description') ||
        `Home Assistant hat die Anmeldung abgelehnt: ${error}`,
    };
  }

  const code = params.get('code');
  const returnedState = params.get('state');
  const expectedState = getOAuthStorage().getItem(OAUTH_STATE_KEY);

  if (!code) {
    return {
      ok: false,
      error: 'Home Assistant hat keinen Autorisierungscode zurückgegeben.',
    };
  }

  if (!returnedState || !expectedState || returnedState !== expectedState) {
    return {
      ok: false,
      error:
        'Die Home-Assistant-Anmeldung konnte aus Sicherheitsgründen nicht bestätigt werden.',
    };
  }

  return {
    ok: true,
    code,
    state: returnedState,
  };
}

export function getHomeAssistantAuthMode(): HomeAssistantAuthMode {
  return getOAuthStorage().getItem(OAUTH_MODE_KEY) === 'link'
    ? 'link'
    : 'login';
}

export function clearHomeAssistantOAuthState() {
  getOAuthStorage().removeItem(OAUTH_STATE_KEY);
  getOAuthStorage().removeItem(OAUTH_MODE_KEY);
}

export type HomeAssistantTokenExchangeResult = {
  ok: boolean;
  connected?: boolean;
  tokenType?: string;
  expiresIn?: number | null;
  refreshTokenReceived?: boolean;
  apiMessage?: string;
  linked?: boolean;

  homeDeskLogin?: {
    tokenHash: string;
    type: 'email';
  };

  user?: {
    id: string;
    name: string;
    isAdmin: boolean;
    isOwner: boolean;
  };

  error?: string;
};

export async function exchangeHomeAssistantCode(
  code: string,
  mode: HomeAssistantAuthMode = 'login',
): Promise<HomeAssistantTokenExchangeResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (mode === 'link') {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session?.access_token) {
      throw new Error(
        'Du musst in HomeDesk angemeldet sein, um dein Home-Assistant-Konto zu verknüpfen.',
      );
    }

    headers.Authorization = `Bearer ${data.session.access_token}`;
  }

  const apiBaseUrl = Capacitor.isNativePlatform()
    ? (
        import.meta.env.VITE_API_BASE_URL ||
        'https://homedesk-smaragd.netlify.app'
      ).replace(/\/+$/, '')
    : '';

  const response = await fetch(
    `${apiBaseUrl}/.netlify/functions/home-assistant-token`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        code,
        clientId: getHomeAssistantClientId(),
        mode,
      }),
    },
  );

  const data = (await response
    .json()
    .catch(() => ({
      ok: false,
      error: 'Ungültige Serverantwort.',
    }))) as HomeAssistantTokenExchangeResult;

  if (!response.ok || !data.ok) {
    throw new Error(
      data.error ||
        'Home-Assistant-Token konnte nicht erstellt werden.',
    );
  }

  return data;
}
