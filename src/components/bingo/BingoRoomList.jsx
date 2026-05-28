import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const STAKE_OPTIONS = [10, 20, 50, 100, 200];

// Generate mock room data for 200 rooms
const genRooms = () => Array.from({ length: 200 }, (_, i) => ({
  roomId: `bingo_room_${i + 1}`,
  stake: STAKE_OPTIONS[i % STAKE_OPTIONS.length],
  playerCount: Math.floor(Math.random() * 12),
  state: Math.random() > 0.7 ? 'countdown' : Math.random() > 0.5 ? 'active' : 'waiting',
  countdownSec: Math.floor(Math.random() * 30),
}));

const STATE_STYLES = {
  waiting:   { dot: 'bg-gray-500',  label: 'Waiting',    bg: 'border-[#2A2F45]' },
  countdown: { dot: 'bg-[#F5A623]', label: 'Starting…',  bg: 'border-[#F5A623]/40 bg-[#F5A623]/5' },
  active:    { dot: 'bg-green-400', label: 'Live',        bg: 'border-green-500/30 bg-green-900/10' },
};

export default function BingoRoomList({ onJoin }) {
  const [rooms, setRooms]         = useState(genRooms);
  const [filter, setFilter]       = useState('all');
  const [stakeFilter, setStake]   = useState('all');

  // Simulate live countdown ticks
  useEffect(() => {
    const t = setInterval(() => {
      setRooms(rs => rs.map(r => r.state === 'countdown'
        ? { ...r, countdownSec: Math.max(0, r.countdownSec - 1) }
        : r));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const visible = rooms.filter(r => {
    if (filter !== 'all' && r.state !== filter) return false;
    if (stakeFilter !== 'all' && r.stake !== Number(stakeFilter)) return false;
    return true;
  }).slice(0, 50); // cap at 50 for performance

  return (
    <div className="flex flex-col gap-3">
      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {['all','waiting','countdown','active'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${filter===f ? 'bg-[#F5A623] text-black border-[#F5A623]' : 'bg-[#1E2235] text-gray-400 border-[#2A2F45]'}`}
            style={{fontFamily:'Syne,sans-serif'}}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
        <div className="w-px bg-[#2A2F45] flex-shrink-0 mx-1" />
        {['all',...STAKE_OPTIONS.map(String)].map(s => (
          <button key={s} onClick={() => setStake(s)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${stakeFilter===s ? 'bg-[#1E2235] text-[#F5A623] border-[#F5A623]/50' : 'bg-[#1E2235] text-gray-500 border-[#2A2F45]'}`}
            style={{fontFamily:'Syne,sans-serif'}}>
            {s==='all' ? 'All Stakes' : `${s} Br`}
          </button>
        ))}
      </div>

      {/* Rooms grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {visible.map((room, i) => {
          const st = STATE_STYLES[room.state] || STATE_STYLES.waiting;
          return (
            <motion.div key={room.roomId}
              initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
              transition={{ delay: i * 0.015 }}
              className={`rounded-xl border p-3 flex flex-col gap-2 ${st.bg}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${st.dot} ${room.state==='countdown'?'animate-pulse':''}`} />
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{st.label}</span>
                </div>
                {room.state === 'countdown' && (
                  <span className="text-[10px] font-mono text-[#F5A623] font-bold">{room.countdownSec}s</span>
                )}
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <p className="text-lg font-bold text-[#F5A623]" style={{fontFamily:'Syne,sans-serif'}}>{room.stake} Br</p>
                  <p className="text-[10px] text-gray-500">{room.playerCount} player{room.playerCount!==1?'s':''}</p>
                </div>

                {room.state !== 'active' && (
                  <motion.button whileTap={{ scale:0.88 }}
                    onClick={() => onJoin?.(room.roomId, room.stake)}
                    className="px-3 py-1.5 rounded-lg bg-[#F5A623] text-black text-[11px] font-bold shadow-[0_0_12px_rgba(245,166,35,0.3)]"
                    style={{fontFamily:'Syne,sans-serif'}}>
                    Join
                  </motion.button>
                )}
                {room.state === 'active' && (
                  <span className="px-2 py-1 rounded-lg bg-green-900/40 text-green-400 text-[10px] font-semibold border border-green-500/20">Live</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="text-center text-xs text-gray-600 py-2">Showing {visible.length} of {rooms.length} rooms</p>
    </div>
  );
}
