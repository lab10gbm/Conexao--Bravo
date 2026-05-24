import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { MilitarProvider } from './contexts/MilitarContext.tsx';
import { ConfigProvider } from './contexts/ConfigContext.tsx';
import './index.css';

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
