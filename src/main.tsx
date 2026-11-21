import React from 'react';import ReactDOM from 'react-dom/client';import App from './app/App';import {PreferencesProvider} from './app/preferences';import './styles/global.css';import './styles/landing.css';import './styles/accessibility.css';
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><PreferencesProvider><App/></PreferencesProvider></React.StrictMode>);
