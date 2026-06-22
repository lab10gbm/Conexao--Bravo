import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.app.intranet',
  appName: 'Conexão Bravo',
  webDir: 'dist',
  plugins: {
    CapacitorUpdater: {
      autoUpdate: true,
    }
  }
};

export default config;
