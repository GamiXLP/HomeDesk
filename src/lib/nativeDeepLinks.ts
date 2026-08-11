import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

const HOME_ASSISTANT_SCHEME =
  'de.gamixlp.homedesk:';

async function handleNativeUrl(rawUrl: string) {
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

    // Der OAuth-Browser wird nach erfolgreicher Rückkehr
    // geschlossen. Falls er bereits geschlossen ist, ist
    // das unkritisch.
    try {
      await Browser.close();
    } catch {
      // Kein offenes Browser-Fenster.
    }

    // Die Capacitor-WebView bleibt intern auf localhost.
    // Wir navigieren nur React zur Callback-Route.
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
      void handleNativeUrl(event.url);
    },
  );

  // Falls Android HomeDesk für den Callback komplett neu startet.
  const launchUrl =
    await App.getLaunchUrl();

  if (launchUrl?.url) {
    await handleNativeUrl(launchUrl.url);
  }
}
