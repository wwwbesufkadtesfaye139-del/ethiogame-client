/**
 * lib/sentry.js — crash & error reporting for the Mini App client.
 *
 * Why this exists (Phase 0 of the architecture overhaul):
 * Players are hitting crashes on lower-end Android WebViews with zero
 * visibility into *why*. Before doing deeper memory/perf work, we need
 * real crash data instead of guessing.
 *
 * Scope of this file: initialize Sentry only. It does not change any
 * game, wallet, or socket behavior.
 */

import * as Sentry from '@sentry/react';
import { SENTRY_DSN, APP_ENV, APP_RELEASE } from '../config';

export function initSentry() {
  // No DSN configured (e.g. local dev without one set) — skip silently.
  // This must never throw or block app boot.
  if (!SENTRY_DSN) {
    if (APP_ENV !== 'production') {
      console.info('[Sentry] No VITE_SENTRY_DSN set — error reporting disabled.');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: APP_ENV,
    release: APP_RELEASE,

    // Telegram WebViews run on constrained, sometimes-flaky devices/networks.
    // Keep the SDK's own footprint small rather than turning on tracing,
    // session replay, etc. — this phase is about visibility, not the
    // heavier perf tooling that comes later.
    integrations: [],
    tracesSampleRate: 0,

    // Telegram Mini Apps are always loaded over https inside the Telegram
    // WebView chrome, so ignore the noisy "ResizeObserver loop" and
    // extension-injected errors that aren't ours to fix.
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
    ],
  });
}

/**
 * Call once we know who the Telegram user is (id only — no PII beyond
 * what the server already logs against telegramId for support/fraud
 * investigation).
 */
export function setSentryUser(telegramId) {
  if (!SENTRY_DSN || !telegramId) return;
  Sentry.setUser({ id: String(telegramId) });
}

export { Sentry };
