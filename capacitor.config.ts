import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.app.intranet',
  appName: 'Conexão Bravo',
  webDir: 'dist',
  server: {
    url: 'https://conexao-bravo.onrender.com',
    cleartext: true
  },
  plugins: {
    CapacitorUpdater: {
      autoUpdate: false,
    }
  }
};

export default config;
