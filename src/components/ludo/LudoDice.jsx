/**
 * LudoDice.jsx — 2D dice roll (replaces the earlier 3D CSS-cube version,
 * which didn't read as impressive in practice). Same public props as
 * before: value, rolling, canRoll, onRoll — nothing else in the app needed
 * to change for this swap.
 *
 * Since a flat die can't physically tumble, the "this feels alive" work is
 * done by two things happening together:
 *   1. A big squash/bounce/spin arc (2D transforms only: y, rotate, scaleX,
 *      scaleY) — the physical motion.
 *   2. A rapid face flicker (~70ms per tick) cycling through random values
 *      while the real result is still in flight — this is what actually
 *      sells randomness on a flat die, the same trick most mobile dice
 *      games use.
 *
 * The flicker always locks onto the real, server-verified `value` the
 * moment it arrives — it never guesses or fakes the final number, only the
 * in-between frames while waiting are random.
 *
 * Timing is split into two phases so it holds up under real network
 * latency instead of assuming the server answers instantly:
 *   - PRIMING (rolling=true, value still null): a light continuous jitter +
 *     flicker, however long the round-trip actually takes.
 *   - LANDING (value arrives): a fixed ~900ms bounce/spin/settle sequence,
 *     keyed so it always starts clean from rotate 0 — see the rollId effect
 *     below for why.
 */
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

const SIZE = 84;
const FLICKER_MS = 70;

const DOTS = {
  1: [[50, 50]],
  2: [[27, 27], [73, 73]],
  3: [[27, 27], [50, 50], [73, 73]],
  4: [[27, 27], [73, 27], [27, 73], [73, 73]],
  5: [[27, 27], [73, 27], [50, 50], [27, 73], [73, 73]],
  6: [[27, 23], [73, 23], [27, 50], [73, 50], [27, 77], [73, 77]],
};

function Pips({ value }) {
  return (
    <>
      {(DOTS[value] || []).map(([x, y], i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            width: 13,
            height: 13,
            transform: 'translate(-50%,-50%)',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #FFE3A3, #F5A623 55%, #B9760F 100%)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.55), inset 0 1px 1px rgba(255,255,255,0.5)',
          }}
        />
      ))}
    </>
  );
}

const LANDING_TIMES = [0, 0.06, 0.32, 0.55, 0.72, 0.88, 1];

