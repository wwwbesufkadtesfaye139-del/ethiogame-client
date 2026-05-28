import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

export default function WalletBar({ user, balance, connected, onDepositClick }) {
  const [prev, setPrev] = useState(balance);
  const [dir, setDir]   = useState(null);

  useEffect(() => {
    if (balance !== prev) {
      setDir(balance > prev ? 'up' : 'dn');
      setPrev(balance);
      const t = setTimeout(() => setDir(null), 900);
      return () => clearTimeout(t);
    }
  }, [balance, prev]);

  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-[#181C27] border-b border-[#2A2F45] flex-shrink-0 z-50">
      {/* Avatar + greeting */}
      <div className="flex items-center gap-2.5">
        <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-[#F5A623]/30 flex-shrink-0">
          {user?.photo_url
            ? <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-gradient-to-br from-[#F5A623]/50 to-amber-800/40 flex items-center justify-center text-xs font-bold text-[#F5A623]">
                {(user?.first_name || 'P')[0].toUpperCase()}
              </div>
          }
          {/* Online dot */}
          <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-[#181C27] ${connected ? 'bg-green-400' : 'bg-red-500'}`} />
        </div>
        <div className="leading-tight">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Player</p>
          <p className="text-sm font-bold text-white" style={{fontFamily:'Syne,sans-serif'}}>{user?.first_name || 'Player'}</p>
        </div>
      </div>

      {/* Wallet */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E2235] border border-[#2A2F45]">
          <svg viewBox="0 0 20 20" fill="none" className="w-3.5 h-3.5 text-[#F5A623]" stroke="currentColor" strokeWidth={1.8}>
            <rect x="2" y="5" width="16" height="12" rx="2"/><path d="M14 11h2"/><path d="M2 9h16" strokeDasharray="0"/>
          </svg>
          <AnimatePresence mode="wait">
            <motion.span key={balance}
              initial={{ y: dir === 'up' ? 8 : dir === 'dn' ? -8 : 0, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`text-sm font-mono font-bold ${dir === 'up' ? 'text-green-400' : dir === 'dn' ? 'text-red-400' : 'text-[#F5A623]'}`}>
              {(balance || 0).toFixed(2)} Br
            </motion.span>
          </AnimatePresence>
        </div>
        <motion.button whileTap={{ scale: 0.88 }} onClick={onDepositClick}
          className="px-3 py-1.5 rounded-xl bg-[#F5A623] text-[#0F1117] text-xs font-bold shadow-[0_0_18px_rgba(245,166,35,0.35)]"
          style={{fontFamily:'Syne,sans-serif'}}>
          + Deposit
        </motion.button>
      </div>
    </div>
  );
}
