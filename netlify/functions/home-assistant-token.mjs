const json = (data, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });

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
        error: 'HOME_ASSISTANT_URL ist serverseitig nicht konfiguriert.',
      },
      500,
    );
  }

  let payload;

  try {
    payload = await request.json();
  } catch {
    return json(
      {
        ok: false,
        error: 'Ungültige Anfrage.',
      },
      400,
    );
  }

  const code =
    typeof payload?.code === 'string'
      ? payload.code.trim()
      : '';

  const clientId =
    typeof payload?.clientId === 'string'
      ? payload.clientId.trim()
      : '';

  if (!code || !clientId) {
    return json(
      {
        ok: false,
        error: 'Authorization Code oder Client ID fehlt.',
      },
      400,
    );
  }

  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
    });

    const tokenResponse = await fetch(
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

    const tokenData = await tokenResponse
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
            tokenData?.error_description ||
            tokenData?.error ||
            `Home Assistant Token-Austausch fehlgeschlagen (${tokenResponse.status}).`,
        },
        400,
      );
    }

    if (
      typeof tokenData.access_token !== 'string' ||
      !tokenData.access_token
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

    // --------------------------------------------------------
    // Verbindung direkt einmal gegen die HA REST API prüfen.
    // --------------------------------------------------------

    const apiResponse = await fetch(
      `${homeAssistantUrl}/api/`,
      {
        headers: {
          Authorization:
            `Bearer ${tokenData.access_token}`,
        },
      },
    );

    const apiData = await apiResponse
      .json()
      .catch(() => ({}));

    if (!apiResponse.ok) {
      return json(
        {
          ok: false,
          error:
            'Der Token wurde erstellt, konnte aber nicht gegen die Home-Assistant-API validiert werden.',
        },
        502,
      );
    }

    // WICHTIG:
    // Access- und Refresh-Token werden absichtlich NICHT
    // an das Frontend zurückgegeben.
    // Persistente Speicherung kommt im nächsten Schritt.

    return json({
      ok: true,
      connected: true,
      tokenType:
        tokenData.token_type || 'Bearer',
      expiresIn:
        typeof tokenData.expires_in === 'number'
          ? tokenData.expires_in
          : null,
      refreshTokenReceived:
        typeof tokenData.refresh_token === 'string' &&
        tokenData.refresh_token.length > 0,
      apiMessage:
        typeof apiData?.message === 'string'
          ? apiData.message
          : 'Home Assistant API erreichbar',
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
          'Home Assistant konnte vom HomeDesk-Server nicht erreicht werden.',
      },
      502,
    );
  }
};
