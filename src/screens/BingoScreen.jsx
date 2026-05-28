import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import BingoCard    from '../components/bingo/BingoCard';
import BingoRoomList from '../components/bingo/BingoRoomList';
import CalledNumbers from '../components/bingo/CalledNumbers';
import { useGame }  from '../context/GameContext';

const MOCK_CARD = [
  [14, 29, 38, 51, 62],[3,21,43,58,74],[8,18,0,52,66],[12,25,36,50,63],[7,30,44,55,70]
];

const BingoVictory = ({ onClose }) => (
  <motion.div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80"
    initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
    {/* Confetti circles */}
    {Array.from({ length:20 }).map((_,i) => (
      <motion.div key={i}
        className="absolute w-3 h-3 rounded-full"
        style={{ background: ['#F5A623','#22C55E','#3B82F6','#A855F7','#EF4444'][i%5], top:'50%', left:'50%' }}
        animate={{ x:(Math.random()-0.5)*300, y:(Math.random()-0.5)*500, opacity:[1,1,0], scale:[0,1,0.5] }}
        transition={{ duration:1.2+Math.random(), delay:Math.random()*0.3 }} />
    ))}
    <motion.div initial={{ scale:0.3, y:50 }} animate={{ scale:1, y:0 }} transition={{ type:'spring', stiffness:300, delay:0.1 }}
      className="bg-[#181C27] border-2 border-[#F5A623] rounded-3xl p-8 flex flex-col items-center gap-4 mx-6">
      <motion.div animate={{ rotate:[0,15,-15,12,-12,0], scale:[1,1.2,0.9,1.1,1] }} transition={{ duration:0.8, delay:0.3 }}
        className="text-6xl">🎉</motion.div>
      <h2 className="text-3xl font-extrabold text-[#F5A623]" style={{fontFamily:'Syne,sans-serif'}}>BINGO!</h2>
      <p className="text-gray-300 text-center text-sm">You won the prize pool!<br/>Check your wallet for the payout.</p>
      <motion.button whileTap={{ scale:0.9 }} onClick={onClose}
        className="px-8 py-3 rounded-xl bg-[#F5A623] text-black font-bold"
        style={{fontFamily:'Syne,sans-serif'}}>
        Awesome! 🎊
      </motion.button>
    </motion.div>
  </motion.div>
);

export default function BingoScreen() {
  const { bingoState, joinBingo, claimBingo } = useGame();
  const [daubed,       setDaubed]    = useState(new Set());
  const [view,         setView]      = useState('rooms'); // 'rooms' | 'game'
  const [victory,      setVictory]   = useState(false);
  const [claimResult,  setClaimResult] = useState(null);

  const card          = bingoState?.card || MOCK_CARD;
  const calledNumbers = bingoState?.calledNumbers || [];
  const lastDrawn     = bingoState?.lastDrawn;
  const roomState     = bingoState?.state || 'waiting';

  const handleDaub = (key) => {
    setDaubed(prev => { const n = new Set(prev); n.add(key); return n; });
  };

  const handleJoin = (roomId, stake) => {
    joinBingo(stake, (res) => {
      if (res?.success) setView('game');
    });
  };

  const handleClaimBingo = () => {
    if (!bingoState?.roomId) return;
    claimBingo(bingoState.roomId, (res) => {
      setClaimResult(res);
      if (res?.isWinner) setVictory(true);
    });
  };

  return (
    <div className="relative flex flex-col gap-4 p-4 pb-6 min-h-full">
      <AnimatePresence>{victory && <BingoVictory onClose={() => setVictory(false)} />}</AnimatePresence>

      {/* Tab Switch */}
      <div className="flex gap-2 bg-[#181C27] border border-[#2A2F45] rounded-xl p-1">
        {[['rooms','🏠 Rooms'],['game','🎯 My Card']].map(([v,l]) => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${view===v ? 'bg-[#F5A623] text-black shadow-[0_0_12px_rgba(245,166,35,0.3)]' : 'text-gray-500'}`}
            style={{fontFamily:'Syne,sans-serif'}}>
            {l}
          </button>
        ))}
      </div>

      {view === 'rooms' && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white" style={{fontFamily:'Syne,sans-serif'}}>Live Bingo Rooms</h2>
            <span className="text-xs text-gray-500">200 rooms</span>
          </div>
          <BingoRoomList onJoin={handleJoin} />
        </motion.div>
      )}

      {view === 'game' && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="flex flex-col gap-4">
          {/* Game status */}
          {roomState === 'countdown' && (
            <motion.div animate={{ opacity:[0.7,1,0.7] }} transition={{ repeat:Infinity, duration:1.2 }}
              className="bg-[#F5A623]/10 border border-[#F5A623]/30 rounded-xl px-4 py-3 text-center">
              <p className="text-[#F5A623] text-sm font-bold" style={{fontFamily:'Syne,sans-serif'}}>⏱ Game starting…</p>
              <p className="text-xs text-gray-400">{bingoState?.playerCount} players joined</p>
            </motion.div>
          )}
          {roomState === 'active' && (
            <div className="bg-green-950/40 border border-green-500/30 rounded-xl px-4 py-3 text-center">
              <p className="text-green-400 text-sm font-bold" style={{fontFamily:'Syne,sans-serif'}}>🎲 Game in Progress</p>
            </div>
          )}

          <CalledNumbers calledNumbers={calledNumbers} lastDrawn={lastDrawn} />

          <BingoCard card={card} daubed={daubed} calledNumbers={calledNumbers} onDaub={handleDaub} />

          {/* Claim button */}
          {roomState === 'active' && (
            <motion.button whileTap={{ scale:0.94 }} onClick={handleClaimBingo}
              className="w-full py-4 rounded-2xl text-black text-xl font-extrabold shadow-[0_0_30px_rgba(245,166,35,0.5)] active:shadow-none"
              style={{ background:'linear-gradient(135deg,#F5A623,#C47F0E)', fontFamily:'Syne,sans-serif' }}>
              🎉 BINGO!
            </motion.button>
          )}

          {claimResult && !claimResult.isWinner && (
            <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
              className="bg-red-950/40 border border-red-500/30 rounded-xl px-4 py-3 text-center">
              <p className="text-red-400 text-sm">❌ Not yet — keep watching the numbers!</p>
            </motion.div>
          )}

          {roomState === 'waiting' && !bingoState?.roomId && (
            <div className="text-center py-8 flex flex-col items-center gap-3">
              <div className="text-5xl opacity-30">🎯</div>
              <p className="text-gray-500 text-sm">Join a room from the Rooms tab to start playing.</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
