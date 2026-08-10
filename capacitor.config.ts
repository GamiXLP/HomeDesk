import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'de.gamixlp.homedesk',
  appName: 'HomeDesk',
  webDir: 'dist',

  android: {
    backgroundColor: '#020617',
  },

  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
