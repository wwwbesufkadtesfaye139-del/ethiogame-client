import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import BingoCard     from '../components/bingo/BingoCard';
import CalledNumbers from '../components/bingo/CalledNumbers';
import { useGame }   from '../context/GameContext';

const STAKE_OPTIONS = [10, 20, 50, 100, 200];

// ── Victory screen ────────────────────────────────────────────────────────────
const BingoVictory = ({ onClose }) => (
  <motion.div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80"
    initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
    {Array.from({ length:20 }).map((_,i) => (
      <motion.div key={i}
        className="absolute w-3 h-3 rounded-full"
        style={{ background: ['#F5A623','#22C55E','#3B82F6','#A855F7','#EF4444'][i%5], top:'50%', left:'50%' }}
        animate={{ x:(Math.random()-0.5)*300, y:(Math.random()-0.5)*500, opacity:[1,1,0], scale:[0,1,0.5] }}
        transition={{ duration:1.2+Math.random(), delay:Math.random()*0.3 }} />
    ))}
    <motion.div initial={{ scale:0.3, y:50 }} animate={{ scale:1, y:0 }}
      transition={{ type:'spring', stiffness:300, delay:0.1 }}
      className="bg-[#181C27] border-2 border-[#F5A623] rounded-3xl p-8 flex flex-col items-center gap-4 mx-6">
      <motion.div animate={{ rotate:[0,15,-15,12,-12,0], scale:[1,1.2,0.9,1.1,1] }}
        transition={{ duration:0.8, delay:0.3 }} className="text-6xl">🎉</motion.div>
      <h2 className="text-3xl font-extrabold text-[#F5A623]" style={{fontFamily:'Syne,sans-serif'}}>BINGO!</h2>
      <p className="text-gray-300 text-center text-sm">You won the prize pool!<br/>Check your wallet for the payout.</p>
      <motion.button whileTap={{ scale:0.9 }} onClick={onClose}
        className="px-8 py-3 rounded-xl bg-[#F5A623] text-black font-bold"
        style={{fontFamily:'Syne,sans-serif'}}>Awesome! 🎊</motion.button>
    </motion.div>
  </motion.div>
);

// ── Number Picker ─────────────────────────────────────────────────────────────
const NumberPicker = ({ onConfirm, onBack }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    const n = Number(input);
    if (!n || n < 1 || n > 200) {
      return setError('Please enter a number between 1 and 200');
    }
    onConfirm(n);
  };

  return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
      className="flex flex-col gap-5 p-4">
      <div className="text-center">
        <p className="text-2xl font-extrabold text-white mb-1" style={{fontFamily:'Syne,sans-serif'}}>
          Pick Your Lucky Number
        </p>
        <p className="text-sm text-gray-400">Choose any number from 1 to 200</p>
      </div>

      {/* Number input */}
      <div className="relative">
        <input
          type="number"
          value={input}
          onChange={e => { setInput(e.target.value); setError(''); }}
          placeholder="Enter 1 – 200"
          min={1} max={200}
          className="w-full bg-[#1E2235] border border-[#2A2F45] rounded-2xl px-5 py-5 text-white text-3xl font-mono text-center focus:outline-none focus:border-[#F5A623]/50"
        />
      </div>

      {/* Quick pick buttons */}
      <div>
        <p className="text-xs text-gray-500 mb-2 text-center">Or quick pick</p>
        <div className="grid grid-cols-5 gap-2">
          {[7, 13, 42, 77, 99, 108, 150, 168, 188, 200].map(n => (
            <motion.button key={n} whileTap={{ scale:0.88 }}
              onClick={() => { setInput(String(n)); setError(''); }}
              className={`py-2.5 rounded-xl text-sm font-bold border transition-all
                ${input === String(n)
                  ? 'bg-[#F5A623]/20 border-[#F5A623]/50 text-[#F5A623]'
                  : 'bg-[#1E2235] border-[#2A2F45] text-gray-400'}`}>
              {n}
            </motion.button>
          ))}
        </div>
      </div>

      {error && <p className="text-xs text-red-400 text-center">{error}</p>}

      <div className="flex gap-3">
        <motion.button whileTap={{ scale:0.96 }} onClick={onBack}
          className="flex-1 py-4 rounded-xl font-bold text-sm bg-[#1E2235] border border-[#2A2F45] text-gray-400"
          style={{fontFamily:'Syne,sans-serif'}}>
          ← Back
        </motion.button>
        <motion.button whileTap={{ scale:0.96 }} onClick={handleConfirm}
          disabled={!input}
          className="flex-1 py-4 rounded-xl font-bold text-base disabled:opacity-40"
          style={{ background: input ? '#F5A623' : '#1E2235', color: input ? '#0F1117' : '#4B5563', fontFamily:'Syne,sans-serif' }}>
          Confirm ✓
        </motion.button>
      </div>
    </motion.div>
  );
};