export default function LudoDice({ value, rolling, canRoll, onRoll }) {
  const [displayValue, setDisplayValue] = useState(value || 1);
  const [rollId, setRollId] = useState(0);
  const flickerTimerRef = useRef(null);
  const prevRollingRef = useRef(rolling);
  const active = canRoll && !rolling;

  // A fresh roll started (rolling flipped false → true, i.e. right on
  // click): remount the die's animation so rotation always starts clean
  // from 0. Without this, the previous roll's resting rotation (720°, which
  // *looks* like 0° but isn't stored as 0) would make the next roll's
  // keyframes jump instead of spin smoothly.
  useEffect(() => {
    if (rolling && !prevRollingRef.current) {
      setRollId((id) => id + 1);
    }
    prevRollingRef.current = rolling;
  }, [rolling]);

  // Rapid face flicker while the real result is still in flight.
  useEffect(() => {
    if (rolling) {
      flickerTimerRef.current = setInterval(() => {
        setDisplayValue(1 + Math.floor(Math.random() * 6));
      }, FLICKER_MS);
      return () => clearInterval(flickerTimerRef.current);
    }
  }, [rolling]);

  // The moment the real, server-verified value shows up: lock the face to
  // it immediately (never guessed) and let the landing animation play out.
  useEffect(() => {
    if (value) {
      clearInterval(flickerTimerRef.current);
      setDisplayValue(value);
    }
  }, [value]);

  const handleRoll = () => {
    if (active) onRoll();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div style={{ width: SIZE, height: SIZE }}>
        {/* Contact shadow, grounds the die so the bounce reads clearly */}
        <motion.div
          key={`shadow-${rollId}`}
          initial={{ opacity: 0.3, scaleX: 1 }}
          animate={
            value
              ? { scaleX: [1, 0.55, 0.85, 0.6, 0.92, 0.72, 1], opacity: [0.3, 0.14, 0.28, 0.16, 0.3, 0.2, 0.3] }
              : rolling
                ? { scaleX: [1, 0.85, 1], opacity: [0.26, 0.16, 0.26] }
                : { scaleX: [1, 0.92, 1], opacity: [0.24, 0.18, 0.24] }
          }
          transition={
            value
              ? { duration: 0.9, times: LANDING_TIMES, ease: 'easeInOut' }
              : { duration: rolling ? 0.5 : 1.6, repeat: Infinity, ease: 'easeInOut' }
          }
          style={{
            width: SIZE * 0.75,
            height: SIZE * 0.2,
            margin: '4px auto 0',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.55), rgba(0,0,0,0) 70%)',
          }}
        />

        <motion.div
          key={rollId}
          onClick={handleRoll}
          initial={{ y: 0, rotate: 0, scaleX: 1, scaleY: 1 }}
          animate={
            value
              ? {
                  y:      [0, 3, -34, -10, -20, 0, 0],
                  rotate: [0, 0, 200, 430, 620, 720, 720],
                  scaleX: [1, 1.08, 0.92, 1.05, 0.95, 1.08, 1],
                  scaleY: [1, 0.9, 1.08, 0.95, 1.06, 0.92, 1],
                }
              : rolling
                ? { y: [0, -4, 0], rotate: [0, -4, 4, 0], scaleX: 1, scaleY: 1 }
                : { y: canRoll ? [0, -5, 0] : 0, rotate: 0, scaleX: 1, scaleY: 1 }
          }
          transition={
            value
              ? { duration: 0.9, times: LANDING_TIMES, ease: 'easeInOut' }
              : { duration: rolling ? 0.35 : 1.6, repeat: Infinity, ease: 'easeInOut' }
          }
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            borderRadius: 18,
            cursor: active ? 'pointer' : 'default',
            background: 'linear-gradient(145deg, #FCFCFD 0%, #E9EBF2 55%, #C7CBD8 100%)',
            border: '1px solid rgba(0,0,0,0.18)',
            boxShadow: active
              ? 'inset 0 2px 3px rgba(255,255,255,0.9), inset 0 -6px 8px rgba(0,0,0,0.14), 0 10px 16px rgba(0,0,0,0.45), 0 0 18px rgba(245,166,35,0.45)'
              : 'inset 0 2px 3px rgba(255,255,255,0.9), inset 0 -6px 8px rgba(0,0,0,0.14), 0 6px 10px rgba(0,0,0,0.4)',
          }}
        >
          {/* Glossy sheen */}
          <div
            style={{
              position: 'absolute',
              top: 5,
              left: 5,
              right: '38%',
              height: '32%',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0))',
              borderRadius: 14,
              pointerEvents: 'none',
            }}
          />
          <Pips value={displayValue} />
        </motion.div>
      </div>

      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={handleRoll}
        disabled={!active}
        style={{
          fontFamily: 'Syne, sans-serif',
          minWidth: 140,
          padding: '10px 24px',
          borderRadius: 14,
          fontWeight: 700,
          fontSize: 15,
          border: 'none',
          cursor: active ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s',
          background: active
            ? 'linear-gradient(135deg, #F5A623 0%, #FF6B00 100%)'
            : '#1E2235',
          color: active ? '#000' : '#4B5563',
          boxShadow: active
            ? '0 4px 20px rgba(245,166,35,0.5), 0 0 0 1px rgba(245,166,35,0.3)'
            : '0 0 0 1px #2A2F45',
        }}
      >
        {rolling ? '🎲 Rolling…' : active ? '🎲 Roll Dice' : '⏳ Wait…'}
      </motion.button>
    </div>
  );
}
