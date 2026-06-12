import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { MilitarProvider } from './contexts/MilitarContext.tsx';
import { ConfigProvider } from './contexts/ConfigContext.tsx';
import './index.css';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

import { Capacitor } from '@capacitor/core';

// Intercept fetch calls to redirect /api to the live server when running on a native device
if (Capacitor.isNativePlatform()) {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    let [resource, config] = args;
    
    if (typeof resource === 'string' && resource.startsWith('/api/')) {
      resource = `https://conexao-bravo.onrender.com${resource}`;
    }
    
    return originalFetch(resource, config);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ConfigProvider>
        <MilitarProvider>
          <App />
        </MilitarProvider>
      </ConfigProvider>
    </BrowserRouter>
  </StrictMode>
);

CapacitorUpdater.notifyAppReady();
