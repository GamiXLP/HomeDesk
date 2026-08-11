import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

const HOME_ASSISTANT_SCHEME =
  'de.gamixlp.homedesk:';

function handleNativeUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);

    if (
      url.protocol !== HOME_ASSISTANT_SCHEME ||
      url.hostname !== 'auth'
    ) {
      return;
    }

    const callbackPath =
      `/auth/home-assistant/callback${url.search}`;

    // Die WebView bleibt auf ihrem internen localhost.
    // Wir navigieren nur React zur bestehenden Callback-Route.
    window.history.replaceState(
      {},
      '',
      callbackPath,
    );

    window.dispatchEvent(
      new PopStateEvent('popstate'),
    );
  } catch (error) {
    console.error(
      'Native Deep Link konnte nicht verarbeitet werden:',
      error,
    );
  }
}

export async function initializeNativeDeepLinks() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  await App.addListener(
    'appUrlOpen',
    (event) => {
      handleNativeUrl(event.url);
    },
  );

  // Falls Android HomeDesk für den Callback komplett neu startet.
  const launchUrl =
    await App.getLaunchUrl();

  if (launchUrl?.url) {
    handleNativeUrl(launchUrl.url);
  }
}
