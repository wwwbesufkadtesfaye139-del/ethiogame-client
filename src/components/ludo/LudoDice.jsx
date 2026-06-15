/**
 * LudoDice.jsx — 3D-style animated dice, Ludo King feel
 * Same props: value, rolling, canRoll, onRoll
 */
import { motion } from 'framer-motion';

const DOTS = {
  1: [[50,50]],
  2: [[25,25],[75,75]],
  3: [[25,25],[50,50],[75,75]],
  4: [[25,25],[75,25],[25,75],[75,75]],
  5: [[25,25],[75,25],[50,50],[25,75],[75,75]],
  6: [[25,22],[75,22],[25,50],[75,50],[25,78],[75,78]],
};

export default function LudoDice({ value, rolling, canRoll, onRoll }) {
  const dots = DOTS[value] || [];
  const active = canRoll && !rolling;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Dice */}
      <motion.div
        onClick={active ? onRoll : undefined}
        animate={rolling
          ? { rotateX:[0,180,360,180,0], rotateZ:[0,-30,60,-20,0], scale:[1,1.15,0.9,1.1,1] }
          : canRoll ? { scale:[1,1.05,1] } : {}
        }
        transition={rolling
          ? { duration:0.65, ease:'easeOut' }
          : { repeat: canRoll ? Infinity : 0, duration:1.8, ease:'easeInOut' }
        }
        style={{
          width: 72, height: 72,
          borderRadius: 16,
          cursor: active ? 'pointer' : 'default',
          position: 'relative',
          background: 'linear-gradient(145deg, #ffffff 0%, #e0e0e0 100%)',
          boxShadow: active
            ? '0 8px 20px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.8), 0 0 24px rgba(245,166,35,0.5)'
            : '0 4px 12px rgba(0,0,0,0.5), inset 0 2px 3px rgba(255,255,255,0.6)',
          userSelect: 'none',
        }}
      >
        {/* SVG dot layer */}
        <svg viewBox="0 0 100 100" width="100%" height="100%"
          style={{ position:'absolute', inset:0 }}>
          {dots.map(([dx,dy], i) => (
            <circle key={i} cx={dx} cy={dy} r={9}
              fill="#1a1a2e"
              style={{ filter:'drop-shadow(0 1px 1px rgba(0,0,0,0.3))' }}
            />
          ))}
          {!value && (
            <text x="50" y="58" textAnchor="middle"
              fontSize="32" fill="#999" fontWeight="bold"
              style={{userSelect:'none'}}>?</text>
          )}
        </svg>

        {/* Top-left shine */}
        <div style={{
          position:'absolute', top:6, left:6, width:28, height:12,
          background:'rgba(255,255,255,0.55)', borderRadius:8,
          transform:'rotate(-20deg)',
        }}/>
      </motion.div>

      {/* Roll button */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={active ? onRoll : undefined}
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
