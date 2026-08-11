import { createClient } from '@supabase/supabase-js';

const json = (data, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  });

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

async function authenticateRequest(request) {
  const authorization =
    request.headers.get('authorization') || '';

  if (!authorization.startsWith('Bearer ')) {
    throw new Error('UNAUTHORIZED');
  }

  const accessToken = authorization
    .slice('Bearer '.length)
    .trim();

  if (!accessToken) {
    throw new Error('UNAUTHORIZED');
  }

  const supabase = createSupabaseAdmin();

  const {
    data,
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new Error('UNAUTHORIZED');
  }

  return {
    supabase,
    user: data.user,
  };
}

export default async (request) => {
  try {
    if (
      request.method !== 'GET' &&
      request.method !== 'DELETE'
    ) {
      return json(
        {
          ok: false,
          error: 'Method not allowed.',
        },
        405,
      );
    }

    const {
      supabase,
      user,
    } = await authenticateRequest(request);

    if (request.method === 'GET') {
      const {
        data,
        error,
      } = await supabase
        .from('home_assistant_identities')
        .select(
          [
            'home_assistant_user_id',
            'home_assistant_name',
            'created_at',
            'updated_at',
            'last_login_at',
          ].join(','),
        )
        .eq('supabase_user_id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return json({
          ok: true,
          linked: false,
          identity: null,
        });
      }

      return json({
        ok: true,
        linked: true,
        identity: {
          userId:
            data.home_assistant_user_id,

          name:
            data.home_assistant_name,

          createdAt:
            data.created_at,

          updatedAt:
            data.updated_at,

          lastLoginAt:
            data.last_login_at,
        },
      });
    }

    // ========================================================
    // DELETE = Verknüpfung trennen
    // ========================================================

    const {
      error,
    } = await supabase
      .from('home_assistant_identities')
      .delete()
      .eq('supabase_user_id', user.id);

    if (error) {
      throw error;
    }

    return json({
      ok: true,
      linked: false,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'UNAUTHORIZED'
    ) {
      return json(
        {
          ok: false,
          error:
            'Deine HomeDesk-Sitzung ist ungültig oder abgelaufen.',
        },
        401,
      );
    }

    console.error(
      'Home Assistant identity error:',
      error,
    );

    return json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Home-Assistant-Verknüpfung konnte nicht geladen werden.',
      },
      500,
    );
  }
};
