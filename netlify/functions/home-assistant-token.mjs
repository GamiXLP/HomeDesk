const json = (data, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });

function getHomeAssistantWebSocketUrl(homeAssistantUrl) {
  const url = new URL(homeAssistantUrl);

  url.protocol =
    url.protocol === 'https:'
      ? 'wss:'
      : 'ws:';

  url.pathname = '/api/websocket';
  url.search = '';
  url.hash = '';

  return url.toString();
}

function getCurrentHomeAssistantUser(
  homeAssistantUrl,
  accessToken,
) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(
      getHomeAssistantWebSocketUrl(
        homeAssistantUrl,
      ),
    );

    let settled = false;

    const timeout = setTimeout(() => {
      finish(
        new Error(
          'Zeitüberschreitung beim Abrufen des Home-Assistant-Benutzers.',
        ),
      );
    }, 10000);

    const finish = (error, result) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);

      try {
        socket.close();
      } catch {
        // Socket möglicherweise bereits geschlossen.
      }

      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    };

    socket.addEventListener(
      'message',
      (event) => {
        let message;

        try {
          message = JSON.parse(
            String(event.data),
          );
        } catch {
          return;
        }

        if (
          message.type ===
          'auth_required'
        ) {
          socket.send(
            JSON.stringify({
              type: 'auth',
              access_token:
                accessToken,
            }),
          );

          return;
        }

        if (
          message.type ===
          'auth_invalid'
        ) {
          finish(
            new Error(
              'Home Assistant hat den Access Token für die WebSocket-Verbindung abgelehnt.',
            ),
          );

          return;
        }

        if (message.type === 'auth_ok') {
          socket.send(
            JSON.stringify({
              id: 1,
              type: 'auth/current_user',
            }),
          );

          return;
        }

        if (
          message.type === 'result' &&
          message.id === 1
        ) {
          if (
            !message.success ||
            !message.result
          ) {
            finish(
              new Error(
                'Der aktuell angemeldete Home-Assistant-Benutzer konnte nicht ermittelt werden.',
              ),
            );

            return;
          }

          finish(
            null,
            message.result,
          );
        }
      },
    );

    socket.addEventListener(
      'error',
      () => {
        finish(
          new Error(
            'Die Home-Assistant-WebSocket-Verbindung ist fehlgeschlagen.',
          ),
        );
      },
    );

    socket.addEventListener(
      'close',
      () => {
        if (!settled) {
          finish(
            new Error(
              'Die Home-Assistant-WebSocket-Verbindung wurde unerwartet beendet.',
            ),
          );
        }
      },
    );
  });
}

export default async (request) => {
  if (request.method !== 'POST') {
    return json(
      {
        ok: false,
        error: 'Method not allowed.',
      },
      405,
    );
  }

  const homeAssistantUrl = (
    process.env.HOME_ASSISTANT_URL ||
    process.env.VITE_HOME_ASSISTANT_URL ||
    ''
  ).replace(/\/+$/, '');

  if (!homeAssistantUrl) {
    return json(
      {
        ok: false,
        error:
          'HOME_ASSISTANT_URL ist serverseitig nicht konfiguriert.',
      },
      500,
    );
  }

  let payload;

  try {
    payload =
      await request.json();
  } catch {
    return json(
      {
        ok: false,
        error:
          'Ungültige Anfrage.',
      },
      400,
    );
  }

  const code =
    typeof payload?.code ===
    'string'
      ? payload.code.trim()
      : '';

  const clientId =
    typeof payload?.clientId ===
    'string'
      ? payload.clientId.trim()
      : '';

  if (!code || !clientId) {
    return json(
      {
        ok: false,
        error:
          'Authorization Code oder Client ID fehlt.',
      },
      400,
    );
  }

  try {
    // ========================================================
    // 1. Authorization Code gegen HA Token tauschen
    // ========================================================

    const body =
      new URLSearchParams({
        grant_type:
          'authorization_code',
        code,
        client_id: clientId,
      });

    const tokenResponse =
      await fetch(
        `${homeAssistantUrl}/auth/token`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/x-www-form-urlencoded',
          },
          body,
        },
      );

    const tokenData =
      await tokenResponse
        .json()
        .catch(() => ({}));

    if (!tokenResponse.ok) {
      console.error(
        'Home Assistant token exchange failed:',
        tokenResponse.status,
        tokenData?.error,
      );

      return json(
        {
          ok: false,
          error:
            tokenData
              ?.error_description ||
            tokenData?.error ||
            `Home Assistant Token-Austausch fehlgeschlagen (${tokenResponse.status}).`,
        },
        400,
      );
    }

    const accessToken =
      tokenData.access_token;

    if (
      typeof accessToken !==
        'string' ||
      !accessToken
    ) {
      return json(
        {
          ok: false,
          error:
            'Home Assistant hat keinen Access Token zurückgegeben.',
        },
        502,
      );
    }

    // ========================================================
    // 2. REST API prüfen
    // ========================================================

    const apiResponse =
      await fetch(
        `${homeAssistantUrl}/api/`,
        {
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },
        },
      );

    const apiData =
      await apiResponse
        .json()
        .catch(() => ({}));

    if (!apiResponse.ok) {
      return json(
        {
          ok: false,
          error:
            'Der Home-Assistant-Zugang konnte nicht validiert werden.',
        },
        502,
      );
    }

    // ========================================================
    // 3. Aktuell angemeldeten HA-Benutzer ermitteln
    // ========================================================

    const currentUser =
      await getCurrentHomeAssistantUser(
        homeAssistantUrl,
        accessToken,
      );

    if (
      !currentUser ||
      typeof currentUser.id !==
        'string'
    ) {
      return json(
        {
          ok: false,
          error:
            'Home Assistant hat keine gültigen Benutzerinformationen zurückgegeben.',
        },
        502,
      );
    }

    // WICHTIG:
    // Noch immer keine Tokens ans Frontend geben.
    // Wir schicken nur harmlose Identitätsdaten zurück.

    return json({
      ok: true,
      connected: true,

      tokenType:
        tokenData.token_type ||
        'Bearer',

      expiresIn:
        typeof tokenData.expires_in ===
        'number'
          ? tokenData.expires_in
          : null,

      refreshTokenReceived:
        typeof tokenData.refresh_token ===
          'string' &&
        tokenData.refresh_token.length >
          0,

      apiMessage:
        typeof apiData?.message ===
        'string'
          ? apiData.message
          : 'Home Assistant API erreichbar',

      user: {
        id: currentUser.id,
        name:
          typeof currentUser.name ===
          'string'
            ? currentUser.name
            : 'Unbekannter Benutzer',

        isAdmin:
          currentUser.is_admin ===
          true,

        isOwner:
          currentUser.is_owner ===
          true,
      },
    });
  } catch (error) {
    console.error(
      'Home Assistant connection error:',
      error,
    );

    return json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Home Assistant konnte vom HomeDesk-Server nicht erreicht werden.',
      },
      502,
    );
  }
};
