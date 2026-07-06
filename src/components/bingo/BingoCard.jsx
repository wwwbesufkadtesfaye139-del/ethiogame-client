import { motion } from 'framer-motion';
import { memo } from 'react';

const COLUMNS = ['B', 'I', 'N', 'G', 'O'];
const COL_COLORS = {
  B: 'text-blue-400', I: 'text-purple-400',
  N: 'text-[#F5A623]', G: 'text-green-400', O: 'text-red-400'
};

/* Phase 2 (crash/memory hardening): this used to be inlined in the .map()
 * below as a plain motion.button. Two changes here:
 *   1. Extracted + memoized — a single daub or a single newly-called number
 *      only actually changes 1-2 of the 25 cells, but without memo every
 *      cell re-rendered on every 'bingo:numberDrawn' broadcast for the
 *      entire game (which can run to 75 draws).
 *   2. Swapped `motion.button` (whileTap) for a plain button + CSS
 *      active-state transform — Framer Motion's gesture tracking on 25
 *      elements adds up when it's happening every few seconds for an
 *      entire game, and a CSS :active transform gives the same tap
 *      feedback at effectively zero JS cost.
 * The infinite "called shimmer" is now a CSS keyframe (.anim-cell-shimmer,
 * see index.css) instead of a JS-driven Framer Motion loop — up to 24 of
 * these can be running concurrently by the end of a game, previously all
 * on the main thread.
 */
const BingoCell = memo(function BingoCell({ cellKey, cell, isFree, isDaubed, isCalled, onDaub }) {
  return (
    <button
      onTouchStart={() => !isFree && isCalled && onDaub?.(cellKey, cell)}
      onClick={() => !isFree && isCalled && onDaub?.(cellKey, cell)}
      className={`aspect-square flex items-center justify-center relative select-none
        transition-transform duration-100 active:scale-90
        ${isDaubed
          ? 'bg-green-900/60'
          : isCalled
            ? 'bg-[#F5A623]/10 cursor-pointer'
            : 'bg-[#181C27] cursor-default'
        } transition-colors duration-200`}>

      {/* Daub circle — single-fire spring on tap, not a loop, so this
          stays Framer Motion; it's cheap and it's the satisfying part. */}
      {isDaubed && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          className="absolute inset-[15%] rounded-full"
          style={{ background: 'radial-gradient(circle at 38% 32%, #4ADE80, #15803D)' }}
        />
      )}

      {/* Called shimmer — CSS keyframe, see comment above */}
      {isCalled && !isDaubed && (
        <div className="absolute inset-0 bg-[#F5A623]/5 anim-cell-shimmer" />
      )}

      <span className={`relative z-10 text-sm font-bold select-none
        ${isDaubed ? 'text-white' : isCalled ? 'text-[#F5A623]' : 'text-gray-500'}
        ${isFree ? 'text-xs' : ''}`}
        style={{fontFamily:'JetBrains Mono,monospace'}}>
        {isFree ? '★' : cell}
      </span>
    </button>
  );
});

export default function BingoCard({ card, daubed, calledNumbers, onDaub }) {
  if (!card || !card.length) return (
    <div className="w-full aspect-square bg-[#1E2235] rounded-2xl flex items-center justify-center text-gray-500">
      Waiting for card...
    </div>
  );

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-[#2A2F45] shadow-xl">
      {/* Header row */}
      <div className="grid grid-cols-5 bg-[#181C27]">
        {COLUMNS.map(c => (
          <div key={c} className={`text-center py-2.5 text-base font-extrabold ${COL_COLORS[c]}`}
            style={{fontFamily:'Syne,sans-serif'}}>{c}</div>
        ))}
      </div>

      {/* Grid body */}
      <div className="grid grid-cols-5 bg-[#1E2235] gap-px">
        {card.map((row, r) =>
          row.map((cell, c) => {
            const key      = `${r}-${c}`;
            const isFree   = cell === 0;
            const isDaubed = isFree || !!daubed?.has(key);
            const isCalled = isFree || !!calledNumbers?.includes(cell);

            return (
              <BingoCell
                key={key}
                cellKey={key}
                cell={cell}
                isFree={isFree}
                isDaubed={isDaubed}
                isCalled={isCalled}
                onDaub={onDaub}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
