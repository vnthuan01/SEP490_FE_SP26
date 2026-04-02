import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@goongmaps/goong-js/dist/goong-js.css';
import './index.css';
import App from './App.tsx';
import './lib/i18next/i18n';
import { Toaster } from 'sonner';
import { ThemeProvider } from './components/provider/ThemeProvider.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Toaster position="top-center" richColors />
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
