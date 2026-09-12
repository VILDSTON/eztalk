import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initThemeEngine } from './utils/theme';
import { LanguageProvider } from './context/LanguageContext';

import { BrowserRouter } from 'react-router-dom';

// Initialize theme and compact mode immediately to prevent flash of unstyled theme
initThemeEngine();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);
