import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

const COL_MAP = { B:[1,15], I:[16,30], N:[31,45], G:[46,60], O:[61,75] };
const getCol = n => Object.entries(COL_MAP).find(([,r]) => n>=r[0] && n<=r[1])?.[0] || '';
const COL_COLORS = { B:'bg-blue-500/20 text-blue-300 border-blue-500/30', I:'bg-purple-500/20 text-purple-300 border-purple-500/30', N:'bg-amber-500/20 text-amber-300 border-amber-500/30', G:'bg-green-500/20 text-green-300 border-green-500/30', O:'bg-red-500/20 text-red-300 border-red-500/30' };

export default function CalledNumbers({ calledNumbers = [], lastDrawn }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl bg-[#181C27] border border-[#2A2F45] overflow-hidden">
      {/* Last drawn + toggle */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Last Drawn</span>
          <AnimatePresence mode="wait">
            {lastDrawn ? (
              <motion.div key={lastDrawn}
                initial={{ scale: 0.4, opacity: 0, rotate: -15 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 1.4, opacity: 0 }}
                transition={{ type:'spring', stiffness:400, damping:18 }}
                className={`w-10 h-10 rounded-xl border flex items-center justify-center font-mono font-bold text-base ${COL_COLORS[getCol(lastDrawn)]}`}>
                {lastDrawn}
              </motion.div>
            ) : (
              <div className="w-10 h-10 rounded-xl border border-dashed border-[#2A2F45] flex items-center justify-center text-gray-600 text-xs">—</div>
            )}
          </AnimatePresence>
          <span className="text-xs text-gray-500">{calledNumbers.length}/75 called</span>
        </div>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E2235] border border-[#2A2F45] text-xs text-gray-400">
          {open ? 'Hide' : 'Show All'}
          <motion.svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            className="w-3.5 h-3.5" animate={{ rotate: open ? 180 : 0 }}>
            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/>
          </motion.svg>
        </motion.button>
      </div>

      {/* Expandable full list */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
            exit={{ height:0, opacity:0 }} transition={{ duration:0.25 }}
            className="overflow-hidden">
            <div className="px-4 pb-4">
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto no-scrollbar">
                {calledNumbers.length === 0
                  ? <p className="text-gray-600 text-xs">No numbers called yet.</p>
                  : calledNumbers.map(n => (
                    <motion.span key={n}
                      initial={{ scale:0 }} animate={{ scale:1 }}
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center font-mono text-xs font-bold ${COL_COLORS[getCol(n)]} ${n===lastDrawn?'ring-2 ring-[#F5A623] scale-110':''}`}>
                      {n}
                    </motion.span>
                  ))
                }
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
