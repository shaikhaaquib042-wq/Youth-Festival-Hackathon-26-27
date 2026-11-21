import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './styles/app.css';
import 'leaflet/dist/leaflet.css';
import './i18n';

const root = document.getElementById('root');
if (!root) throw new Error('SunShield root element is missing.');

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
