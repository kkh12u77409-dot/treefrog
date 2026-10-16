import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against Vite WebSocket disconnection noise in sandbox iframes
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = (reason && (reason.message || reason.stack || String(reason))) || '';
  if (
    typeof msg === 'string' &&
    (msg.includes('WebSocket') || msg.includes('closed without opened') || msg.includes('@vite/client'))
  ) {
    event.preventDefault();
    event.stopImmediatePropagation?.();
  }
});

createRoot(document.getElementById('root')!).render(<App />);
