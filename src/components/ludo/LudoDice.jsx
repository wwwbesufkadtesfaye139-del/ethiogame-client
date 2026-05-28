import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const FACES = {
  1: [[1,1]],
  2: [[0,0],[2,2]],
  3: [[0,0],[1,1],[2,2]],
  4: [[0,0],[0,2],[2,0],[2,2]],
  5: [[0,0],[0,2],[1,1],[2,0],[2,2]],
  6: [[0,0],[0,2],[1,0],[1,2],[2,0],[2,2]],
};

const Dot = ({ row, col }) => (
  <div className="absolute w-[22%] h-[22%] rounded-full bg-[#0F1117]"
    style={{ top:`${15+row*33}%`, left:`${15+col*33}%` }} />
);

export default function LudoDice({ value, rolling, canRoll, onRoll, color='#F5A623' }) {
  const dots = FACES[value] || [];

  return (
    <div className="flex flex-col items-center gap-3">
      <motion.div
        animate={rolling ? { rotate:[0,15,-15,12,-12,6,-6,0], scale:[1,1.1,0.95,1.08,0.97,1.03,0.99,1] } : {}}
        transition={{ duration:0.6, ease:'easeOut' }}
        className="relative w-16 h-16 rounded-2xl border-2 shadow-xl cursor-pointer"
        style={{ background:`${color}15`, borderColor:`${color}60`, boxShadow:`0 0 20px ${color}30` }}>
        <div className="absolute inset-0 m-2 relative">
          {dots.map(([r,c], i) => <Dot key={i} row={r} col={c} />)}
          {(!value) && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">?</div>
          )}
        </div>
      </motion.div>

      <motion.button whileTap={{ scale:0.88 }} onClick={onRoll} disabled={!canRoll || rolling}
        className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${canRoll && !rolling
          ? 'text-black shadow-[0_0_16px_rgba(245,166,35,0.4)]'
          : 'bg-[#1E2235] text-gray-600 border border-[#2A2F45] cursor-not-allowed'
        }`}
        style={canRoll && !rolling ? { background:color, fontFamily:'Syne,sans-serif' } : { fontFamily:'Syne,sans-serif' }}>
        {rolling ? 'Rolling…' : canRoll ? 'Roll Dice' : 'Wait…'}
      </motion.button>
    </div>
  );
}
