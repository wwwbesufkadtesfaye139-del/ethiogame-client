import { useEffect, useState } from 'react';

/**
 * useTelegram
 * ───────────
 * Initialises the Telegram Web App SDK and exposes user data.
 * Falls back gracefully when running outside Telegram (dev mode).
 */
export const useTelegram = () => {
  const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;

  const [user, setUser] = useState({
    id:         'dev_user',
    first_name: 'Player',
    username:   'player',
    photo_url:  null,
  });

  useEffect(() => {
    if (!tg) return;

    tg.ready();
    tg.expand();
    tg.setHeaderColor('#0F1117');
    tg.setBackgroundColor('#0F1117');

    if (tg.initDataUnsafe?.user) {
      const u = tg.initDataUnsafe.user;
      setUser({
        id:         String(u.id),
        first_name: u.first_name || 'Player',
        username:   u.username   || 'player',
        photo_url:  u.photo_url  || null,
      });
    }
  }, [tg]);

  const haptic = (type = 'light') => tg?.HapticFeedback?.impactOccurred(type);
  const close  = ()               => tg?.close();

  return { tg, user, haptic, close };
};
