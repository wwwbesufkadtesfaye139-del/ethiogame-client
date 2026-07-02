/**
 * config.js — single source of truth for app-wide constants.
 *
 * Update here only — no need to hunt across multiple files.
 */

// Your Telegram user ID — controls who sees the Admin tab and panel
export const ADMIN_TELEGRAM_ID = '6584576909';

// Railway backend URL
export const SERVER_URL = 'https://ethiogame-server-production.up.railway.app';

// ── Sentry (crash/error reporting) ──────────────────────────────────────
// Set VITE_SENTRY_DSN in Vercel's project env vars (see .env.example).
// Left unset, Sentry simply stays off — nothing else in the app depends on it.
export const SENTRY_DSN     = import.meta.env.VITE_SENTRY_DSN || '';
export const APP_ENV        = import.meta.env.MODE || 'development';
// Vercel sets VERCEL_GIT_COMMIT_SHA at build time; falling back keeps local
// builds working without it. Surfaced in Sentry so a crash can be tied to
// the exact deploy that shipped it.
export const APP_RELEASE    = import.meta.env.VITE_COMMIT_SHA || 'dev';
