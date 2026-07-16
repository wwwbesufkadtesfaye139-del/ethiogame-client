/**
 * VictoryOverlay.jsx — the spec's "WINNING" sequence:
 *   Camera zoom (a push-in entrance on this whole scene) · Confetti ·
 *   Fireworks · Gold glow · Winner banner. Victory sound is fired by the
 *   caller (LudoScreen) via useLudoSounds, not from in here.
 *
 * Pure presentation — takes the already-decided winner/prize and plays the
 * celebration. No game logic lives in this file.
 */
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { LUDO_COLORS } from './ludoTheme';

const CONFETTI_COLORS = [
  LUDO_COLORS.red.main, LUDO_COLORS.blue.main,
  LUDO_COLORS.green.main, LUDO_COLORS.yellow.main,
  '#F5A623', '#FFFFFF',
];

function Confetti() {
  const pieces = useMemo(() => (
    Array.from({ length: 46 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      drift: (Math.random() - 0.5) * 160,
      delay: Math.random() * 0.9,
      duration: 2.6 + Math.random() * 1.8,
      size: 6 + Math.random() * 6,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      round: Math.random() > 0.5,
    }))
  ), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="anim-confetti"
          style={{
            position: 'absolute',
            top: 0,
            left: `${p.left}%`,
            width: p.size,
            height: p.size * (p.round ? 1 : 1.8),
            background: p.color,
            borderRadius: p.round ? '50%' : 2,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            '--drift': `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

function Fireworks() {
  const bursts = useMemo(() => (
    Array.from({ length: 3 }, (_, b) => ({
      id: b,
      x: 20 + Math.random() * 60,
      y: 15 + Math.random() * 35,
      delay: b * 0.5 + Math.random() * 0.3,
      color: CONFETTI_COLORS[(b * 2) % CONFETTI_COLORS.length],
      particles: Array.from({ length: 14 }, (_, i) => {
        const angle = (Math.PI * 2 * i) / 14;
        const dist = 46 + Math.random() * 26;
        return { tx: Math.cos(angle) * dist, ty: Math.sin(angle) * dist };
      }),
    }))
  ), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {bursts.map((b) => (
        <div key={b.id} style={{ position: 'absolute', left: `${b.x}%`, top: `${b.y}%` }}>
          {b.particles.map((p, i) => (
            <span
              key={i}
              className="anim-firework-particle"
              style={{
                position: 'absolute',
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: b.color,
                boxShadow: `0 0 6px ${b.color}`,
                animationDelay: `${b.delay}s`,
                animationDuration: '0.9s',
                '--tx': `${p.tx}px`,
                '--ty': `${p.ty}px`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function VictoryOverlay({ iWon, winnerName, prize, onPlayAgain }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.18 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-6 text-center overflow-hidden"
      style={{ background: 'radial-gradient(circle at 50% 35%, rgba(9,19,30,0.2), #09131E 78%)' }}
    >
      {/* Gold glow field behind everything */}
      {iWon && (
        <div
          className="anim-gold-glow absolute rounded-full pointer-events-none"
          style={{
            width: 340, height: 340,
            background: 'radial-gradient(circle, rgba(245,166,35,0.5) 0%, rgba(245,166,35,0) 70%)',
          }}
        />
      )}

      {iWon && <Confetti />}
      {iWon && <Fireworks />}

      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.15 }}
        className="text-7xl relative z-10"
      >
        {iWon ? '👑' : '🥈'}
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32 }}
        className="text-2xl font-extrabold relative z-10"
        style={{ fontFamily: 'Syne,sans-serif', color: iWon ? '#F5A623' : '#9CA3AF' }}
      >
        {iWon ? 'You Won!' : `${winnerName || 'Someone'} Won!`}
      </motion.h2>

      {prize > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="text-gray-400 text-sm relative z-10"
        >
          Prize: <span className="text-[#F5A623] font-bold">{prize} Birr</span>
        </motion.p>
      )}

      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        whileTap={{ scale: 0.92 }}
        onClick={onPlayAgain}
        className="px-10 py-3 rounded-2xl font-bold text-black text-base relative z-10"
        style={{
          fontFamily: 'Syne,sans-serif',
          background: 'linear-gradient(135deg,#F5A623,#FF6B00)',
          boxShadow: '0 4px 20px rgba(245,166,35,0.5)',
        }}
      >
        Play Again
      </motion.button>
    </motion.div>
  );
}
