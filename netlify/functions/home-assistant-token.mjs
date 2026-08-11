import { createClient } from '@supabase/supabase-js';

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
      getHomeAssistantWebSocketUrl(homeAssistantUrl),
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
      if (settled) return;

      settled = true;
      clearTimeout(timeout);

      try {
        socket.close();
      } catch {
        // Socket bereits geschlossen.
      }

      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    };

    socket.addEventListener('message', (event) => {
      let message;

      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }

      if (message.type === 'auth_required') {
        socket.send(
          JSON.stringify({
            type: 'auth',
            access_token: accessToken,
          }),
        );
        return;
      }

      if (message.type === 'auth_invalid') {
        finish(
          new Error(
            'Home Assistant hat den Access Token abgelehnt.',
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
        if (!message.success || !message.result) {
          finish(
            new Error(
              'Der angemeldete Home-Assistant-Benutzer konnte nicht ermittelt werden.',
            ),
          );
          return;
        }

        finish(null, message.result);
      }
    });

    socket.addEventListener('error', () => {
      finish(
        new Error(
          'Die Home-Assistant-WebSocket-Verbindung ist fehlgeschlagen.',
        ),
      );
    });

    socket.addEventListener('close', () => {
      if (!settled) {
        finish(
          new Error(
            'Die Home-Assistant-WebSocket-Verbindung wurde unerwartet beendet.',
          ),
        );
      }
    });
  });
}

function createSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Supabase ist serverseitig nicht vollständig konfiguriert.',
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

async function linkHomeAssistantIdentity(
  request,
  currentUser,
) {
  const authorization =
    request.headers.get('authorization') || '';

  if (!authorization.startsWith('Bearer ')) {
    return {
      ok: false,
      status: 401,
      error:
        'Für die Verknüpfung ist eine HomeDesk-Anmeldung erforderlich.',
    };
  }

  const homeDeskAccessToken =
    authorization
      .slice('Bearer '.length)
      .trim();

  if (!homeDeskAccessToken) {
    return {
      ok: false,
      status: 401,
      error:
        'Die HomeDesk-Sitzung konnte nicht bestätigt werden.',
    };
  }

  const supabase = createSupabaseAdmin();

  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser(
    homeDeskAccessToken,
  );

  if (
    userError ||
    !userData.user
  ) {
    return {
      ok: false,
      status: 401,
      error:
        'Deine HomeDesk-Sitzung ist ungültig oder abgelaufen.',
    };
  }

  const homeDeskUserId =
    userData.user.id;

  const homeAssistantUserId =
    currentUser.id;

  // ----------------------------------------------------------
  // Neues HA-Konto darf nicht bereits einem anderen
  // HomeDesk-Konto gehören.
  // ----------------------------------------------------------

  const {
    data: existingHaIdentity,
    error: existingHaError,
  } = await supabase
    .from('home_assistant_identities')
    .select(
      'home_assistant_user_id, supabase_user_id',
    )
    .eq(
      'home_assistant_user_id',
      homeAssistantUserId,
    )
    .maybeSingle();

  if (existingHaError) {
    throw existingHaError;
  }

  if (
    existingHaIdentity &&
    existingHaIdentity.supabase_user_id !==
      homeDeskUserId
  ) {
    return {
      ok: false,
      status: 409,
      error:
        'Dieses Home-Assistant-Konto ist bereits mit einem anderen HomeDesk-Konto verknüpft.',
    };
  }

  // ----------------------------------------------------------
  // Bestehende Verknüpfung dieses HomeDesk-Kontos suchen.
  // ----------------------------------------------------------

  const {
    data: existingHomeDeskIdentity,
    error: existingHomeDeskError,
  } = await supabase
    .from('home_assistant_identities')
    .select(
      'home_assistant_user_id, supabase_user_id',
    )
    .eq(
      'supabase_user_id',
      homeDeskUserId,
    )
    .maybeSingle();

  if (existingHomeDeskError) {
    throw existingHomeDeskError;
  }

  const now =
    new Date().toISOString();

  const values = {
    home_assistant_user_id:
      homeAssistantUserId,

    home_assistant_name:
      typeof currentUser.name === 'string'
        ? currentUser.name
        : 'Unbekannter Benutzer',

    last_login_at: now,
  };

  // ----------------------------------------------------------
  // Wenn bereits ein HA-Konto verbunden ist, wird die
  // bestehende Zeile atomar auf die neue HA-ID aktualisiert.
  //
  // Dadurch bleibt die alte Verbindung bestehen, solange
  // der neue OAuth-Flow nicht erfolgreich abgeschlossen ist.
  // ----------------------------------------------------------

  if (existingHomeDeskIdentity) {
    const {
      error: updateError,
    } = await supabase
      .from('home_assistant_identities')
      .update(values)
      .eq(
        'supabase_user_id',
        homeDeskUserId,
      );

    if (updateError) {
      throw updateError;
    }

    return {
      ok: true,
      linked: true,
      switched:
        existingHomeDeskIdentity
          .home_assistant_user_id !==
        homeAssistantUserId,
    };
  }

  const {
    error: insertError,
  } = await supabase
    .from('home_assistant_identities')
    .insert({
      ...values,
      supabase_user_id:
        homeDeskUserId,
    });

  if (insertError) {
    throw insertError;
  }

  return {
    ok: true,
    linked: true,
    switched: false,
  };
}


