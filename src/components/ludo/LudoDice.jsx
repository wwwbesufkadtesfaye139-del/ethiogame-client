/**
 * LudoDice.jsx — a real 3D die (6 rendered faces in CSS 3D space), not a flat
 * sprite that swaps images. Same public props as before: value, rolling,
 * canRoll, onRoll.
 *
 * Face → value mapping matches a physical die (opposite faces sum to 7):
 *   front=1, back=6, right=2, left=5, top=3, bottom=4
 *
 * Roll sequence (~900ms, matches spec): lift → multi-axis spin → bounce →
 * land → tiny settle shake → resting on the true result. The landing
 * rotation is computed deterministically per value, so the die always shows
 * the real (server-verified) roll — the spin is just choreography on top.
 */
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

const SIZE = 84;
const HALF = SIZE / 2;

const DOTS = {
  1: [[50, 50]],
  2: [[27, 27], [73, 73]],
  3: [[27, 27], [50, 50], [73, 73]],
  4: [[27, 27], [73, 27], [27, 73], [73, 73]],
  5: [[27, 27], [73, 27], [50, 50], [27, 73], [73, 73]],
  6: [[27, 23], [73, 23], [27, 50], [73, 50], [27, 77], [73, 77]],
};

// Each face's own placement inside the cube (static, never animates).
const FACES = [
  { value: 1, place: `translateZ(${HALF}px)` },
  { value: 6, place: `rotateY(180deg) translateZ(${HALF}px)` },
  { value: 2, place: `rotateY(90deg) translateZ(${HALF}px)` },
  { value: 5, place: `rotateY(-90deg) translateZ(${HALF}px)` },
  { value: 3, place: `rotateX(90deg) translateZ(${HALF}px)` },
  { value: 4, place: `rotateX(-90deg) translateZ(${HALF}px)` },
];

// The cube-level rotation that brings each value's face to point at the
// viewer (inverse of that face's own placement rotation above).
const FINAL_ROTATION = {
  1: { x: 0, y: 0 },
  6: { x: 0, y: 180 },
  2: { x: 0, y: -90 },
  5: { x: 0, y: 90 },
  3: { x: -90, y: 0 },
  4: { x: 90, y: 0 },
};

const IDLE_TILT = { x: -16, y: 26 };

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

function Face({ value, place }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: 18,
        background: 'linear-gradient(145deg, #FCFCFD 0%, #E9EBF2 55%, #C7CBD8 100%)',
        border: '1px solid rgba(0,0,0,0.18)',
        boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.9), inset 0 -6px 8px rgba(0,0,0,0.14)',
        transform: place,
        backfaceVisibility: 'hidden',
      }}
    >
      <Pips value={value} />
      {/* glossy sheen, top-left */}
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
    </div>
  );
}

export default function LudoDice({ value, rolling, canRoll, onRoll }) {
  const [rollId, setRollId] = useState(0);
  const prevValueRef = useRef(value);
  const active = canRoll && !rolling;

  // Fire a fresh, self-contained landing animation every time a *new* real
  // result comes in from the server — never guessed client-side.
  useEffect(() => {
    if (value && value !== prevValueRef.current) {
      setRollId((id) => id + 1);
    }
    prevValueRef.current = value;
  }, [value]);

  const final = FINAL_ROTATION[value] || FINAL_ROTATION[1];

  const handleRoll = () => {
    if (active) onRoll();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div style={{ width: SIZE, height: SIZE, perspective: 480 }}>
        {/* Contact shadow, grounds the cube so the lift/bounce reads clearly */}
        <motion.div
          key={`shadow-${rollId}`}
          initial={{ opacity: 0.35, scaleX: 1 }}
          animate={
            value
              ? {
                  scaleX: [1, 0.55, 0.85, 0.6, 0.92, 0.72, 1],
                  opacity: [0.35, 0.16, 0.3, 0.18, 0.32, 0.22, 0.35],
                }
              : { scaleX: [1, 0.92, 1], opacity: [0.3, 0.22, 0.3] }
          }
          transition={
            value
              ? { duration: 0.9, times: [0, 0.15, 0.35, 0.55, 0.78, 0.92, 1], ease: 'easeInOut' }
              : { duration: 1.6, repeat: canRoll ? Infinity : 0, ease: 'easeInOut' }
          }
          style={{
            width: SIZE * 0.8,
            height: SIZE * 0.22,
            margin: '0 auto',
            marginTop: SIZE * 0.86,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.55), rgba(0,0,0,0) 70%)',
            position: 'relative',
            top: -SIZE,
          }}
        />

        <motion.div
          key={rollId}
          onClick={handleRoll}
          initial={{ rotateX: IDLE_TILT.x, rotateY: IDLE_TILT.y, rotateZ: 0, y: 0, scale: 1 }}
          animate={
            value
              ? {
                  rotateX: [IDLE_TILT.x, 210, 470, 690, final.x + 380, final.x - 6, final.x],
                  rotateY: [IDLE_TILT.y, -150, 300, 560, final.y + 300, final.y + 8, final.y],
                  rotateZ: [0, 16, -22, 12, -6, 3, 0],
                  y: [0, -26, -8, -20, -2, 6, 0],
                  scale: [1, 1.12, 0.94, 1.08, 0.97, 1.03, 1],
                }
              : { rotateX: IDLE_TILT.x, rotateY: IDLE_TILT.y, y: canRoll ? [0, -5, 0] : 0 }
          }
          transition={
            value
              ? { duration: 0.9, times: [0, 0.15, 0.35, 0.55, 0.78, 0.92, 1], ease: 'easeInOut' }
              : { duration: 1.6, repeat: canRoll && !value ? Infinity : 0, ease: 'easeInOut' }
          }
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            transformStyle: 'preserve-3d',
            cursor: active ? 'pointer' : 'default',
            filter: active
              ? 'drop-shadow(0 10px 16px rgba(0,0,0,0.55)) drop-shadow(0 0 18px rgba(245,166,35,0.45))'
              : 'drop-shadow(0 6px 10px rgba(0,0,0,0.5))',
          }}
        >
          {FACES.map((f) => (
            <Face key={f.value} value={f.value} place={f.place} />
          ))}
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
