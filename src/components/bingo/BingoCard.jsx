import { motion } from 'framer-motion';

const COLUMNS = ['B', 'I', 'N', 'G', 'O'];
const COL_COLORS = {
  B: 'text-blue-400', I: 'text-purple-400',
  N: 'text-[#F5A623]', G: 'text-green-400', O: 'text-red-400'
};

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
            const isDaubed = isFree || daubed?.has(key);
            const isCalled = isFree || calledNumbers?.includes(cell);

            return (
              <motion.button key={key}
                whileTap={{ scale: 0.88 }}
                onTouchStart={() => !isFree && isCalled && onDaub?.(key, cell)}
                onClick={() => !isFree && isCalled && onDaub?.(key, cell)}
                className={`aspect-square flex items-center justify-center relative select-none
                  ${isDaubed
                    ? 'bg-green-900/60'
                    : isCalled
                      ? 'bg-[#F5A623]/10 cursor-pointer'
                      : 'bg-[#181C27] cursor-default'
                  } transition-colors duration-200`}>

                {/* Daub circle */}
                {isDaubed && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                    className="absolute inset-[15%] rounded-full"
                    style={{ background: 'radial-gradient(circle at 38% 32%, #4ADE80, #15803D)' }}
                  />
                )}

                {/* Called shimmer */}
                {isCalled && !isDaubed && (
                  <motion.div className="absolute inset-0 bg-[#F5A623]/5"
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }} />
                )}

                <span className={`relative z-10 text-sm font-bold select-none
                  ${isDaubed ? 'text-white' : isCalled ? 'text-[#F5A623]' : 'text-gray-500'}
                  ${isFree ? 'text-xs' : ''}`}
                  style={{fontFamily:'JetBrains Mono,monospace'}}>
                  {isFree ? '★' : cell}
                </span>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}