// ── Room List ─────────────────────────────────────────────────────────────────
const RoomList = ({ onSelectStake }) => {
  const { socket } = useGame();
  const [rooms, setRooms] = useState([]);

  // Fetch rooms on mount
  useState(() => {
    if (!socket) return;
    socket.emit('bingo:listRooms', {}, (res) => {
      if (res?.success) setRooms(res.rooms);
    });
  });

  const stakeOptions = rooms.length > 0 ? rooms : STAKE_OPTIONS.map(stake => ({
    stake, playerCount: 0, state: 'waiting', isAvailable: true,
  }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-bold text-white" style={{fontFamily:'Syne,sans-serif'}}>
          Choose Your Stake
        </h2>
        <span className="text-xs text-gray-500">One room per amount</span>
      </div>

      {stakeOptions.map((room) => (
        <motion.button key={room.stake} whileTap={{ scale:0.97 }}
          onClick={() => room.isAvailable !== false && onSelectStake(room.stake)}
          className={`w-full bg-[#181C27] border rounded-2xl p-4 flex items-center justify-between transition-all
            ${room.state === 'active'
              ? 'border-gray-700 opacity-50 cursor-not-allowed'
              : 'border-[#2A2F45] hover:border-[#F5A623]/40'}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#1E2235] border border-[#2A2F45] flex items-center justify-center">
              <span className="text-[#F5A623] font-extrabold text-sm" style={{fontFamily:'Syne,sans-serif'}}>
                {room.stake}Br
              </span>
            </div>
            <div className="text-left">
              <p className="text-white font-bold text-sm" style={{fontFamily:'Syne,sans-serif'}}>
                {room.stake} Birr Room
              </p>
              <p className="text-xs text-gray-500">
                {room.playerCount || 0} / 200 players
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2 py-1 rounded-lg
              ${room.state === 'active'    ? 'bg-red-900/40 text-red-400' :
                room.state === 'countdown' ? 'bg-amber-900/40 text-amber-400' :
                'bg-green-900/40 text-green-400'}`}>
              {room.state === 'active'    ? '🔴 Live' :
               room.state === 'countdown' ? '⏱ Starting' :
               '🟢 Open'}
            </span>
            {room.state !== 'active' && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                className="w-4 h-4 text-gray-500">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </motion.button>
      ))}
    </div>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function BingoScreen() {
  const { bingoState, joinBingo, claimBingo } = useGame();

  const [view,         setView]       = useState('rooms');   // 'rooms' | 'pick' | 'game'
  const [selectedStake, setStake]     = useState(null);
  const [daubed,       setDaubed]     = useState(new Set());
  const [victory,      setVictory]    = useState(false);
  const [claimResult,  setClaimResult] = useState(null);
  const [joining,      setJoining]    = useState(false);
  const [joinError,    setJoinError]  = useState('');

  const card          = bingoState?.card         || [];
  const calledNumbers = bingoState?.calledNumbers || [];
  const lastDrawn     = bingoState?.lastDrawn;
  const roomState     = bingoState?.state         || 'waiting';

  const handleSelectStake = (stake) => {
    setStake(stake);
    setView('pick');
  };

  const handlePickNumber = (pickedNumber) => {
    setJoining(true);
    setJoinError('');
    joinBingo(selectedStake, pickedNumber, (res) => {
      setJoining(false);
      if (res?.success) {
        setView('game');
        setDaubed(new Set());
      } else {
        setJoinError(res?.message || 'Failed to join. Please try again.');
      }
    });
  };

  const handleDaub = (key) => {
    setDaubed(prev => { const n = new Set(prev); n.add(key); return n; });
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
      <AnimatePresence>
        {victory && <BingoVictory onClose={() => setVictory(false)} />}
      </AnimatePresence>

      {/* Tab Switch — only show rooms/game tabs */}
      {view !== 'pick' && (
        <div className="flex gap-2 bg-[#181C27] border border-[#2A2F45] rounded-xl p-1">
          {[['rooms','🏠 Rooms'],['game','🎯 My Card']].map(([v,l]) => (
            <button key={v} onClick={() => setView(v)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all
                ${view===v ? 'bg-[#F5A623] text-black shadow-[0_0_12px_rgba(245,166,35,0.3)]' : 'text-gray-500'}`}
              style={{fontFamily:'Syne,sans-serif'}}>
              {l}
            </button>
          ))}
        </div>
      )}

      {/* ── Rooms view ── */}
      {view === 'rooms' && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
          <RoomList onSelectStake={handleSelectStake} />
        </motion.div>
      )}

      {/* ── Number picker view ── */}
      {view === 'pick' && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
          {/* Stake reminder */}
          <div className="bg-[#1E2235] border border-[#F5A623]/20 rounded-xl px-4 py-3 mb-2 flex items-center justify-between">
            <p className="text-xs text-gray-500">Selected Stake</p>
            <p className="text-sm font-bold text-[#F5A623]">{selectedStake} Birr</p>
          </div>

          <NumberPicker
            onConfirm={handlePickNumber}
            onBack={() => setView('rooms')}
          />

          {joining && (
            <div className="text-center mt-3">
              <motion.span animate={{ rotate:360 }} transition={{ repeat:Infinity, duration:0.8, ease:'linear' }}
                className="inline-block w-5 h-5 border-2 border-[#F5A623] border-t-transparent rounded-full" />
              <p className="text-xs text-gray-400 mt-1">Joining room…</p>
            </div>
          )}
          {joinError && <p className="text-xs text-red-400 text-center mt-2">{joinError}</p>}
        </motion.div>
      )}

      {/* ── Game view ── */}
      {view === 'game' && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="flex flex-col gap-4">

          {roomState === 'waiting' && (
            <div className="bg-[#1E2235] border border-[#2A2F45] rounded-xl px-4 py-3 text-center">
              <p className="text-white text-sm font-bold">⏳ Waiting for players…</p>
              <p className="text-xs text-gray-400">{bingoState?.playerCount || 1} player joined</p>
            </div>
          )}

          {roomState === 'countdown' && (
            <motion.div animate={{ opacity:[0.7,1,0.7] }} transition={{ repeat:Infinity, duration:1.2 }}
              className="bg-[#F5A623]/10 border border-[#F5A623]/30 rounded-xl px-4 py-3 text-center">
              <p className="text-[#F5A623] text-sm font-bold" style={{fontFamily:'Syne,sans-serif'}}>
                ⏱ Game starting soon!
              </p>
              <p className="text-xs text-gray-400">{bingoState?.playerCount} players joined — more can still join!</p>
            </motion.div>
          )}

          {roomState === 'active' && (
            <div className="bg-green-950/40 border border-green-500/30 rounded-xl px-4 py-3 text-center">
              <p className="text-green-400 text-sm font-bold">🎲 Game in Progress!</p>
              <p className="text-xs text-gray-400">{bingoState?.playerCount} players | Prize: {bingoState?.winnerPrize} Birr</p>
            </div>
          )}

          <CalledNumbers calledNumbers={calledNumbers} lastDrawn={lastDrawn} />

          {card.length > 0 && (
            <BingoCard card={card} daubed={daubed} calledNumbers={calledNumbers} onDaub={handleDaub} />
          )}

          {roomState === 'active' && (
            <motion.button whileTap={{ scale:0.94 }} onClick={handleClaimBingo}
              className="w-full py-4 rounded-2xl text-black text-xl font-extrabold shadow-[0_0_30px_rgba(245,166,35,0.5)]"
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

          {!bingoState?.roomId && (
            <div className="text-center py-8 flex flex-col items-center gap-3">
              <div className="text-5xl opacity-30">🎯</div>
              <p className="text-gray-500 text-sm">Join a room from the Rooms tab.</p>
              <motion.button whileTap={{ scale:0.96 }} onClick={() => setView('rooms')}
                className="px-6 py-2 rounded-xl bg-[#F5A623] text-black text-sm font-bold"
                style={{fontFamily:'Syne,sans-serif'}}>
                Browse Rooms
              </motion.button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