async function createHomeDeskLogin(
  currentUser,
) {
  const supabase = createSupabaseAdmin();

  // ----------------------------------------------------------
  // 1. HA-Benutzer -> bestehendes HomeDesk-Konto
  // ----------------------------------------------------------

  const {
    data: identity,
    error: identityError,
  } = await supabase
    .from('home_assistant_identities')
    .select(
      'home_assistant_user_id, supabase_user_id',
    )
    .eq(
      'home_assistant_user_id',
      currentUser.id,
    )
    .maybeSingle();

  if (identityError) {
    throw identityError;
  }

  if (!identity) {
    return {
      ok: false,
      status: 403,
      error:
        'Dieses Home-Assistant-Konto ist noch mit keinem HomeDesk-Konto verknüpft. Melde dich einmal mit E-Mail und Passwort an und verknüpfe Home Assistant in den Einstellungen.',
    };
  }

  // ----------------------------------------------------------
  // 2. Bestehenden Supabase-Benutzer sicher serverseitig laden
  // ----------------------------------------------------------

  const {
    data: userData,
    error: userError,
  } = await supabase.auth.admin.getUserById(
    identity.supabase_user_id,
  );

  if (
    userError ||
    !userData.user ||
    !userData.user.email
  ) {
    return {
      ok: false,
      status: 500,
      error:
        'Das verknüpfte HomeDesk-Konto konnte nicht geladen werden.',
    };
  }

  // ----------------------------------------------------------
  // 3. Einmaligen Supabase-Login-Token erzeugen
  // ----------------------------------------------------------

  const {
    data: linkData,
    error: linkError,
  } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: userData.user.email,
  });

  if (linkError) {
    throw linkError;
  }

  const tokenHash =
    linkData?.properties?.hashed_token;

  if (
    typeof tokenHash !== 'string' ||
    !tokenHash
  ) {
    return {
      ok: false,
      status: 500,
      error:
        'HomeDesk konnte keine sichere Anmeldesitzung erzeugen.',
    };
  }

  // ----------------------------------------------------------
  // 4. Letzten erfolgreichen HA-Login protokollieren
  // ----------------------------------------------------------

  const {
    error: updateError,
  } = await supabase
    .from('home_assistant_identities')
    .update({
      home_assistant_name:
        typeof currentUser.name === 'string'
          ? currentUser.name
          : 'Unbekannter Benutzer',

      last_login_at:
        new Date().toISOString(),
    })
    .eq(
      'home_assistant_user_id',
      currentUser.id,
    );

  if (updateError) {
    console.error(
      'Could not update HA last_login_at:',
      updateError,
    );
  }

  return {
    ok: true,
    tokenHash,
  };
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

  const mode =
    payload?.mode === 'link'
      ? 'link'
      : 'login';

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

    const accessToken =
      tokenData.access_token;

    if (
      typeof accessToken !== 'string' ||
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

    const apiResponse = await fetch(
      `${homeAssistantUrl}/api/`,
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
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
            'Der Home-Assistant-Zugang konnte nicht validiert werden.',
        },
        502,
      );
    }

    // ========================================================
    // 3. Angemeldeten HA-Benutzer ermitteln
    // ========================================================

    const currentUser =
      await getCurrentHomeAssistantUser(
        homeAssistantUrl,
        accessToken,
      );

    if (
      !currentUser ||
      typeof currentUser.id !== 'string'
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

    // ========================================================
    // 4. Optional: mit aktuellem HomeDesk-Konto verknüpfen
    // ========================================================

    let linked = false;
    let homeDeskLogin = null;

    if (mode === 'link') {
      const linkResult =
        await linkHomeAssistantIdentity(
          request,
          currentUser,
        );

      if (!linkResult.ok) {
        return json(
          {
            ok: false,
            error: linkResult.error,
          },
          linkResult.status,
        );
      }

      linked = true;
    } else {
      // ======================================================
      // HA wurde bestätigt -> verknüpftes HomeDesk-Konto laden
      // ======================================================

      const loginResult =
        await createHomeDeskLogin(
          currentUser,
        );

      if (!loginResult.ok) {
        return json(
          {
            ok: false,
            error: loginResult.error,
          },
          loginResult.status,
        );
      }

      linked = true;

      homeDeskLogin = {
        tokenHash:
          loginResult.tokenHash,

        type: 'email',
      };
    }

    return json({
      ok: true,
      connected: true,
      linked,
      homeDeskLogin,

      tokenType:
        tokenData.token_type ||
        'Bearer',

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

      user: {
        id: currentUser.id,

        name:
          typeof currentUser.name === 'string'
            ? currentUser.name
            : 'Unbekannter Benutzer',

        isAdmin:
          currentUser.is_admin === true,

        isOwner:
          currentUser.is_owner === true,
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
