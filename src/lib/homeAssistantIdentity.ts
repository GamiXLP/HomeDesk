import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

function getHomeDeskApiBaseUrl() {
  if (!Capacitor.isNativePlatform()) {
    return '';
  }

  return (
    import.meta.env.VITE_API_BASE_URL ||
    'https://homedesk-smaragd.netlify.app'
  ).replace(/\/+$/, '');
}

export type HomeAssistantIdentity = {
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
};

export type HomeAssistantIdentityStatus = {
  linked: boolean;
  identity: HomeAssistantIdentity | null;
};

async function getAuthorizationHeader() {
  const {
    data,
    error,
  } = await supabase.auth.getSession();

  if (
    error ||
    !data.session?.access_token
  ) {
    throw new Error(
      'Deine HomeDesk-Sitzung ist nicht verfügbar.',
    );
  }

  return `Bearer ${data.session.access_token}`;
}

export async function getHomeAssistantIdentity():
  Promise<HomeAssistantIdentityStatus> {
  const authorization =
    await getAuthorizationHeader();

  const response = await fetch(
    `${getHomeDeskApiBaseUrl()}/.netlify/functions/home-assistant-identity`,
    {
      method: 'GET',
      headers: {
        Authorization: authorization,
      },
    },
  );

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(
      data.error ||
        'Home-Assistant-Verknüpfung konnte nicht geladen werden.',
    );
  }

  return {
    linked: data.linked === true,
    identity: data.identity || null,
  };
}

export async function disconnectHomeAssistantIdentity() {
  const authorization =
    await getAuthorizationHeader();

  const response = await fetch(
    `${getHomeDeskApiBaseUrl()}/.netlify/functions/home-assistant-identity`,
    {
      method: 'DELETE',
      headers: {
        Authorization: authorization,
      },
    },
  );

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(
      data.error ||
        'Home-Assistant-Verknüpfung konnte nicht getrennt werden.',
    );
  }
}
