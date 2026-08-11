const HOME_ASSISTANT_URL = import.meta.env.VITE_HOME_ASSISTANT_URL?.replace(/\/+$/, '');

const OAUTH_STATE_KEY = 'homedesk:home-assistant:oauth-state';

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
      'VITE_HOME_ASSISTANT_URL fehlt. Bitte die Variable in .env und Netlify hinterlegen.',
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
  return window.location.origin;
}

export function getHomeAssistantRedirectUri() {
  return `${window.location.origin}/auth/home-assistant/callback`;
}

export function buildHomeAssistantAuthorizeUrl() {
  const state = createOAuthState();

  sessionStorage.setItem(OAUTH_STATE_KEY, state);

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

export function startHomeAssistantAuthorization() {
  window.location.assign(buildHomeAssistantAuthorizeUrl());
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
  const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);

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

export function clearHomeAssistantOAuthState() {
  sessionStorage.removeItem(OAUTH_STATE_KEY);
}

export type HomeAssistantTokenExchangeResult = {
  ok: boolean;
  connected?: boolean;
  tokenType?: string;
  expiresIn?: number | null;
  refreshTokenReceived?: boolean;
  apiMessage?: string;
  error?: string;
};

export async function exchangeHomeAssistantCode(
  code: string,
): Promise<HomeAssistantTokenExchangeResult> {
  const response = await fetch(
    '/.netlify/functions/home-assistant-token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        clientId: getHomeAssistantClientId(),
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
