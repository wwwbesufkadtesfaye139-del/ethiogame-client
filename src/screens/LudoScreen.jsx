import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import LudoBoard       from '../components/ludo/LudoBoard';
import LudoDice        from '../components/ludo/LudoDice';
import LudoRoomCreator from '../components/ludo/LudoRoomCreator';
import { useGame }     from '../context/GameContext';

const MOCK_PLAYERS = [
  { telegramId:'me',    username:'You',   color:'red',    pieces:[-1,-1,-1,-1] },
  { telegramId:'p2',    username:'Abebe', color:'blue',   pieces:[-1,-1,-1,-1] },
];

export default function LudoScreen() {
  const { ludoState, createLudoRoom, rollDice, movePiece, listLudoRooms, joinLudoRoom, telegramId } = useGame();
  const [showCreator,  setShowCreator]  = useState(false);
  const [showRooms,    setShowRooms]    = useState(false);
  const [rolling,      setRolling]      = useState(false);
  const [diceValue,    setDiceValue]    = useState(null);
  const [ludoRooms,    setLudoRooms]    = useState([]);    // Bug 5 Fix: real rooms from server
  const [loadingRooms, setLoadingRooms] = useState(false); // Bug 5 Fix: loading state

  // Bug 4 Fix: telegramId now comes from GameContext (real Telegram user ID)
  // Removed: const telegramId = 'me';
  const gameState  = ludoState?.state || 'idle';
  const players    = ludoState?.players || MOCK_PLAYERS;
  const currentTurn = ludoState?.currentTurnTelegramId || '';
  const boardState  = ludoState?.boardState || [];
  const isMyTurn    = currentTurn === telegramId;

  const handleCreate = (opts) => {
    createLudoRoom(opts, (res) => {
      if (res?.success) setShowCreator(false);
    });
  };

  const handleRoll = () => {
    if (!isMyTurn || rolling) return;
    setRolling(true);
    rollDice(ludoState?.roomId, (res) => {
      if (res?.success) setDiceValue(res.diceValue);
      setTimeout(() => setRolling(false), 700);
    });
    // demo fallback
    if (!ludoState?.roomId) {
      const v = Math.ceil(Math.random()*6);
      setDiceValue(v);
      setTimeout(() => setRolling(false), 700);
    }
  };

  const handlePieceClick = (idx) => {
    if (!diceValue || !isMyTurn) return;
    movePiece(ludoState?.roomId, idx, diceValue, () => setDiceValue(null));
  };

  // Game over banner
  if (ludoState?.state === 'finished') {
    const winner = ludoState.winner;
    return (
      <div className="flex flex-col items-center justify-center h-full gap-5 p-6 text-center">
        <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', stiffness:260 }}
          className="text-6xl">👑</motion.div>
        <h2 className="text-2xl font-extrabold text-[#F5A623]" style={{fontFamily:'Syne,sans-serif'}}>
          {winner?.telegramId === telegramId ? 'You Won!' : `${winner?.username} Won!`}
        </h2>
        <p className="text-gray-400 text-sm">Prize: <span className="text-[#F5A623] font-bold">{ludoState.winnerPrize} Birr</span></p>
        <motion.button whileTap={{ scale:0.92 }} onClick={() => window.location.reload()}
          className="px-8 py-3 rounded-xl bg-[#F5A623] text-black font-bold"
          style={{fontFamily:'Syne,sans-serif'}}>
          Play Again
        </motion.button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-6 relative">
      {/* Header actions */}
      <div className="flex gap-2">
        <motion.button whileTap={{ scale:0.94 }} onClick={() => setShowCreator(true)}
          className="flex-1 py-3 rounded-xl bg-[#F5A623] text-black font-bold text-sm shadow-[0_0_16px_rgba(245,166,35,0.3)]"
          style={{fontFamily:'Syne,sans-serif'}}>
          + Create Room
        </motion.button>
        <motion.button whileTap={{ scale:0.94 }} onClick={() => {
            const opening = !showRooms;
            setShowRooms(opening);
            if (opening) {
              setLoadingRooms(true);
              listLudoRooms((res) => {
                setLoadingRooms(false);
                if (res?.success) setLudoRooms(res.rooms || []);
              });
            }
          }}
          className="flex-1 py-3 rounded-xl bg-[#1E2235] border border-[#2A2F45] text-gray-300 font-bold text-sm"
          style={{fontFamily:'Syne,sans-serif'}}>
          Browse Rooms
        </motion.button>
      </div>

      {/* Room waiting state */}
      {gameState === 'waiting' && ludoState?.roomId && (
        <div className="bg-[#1E2235] border border-[#2A2F45] rounded-2xl p-4 text-center">
          <p className="text-sm text-gray-400">Waiting for players…</p>
          <p className="text-lg font-bold text-white mt-1">{ludoState.playerCount}/{ludoState.maxPlayers} joined</p>
          <div className="w-full bg-[#2A2F45] rounded-full h-1.5 mt-2">
            <motion.div className="h-1.5 rounded-full bg-[#F5A623]"
              animate={{ width:`${((ludoState.playerCount||1)/(ludoState.maxPlayers||4))*100}%` }} />
          </div>
        </div>
      )}

      {/* Board */}
      {(gameState === 'active' || gameState === 'idle') && (
        <LudoBoard players={players} boardState={boardState} currentTurnTelegramId={currentTurn}
          telegramId={telegramId} onPieceClick={handlePieceClick} />
      )}

      {/* Prize info */}
      {ludoState?.totalPool > 0 && (
        <div className="flex gap-2">
          {[
            { l:'Prize Pool', v:`${ludoState.winnerPrize} Br`, c:'text-[#F5A623]' },
            { l:'Win Condition', v:`${ludoState.winCondition} king${ludoState.winCondition>1?'s':''}`, c:'text-purple-400' },
          ].map(i => (
            <div key={i.l} className="flex-1 bg-[#181C27] border border-[#2A2F45] rounded-xl p-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">{i.l}</p>
              <p className={`text-sm font-bold font-mono ${i.c}`}>{i.v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Dice section */}
      {(gameState === 'active' || gameState === 'idle') && (
        <div className="bg-[#181C27] border border-[#2A2F45] rounded-2xl p-5">
          <LudoDice value={diceValue} rolling={rolling} canRoll={isMyTurn && gameState === 'active'} onRoll={handleRoll} />
        </div>
      )}

      {/* Browse rooms list */}
      <AnimatePresence>
        {showRooms && (
          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:8 }}
            className="bg-[#181C27] border border-[#2A2F45] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2F45]">
              <h3 className="font-bold text-white text-sm" style={{fontFamily:'Syne,sans-serif'}}>Open Rooms</h3>
              <button onClick={() => setShowRooms(false)} className="text-gray-500 text-xs">Close</button>
            </div>
            <div className="flex flex-col divide-y divide-[#2A2F45] max-h-48 overflow-y-auto">
              {loadingRooms && (
                <p className="text-center text-gray-500 text-xs py-4">Loading rooms…</p>
              )}
              {!loadingRooms && ludoRooms.length === 0 && (
                <p className="text-center text-gray-500 text-xs py-4">No open rooms right now</p>
              )}
              {!loadingRooms && ludoRooms.map(r => (
                <div key={r.roomId} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm text-white font-semibold">{r.stake} Br stake</p>
                    <p className="text-xs text-gray-500">{r.playerCount}/{r.maxPlayers} players · {r.winCondition} king{r.winCondition>1?'s':''}</p>
                  </div>
                  <motion.button whileTap={{ scale:0.9 }}
                    onClick={() => joinLudoRoom(r.roomId, (res) => {
                      if (res?.success) setShowRooms(false);
                    })}
                    className="px-3 py-1.5 rounded-lg bg-[#F5A623]/15 text-[#F5A623] text-xs font-bold border border-[#F5A623]/30"
                    style={{fontFamily:'Syne,sans-serif'}}>
                    Join
                  </motion.button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Room Creator Modal */}
      <AnimatePresence>
        {showCreator && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="absolute inset-0 z-40 bg-black/70 flex items-end"
            onClick={() => setShowCreator(false)}>
            <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
              transition={{ type:'spring', damping:26, stiffness:300 }}
              className="w-full" onClick={e => e.stopPropagation()}>
              <LudoRoomCreator
                onClose={() => setShowCreator(false)}
                onCreate={handleCreate}
                isCreator={ludoState?.isCreator}
                roomId={ludoState?.roomId}
                playerCount={ludoState?.playerCount || 1}
                maxPlayers={ludoState?.maxPlayers || 2}
                onCancelRoom={() => { setShowCreator(false); /* emit cancel */ }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
