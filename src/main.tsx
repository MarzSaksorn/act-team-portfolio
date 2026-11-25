import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/space-grotesk/latin-400.css';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-700.css';
import '@fontsource/ibm-plex-sans-thai/thai-400.css';
import '@fontsource/ibm-plex-sans-thai/thai-500.css';
import '@fontsource/ibm-plex-sans-thai/latin-400.css';
import '@fontsource/ibm-plex-sans-thai/latin-500.css';
import './styles/global.css';
import App from './App';

const root = document.getElementById('root');
if (!root) throw new Error('App root is missing');
createRoot(root).render(<StrictMode><BrowserRouter><App /></BrowserRouter></StrictMode>);
