import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

const Section = ({ label, children }) => (
  <div className="flex flex-col gap-2">
    <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">{label}</p>
    <div className="flex gap-2">{children}</div>
  </div>
);

const Chip = ({ label, value, active, onClick, sub }) => (
  <motion.button whileTap={{ scale:0.88 }} onClick={() => onClick(value)}
    className={`flex-1 py-3 rounded-xl border text-sm font-bold flex flex-col items-center gap-0.5 transition-all ${active
      ? 'bg-[#F5A623]/15 border-[#F5A623] text-[#F5A623] shadow-[0_0_12px_rgba(245,166,35,0.25)]'
      : 'bg-[#1E2235] border-[#2A2F45] text-gray-400 hover:border-[#3A3F55]'}`}
    style={{fontFamily:'Syne,sans-serif'}}>
    {label}
    {sub && <span className="text-[10px] text-gray-500 font-normal">{sub}</span>}
  </motion.button>
);

const STAKES = [10,20,50,100,200,500];

export default function LudoRoomCreator({ onClose, onCreate, isCreator, roomId, playerCount, maxPlayers, onCancelRoom }) {
  const [maxP,  setMaxP]  = useState(2);
  const [winC,  setWinC]  = useState(1);
  const [stake, setStake] = useState(20);
  const [timer, setTimer] = useState(120);
  const [loading, setLoading] = useState(false);

  // 120s auto-cancel countdown (only show to creator before anyone joins)
  useEffect(() => {
    if (!isCreator || playerCount > 1) return;
    if (timer <= 0) { onCancelRoom?.(); return; }
    const t = setInterval(() => setTimer(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [timer, isCreator, playerCount]);

  const handleCreate = () => {
    setLoading(true);
    onCreate?.({ maxPlayers:maxP, winCondition:winC, stake });
  };

  // If room is created and we're waiting
  if (isCreator && roomId) {
    return (
      <div className="bg-[#181C27] rounded-t-2xl p-5 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white" style={{fontFamily:'Syne,sans-serif'}}>Room Created</h2>
          <span className="text-xs text-gray-500 font-mono">{roomId.slice(-8)}</span>
        </div>

        <div className="bg-[#1E2235] rounded-xl p-4 border border-[#2A2F45] flex flex-col gap-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Players</span>
            <span className="text-white font-bold">{playerCount} / {maxPlayers}</span>
          </div>
          <div className="w-full bg-[#2A2F45] rounded-full h-1.5">
            <motion.div className="h-1.5 rounded-full bg-[#F5A623]"
              animate={{ width:`${(playerCount/maxPlayers)*100}%` }} />
          </div>
        </div>

        <p className="text-center text-sm text-gray-400">
          Waiting for <span className="text-white font-bold">{maxPlayers - playerCount}</span> more player{maxPlayers-playerCount!==1?'s':''}…
        </p>

        {playerCount === 1 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between bg-red-950/40 border border-red-500/30 rounded-xl px-4 py-2.5">
              <span className="text-xs text-red-400">Auto-cancel in</span>
              <span className={`font-mono font-bold text-sm ${timer <= 30 ? 'text-red-400 animate-pulse' : 'text-red-300'}`}>{timer}s</span>
            </div>
            <motion.button whileTap={{ scale:0.9 }}
              onClick={onCancelRoom}
              className="w-full py-3 rounded-xl border border-red-500/40 text-red-400 text-sm font-semibold"
              style={{fontFamily:'Syne,sans-serif'}}>
              Cancel Room
            </motion.button>
          </div>
        )}

        <motion.button whileTap={{ scale:0.95 }} onClick={onClose}
          className="w-full py-3 rounded-xl bg-[#1E2235] border border-[#2A2F45] text-gray-400 text-sm"
          style={{fontFamily:'Syne,sans-serif'}}>
          Minimise
        </motion.button>
      </div>
    );
  }

  return (
    <div className="bg-[#181C27] rounded-t-2xl p-5 flex flex-col gap-5">
      {/* Handle */}
      <div className="w-10 h-1 rounded-full bg-[#2A2F45] mx-auto -mt-1" />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white" style={{fontFamily:'Syne,sans-serif'}}>Create Ludo Room</h2>
        <motion.button whileTap={{ scale:0.9 }} onClick={onClose}
          className="w-8 h-8 rounded-lg bg-[#1E2235] border border-[#2A2F45] flex items-center justify-center text-gray-500">
          ✕
        </motion.button>
      </div>

      <Section label="Number of Players">
        {[2,3,4].map(n => <Chip key={n} label={`${n}P`} sub={n===2?'1v1':n===3?'3-way':'4-way'} value={n} active={maxP===n} onClick={setMaxP} />)}
      </Section>

      <Section label="Win Condition">
        {[1,2,4].map(n => <Chip key={n} label={`${n} King${n>1?'s':''}`} sub={n===1?'First piece':n===2?'Two pieces':'All pieces'} value={n} active={winC===n} onClick={setWinC} />)}
      </Section>

      <div className="flex flex-col gap-2">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Stake Amount (Birr)</p>
        <div className="grid grid-cols-3 gap-2">
          {STAKES.map(s => (
            <Chip key={s} label={`${s} Br`} value={s} active={stake===s} onClick={setStake} />
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-[#1E2235] rounded-xl border border-[#2A2F45] p-3.5 flex flex-col gap-1.5">
        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Prize Summary</p>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Total Pool</span>
          <span className="text-white font-mono font-bold">{stake * maxP} Br</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Platform Fee</span>
          <span className="text-red-400 font-mono">−{maxP} Br</span>
        </div>
        <div className="h-px bg-[#2A2F45] my-0.5" />
        <div className="flex justify-between">
          <span className="text-gray-300 font-semibold">Winner Prize</span>
          <span className="text-[#F5A623] font-mono font-bold text-base">{stake * maxP - maxP} Br</span>
        </div>
      </div>

      <motion.button whileTap={{ scale:0.96 }} onClick={handleCreate} disabled={loading}
        className="w-full py-4 rounded-xl bg-[#F5A623] text-black font-bold text-base shadow-[0_0_20px_rgba(245,166,35,0.4)] disabled:opacity-60"
        style={{fontFamily:'Syne,sans-serif'}}>
        {loading ? 'Creating…' : 'Create Room'}
      </motion.button>
    </div>
  );
}
