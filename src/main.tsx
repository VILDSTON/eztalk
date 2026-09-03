import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initThemeEngine } from './utils/theme';

// Initialize theme and compact mode immediately to prevent flash of unstyled theme
initThemeEngine();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
