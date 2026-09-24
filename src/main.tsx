import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safely trap transient unhandled fetch network errors
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (
      event.reason &&
      (event.reason.message === 'Failed to fetch' ||
        event.reason.name === 'TypeError' ||
        String(event.reason).includes('Failed to fetch'))
    ) {
      console.warn('Unhandled network fetch caught gracefully:', event.reason);
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
