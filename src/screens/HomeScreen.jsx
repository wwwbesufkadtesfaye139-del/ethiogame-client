import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';

const GameCard = ({ emoji, title, desc, tag, tagColor, onClick }) => (
  <motion.button whileTap={{ scale:0.97 }} onClick={onClick}
    className="w-full bg-[#181C27] border border-[#2A2F45] rounded-2xl p-5 flex items-start gap-4 text-left hover:border-[#3A3F55] transition-colors">
    <div className="w-14 h-14 rounded-2xl bg-[#1E2235] flex items-center justify-center text-3xl flex-shrink-0">{emoji}</div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-bold text-white text-base" style={{fontFamily:'Syne,sans-serif'}}>{title}</h3>
        {tag && <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tagColor}`}>{tag}</span>}
      </div>
      <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
    </div>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-gray-600 flex-shrink-0 mt-1">
      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </motion.button>
);

export default function HomeScreen({ onNavigate }) {
  const { socket, bingoState, ludoState } = useGame();
  const [stats, setStats] = useState({
    liveRooms: '...',
    online:    '...',
    paidToday: '...',
  });

  // ✅ Fetch real stats from server on mount
  useEffect(() => {
    if (!socket) return;

    // Ask server for real stats
    socket.emit('server:getStats', {}, (res) => {
      if (res?.success) {
        setStats({
          liveRooms: res.liveRooms ?? '0',
          online:    res.online    ?? '0',
          paidToday: res.paidToday ? `${res.paidToday} Br` : '0 Br',
        });
      }
    });

    // ✅ Also listen for live updates
    socket.on('server:statsUpdated', (data) => {
      setStats({
        liveRooms: data.liveRooms ?? '0',
        online:    data.online    ?? '0',
        paidToday: data.paidToday ? `${data.paidToday} Br` : '0 Br',
      });
    });

    return () => {
      socket.off('server:statsUpdated');
    };
  }, [socket]);

  return (
    <div className="flex flex-col gap-5 p-4 pb-6">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1E2235] to-[#181C27] border border-[#2A2F45] p-5">
        <div className="absolute top-0 right-0 w-40 h-40 bg-[#F5A623]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <p className="text-xs text-[#F5A623] uppercase tracking-widest font-semibold mb-1">EthioGame Platform</p>
        <h1 className="text-2xl font-extrabold text-white leading-tight mb-2" style={{fontFamily:'Syne,sans-serif'}}>
          Play. Win.<br />Get Paid in Birr.
        </h1>
        <p className="text-sm text-gray-400 mb-4">Real money Bingo & Ludo with instant Telebirr payouts.</p>
        <div className="flex gap-2">
          <motion.button whileTap={{ scale:0.9 }} onClick={() => onNavigate('bingo')}
            className="px-4 py-2 rounded-xl bg-[#F5A623] text-black text-sm font-bold shadow-[0_0_16px_rgba(245,166,35,0.35)]"
            style={{fontFamily:'Syne,sans-serif'}}>
            Play Bingo
          </motion.button>
          <motion.button whileTap={{ scale:0.9 }} onClick={() => onNavigate('ludo')}
            className="px-4 py-2 rounded-xl bg-[#1E2235] border border-[#2A2F45] text-white text-sm font-bold"
            style={{fontFamily:'Syne,sans-serif'}}>
            Play Ludo
          </motion.button>
        </div>
      </div>

      {/* ── Resume Banner — shows when user has an active game ── */}
      {(bingoState?.state === 'active' || bingoState?.state === 'countdown') && (
        <motion.button
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onNavigate('bingo')}
          className="w-full flex items-center justify-between gap-3 bg-[#F5A623]/10 border border-[#F5A623]/40 rounded-2xl px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">🎯</span>
            <div className="text-left">
              <p className="text-xs text-[#F5A623] font-bold uppercase tracking-wider">Active Bingo Game</p>
              <p className="text-sm text-white font-semibold">
                {bingoState.stake} Birr room · {bingoState.playerCount || 0} player(s)
              </p>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-[#F5A623] text-black text-xs font-bold"
            style={{fontFamily:'Syne,sans-serif'}}>
            Resume →
          </span>
        </motion.button>
      )}

      {(ludoState?.state === 'active') && (
        <motion.button
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onNavigate('ludo')}
          className="w-full flex items-center justify-between gap-3 bg-purple-500/10 border border-purple-500/40 rounded-2xl px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">🎲</span>
            <div className="text-left">
              <p className="text-xs text-purple-400 font-bold uppercase tracking-wider">Active Ludo Game</p>
              <p className="text-sm text-white font-semibold">
                {ludoState.stake} Birr room · {ludoState.players?.length || 0} player(s)
              </p>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-purple-500 text-white text-xs font-bold"
            style={{fontFamily:'Syne,sans-serif'}}>
            Resume →
          </span>
        </motion.button>
      )}

      {/* ✅ Live stats — real data from server */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { l:'Live Rooms', v: stats.liveRooms, c:'text-green-400'  },
          { l:'Online',     v: stats.online,    c:'text-blue-400'   },
          { l:'Paid Today', v: stats.paidToday, c:'text-[#F5A623]'  },
        ].map(s => (
          <div key={s.l} className="bg-[#181C27] border border-[#2A2F45] rounded-xl p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{s.l}</p>
            <p className={`text-lg font-bold ${s.c}`} style={{fontFamily:'Syne,sans-serif'}}>{s.v}</p>
          </div>
        ))}
      </div>

      {/* Games */}
      <div className="flex flex-col gap-3">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Choose Your Game</p>
        <GameCard emoji="🎯" title="Bingo" tag="Up to 50P" tagColor="bg-blue-500/20 text-blue-300"
          desc="Join a room, daub your card, and shout BINGO! Stakes from 10 Br."
          onClick={() => onNavigate('bingo')} />
        <GameCard emoji="🎲" title="Ludo" tag="2–4 Players" tagColor="bg-purple-500/20 text-purple-300"
          desc="Race your pieces home. Set your stake and win condition."
          onClick={() => onNavigate('ludo')} />
      </div>

      {/* How it works */}
      <div className="bg-[#181C27] border border-[#2A2F45] rounded-2xl p-4">
        <p className="text-sm font-bold text-white mb-3" style={{fontFamily:'Syne,sans-serif'}}>How It Works</p>
        {[
          { i:'💳', t:'Deposit via Telebirr',  d:'Send to 0902873635, upload receipt' },
          { i:'🎮', t:'Join a Game Room',       d:'Choose your stake, join or create'  },
          { i:'🏆', t:'Win & Get Paid',          d:'Instant Telebirr payout after win'  },
        ].map(s => (
          <div key={s.t} className="flex items-start gap-3 mb-3 last:mb-0">
            <span className="text-xl flex-shrink-0">{s.i}</span>
            <div>
              <p className="text-sm font-semibold text-white">{s.t}</p>
              <p className="text-xs text-gray-500">{s.d}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
