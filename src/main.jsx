import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { initSentry, Sentry } from './lib/sentry';

// Must run before anything else touches Sentry (setSentryUser, ErrorBoundary).
initSentry();

// Full-screen fallback for uncaught render errors. Telegram WebViews on
// low-end Android otherwise show a blank white screen with no way back —
// this at least gives the player a way to recover without force-closing
// Telegram. Matches the app's own dark theme rather than Sentry's default
// (light) fallback so it doesn't look like a separate broken product.
function CrashFallback() {
  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center"
      style={{ background: '#0F1117', color: 'white', fontFamily: 'DM Sans,sans-serif' }}
    >
      <div style={{ fontSize: 40 }}>⚠️</div>
      <p style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700 }}>
        Something went wrong.
      </p>
      <p style={{ fontSize: 14, color: '#9CA3AF' }}>
        Your balance is safe — this was a display issue only. Please reload.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: 8,
          padding: '10px 24px',
          borderRadius: 12,
          background: '#1B5E20',
          color: 'white',
          fontWeight: 700,
          border: '1px solid #2E7D32',
        }}
      >
        Reload
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<CrashFallback />} showDialog={false}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);
