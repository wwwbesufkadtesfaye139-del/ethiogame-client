/**
 * LudoScreen.jsx — fixed rolling-stuck bug + passes diceValue to LudoBoard
 *
 * Root cause of "Rolling and stuck":
 *   The server's ludoHandlers.js had `const room` missing in rollDice,
 *   so the ack callback never fired → setRolling(false) never ran.
 *   Fix 1: ludoHandlers.js now has the room lookup (already fixed).
 *   Fix 2: Added a 4-second safety timeout here so rolling ALWAYS unblocks.
 *   Fix 3: Pass diceValue down to LudoBoard so pieces know when to pulse.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import LudoBoard       from '../components/ludo/LudoBoard';
import LudoDice        from '../components/ludo/LudoDice';
import LudoRoomCreator from '../components/ludo/LudoRoomCreator';
import VictoryOverlay  from '../components/ludo/VictoryOverlay';
import { LUDO_PALETTE } from '../components/ludo/ludoTheme';
import useLudoSounds   from '../hooks/useLudoSounds';
import { useGame }     from '../context/GameContext';

export default function LudoScreen() {
  const {
    ludoState, createLudoRoom, rollDice,
    movePiece, listLudoRooms, joinLudoRoom, telegramId,
  } = useGame();

  const [showCreator,  setShowCreator]  = useState(false);
  const [showRooms,    setShowRooms]    = useState(false);
  const [rolling,      setRolling]      = useState(false);
  const [diceValue,    setDiceValue]    = useState(null);
  const [ludoRooms,    setLudoRooms]    = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const rollTimeoutRef = useRef(null);
  const sfx = useLudoSounds();
  const playedVictorySound = useRef(false);

  // Phase 2: if the player navigates off this screen mid-roll (e.g. taps
  // another tab right after rolling), the 4s safety timeout below would
  // previously still fire and call setRolling on a component that's no
  // longer mounted — harmless in React 18 but a stray timer/closure held
  // around for no reason. Clear it on unmount instead.
  useEffect(() => {
    return () => { if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current); };
  }, []);

  const gameState   = ludoState?.state || 'idle';
  const players     = ludoState?.players || [];
  const currentTurn = ludoState?.currentTurnTelegramId || '';
  const boardState  = ludoState?.boardState || [];
  const isMyTurn    = currentTurn === telegramId;

  useEffect(() => {
    if (gameState === 'finished' && !playedVictorySound.current) {
      playedVictorySound.current = true;
      sfx.victory();
    }
    if (gameState !== 'finished') playedVictorySound.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  const handleCreate = (opts) => {
    createLudoRoom(opts, (res) => {
      if (res?.success) setShowCreator(false);
    });
  };

  const handleRoll = () => {
    if (!isMyTurn || rolling) return;
    setRolling(true);
    sfx.diceRoll();

    // Safety net: always unblock after 4s even if server never acks
    if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current);
    rollTimeoutRef.current = setTimeout(() => {
      setRolling(false);
    }, 4000);

    rollDice(ludoState?.roomId, (res) => {
      clearTimeout(rollTimeoutRef.current);
      if (res?.success) {
        setDiceValue(res.diceValue);
        sfx.diceLand();
      }
      setRolling(false);
    });
  };

  const handlePieceClick = (idx) => {
    if (!diceValue || !isMyTurn) return;
    sfx.pieceMove();
    movePiece(ludoState?.roomId, idx, diceValue, (res) => {
      setDiceValue(null);
    });
  };

  // ── Game over ─────────────────────────────────────────────────────────────
  if (gameState === 'finished') {
    const winner = ludoState.winner;
    const iWon   = winner?.telegramId === telegramId;
    return (
      <VictoryOverlay
        iWon={iWon}
        winnerName={winner?.username}
        prize={ludoState.winnerPrize}
        onPlayAgain={() => window.location.reload()}
      />
    );
  }

  // ── Cancelled ─────────────────────────────────────────────────────────────
  if (gameState === 'cancelled') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
        <div className="text-5xl">⏱️</div>
        <h2 className="text-xl font-bold text-white" style={{ fontFamily:'Syne,sans-serif' }}>
          Room Cancelled
        </h2>
        <p className="text-gray-400 text-sm">{ludoState.message || 'No one joined in time. Your stake was refunded.'}</p>
        <motion.button whileTap={{ scale:0.92 }}
          onClick={() => window.location.reload()}
          className="px-8 py-3 rounded-xl bg-[#1E2235] border border-[#2A2F45] text-gray-300 font-bold"
          style={{ fontFamily:'Syne,sans-serif' }}>
          Back to Lobby
        </motion.button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4 pb-6 relative">

      {/* Header actions — only shown when not in active game */}
      {gameState !== 'active' && (
        <div className="flex gap-2">
          <motion.button whileTap={{ scale:0.94 }}
            onClick={() => { sfx.click(); setShowCreator(true); }}
            className="flex-1 py-3 rounded-xl font-bold text-sm text-black"
            style={{
              fontFamily:'Syne,sans-serif',
              background:'linear-gradient(135deg,#F5A623,#FF6B00)',
              boxShadow:'0 4px 18px rgba(245,166,35,0.4)',
            }}>
            + Create Room
          </motion.button>
          <motion.button whileTap={{ scale:0.94 }}
            onClick={() => {
              sfx.click();
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
            style={{ fontFamily:'Syne,sans-serif' }}>
            Browse Rooms
          </motion.button>
        </div>
      )}

      {/* Waiting for players bar */}
      {gameState === 'waiting' && ludoState?.roomId && (
        <motion.div
          initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
          className="bg-[#1E2235] border border-[#2A2F45] rounded-2xl p-4"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-white" style={{ fontFamily:'Syne,sans-serif' }}>
              Waiting for players…
            </p>
            <span className="text-xs text-gray-500 font-mono">{ludoState.playerCount}/{ludoState.maxPlayers}</span>
          </div>
          <div className="w-full bg-[#2A2F45] rounded-full h-2">
            <motion.div
              className="h-2 rounded-full"
              animate={{ width:`${((ludoState.playerCount||1)/(ludoState.maxPlayers||4))*100}%` }}
              style={{ background:'linear-gradient(90deg,#F5A623,#FF6B00)' }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Stake: <span className="text-[#F5A623] font-semibold">{ludoState.stake} Birr</span>
            {' · '}Win condition: <span className="text-white">{ludoState.winCondition} king{ludoState.winCondition>1?'s':''}</span>
          </p>
        </motion.div>
      )}

      {/* Prize info strip — only during active game */}
      {gameState === 'active' && ludoState?.totalPool > 0 && (
        <div className="flex gap-2">
          <div className="flex-1 bg-[#181C27] border border-[#2A2F45] rounded-xl px-3 py-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Prize Pool</p>
            <p className="text-sm font-bold font-mono text-[#F5A623]">{ludoState.winnerPrize} Br</p>
          </div>
          <div className="flex-1 bg-[#181C27] border border-[#2A2F45] rounded-xl px-3 py-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Win Condition</p>
            <p className="text-sm font-bold font-mono text-purple-400">
              {ludoState.winCondition} king{ludoState.winCondition>1?'s':''}
            </p>
          </div>
        </div>
      )}

      {/* Board */}
      {(gameState === 'active' || gameState === 'idle') && (
        <motion.div animate={{ scale: rolling ? 1.015 : 1 }} transition={{ duration: 0.35, ease: 'easeOut' }}>
          <LudoBoard
            players={players}
            boardState={boardState}
            currentTurnTelegramId={currentTurn}
            telegramId={telegramId}
            onPieceClick={handlePieceClick}
            diceValue={diceValue}
            lastMove={ludoState?.lastMove}
          />
        </motion.div>
      )}

      {/* Dice — only during active game */}
      {gameState === 'active' && (
        <div className="rounded-2xl p-5" style={{ background: LUDO_PALETTE.card, border: `1px solid ${LUDO_PALETTE.grid}22` }}>
          <LudoDice
            value={diceValue}
            rolling={rolling}
            canRoll={isMyTurn && !diceValue}
            onRoll={handleRoll}
          />
          {/* Hint when dice rolled but no piece tapped yet */}
          {diceValue && isMyTurn && (
            <motion.p
              initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }}
              className="text-center text-xs text-[#F5A623] mt-3 font-semibold"
              style={{ fontFamily:'Syne,sans-serif' }}
            >
              You rolled {diceValue} — tap a piece on the board!
            </motion.p>
          )}
        </div>
      )}

      {/* Browse rooms list */}
      <AnimatePresence>
        {showRooms && (
          <motion.div
            initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:8 }}
            className="bg-[#181C27] border border-[#2A2F45] rounded-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2F45]">
              <h3 className="font-bold text-white text-sm" style={{ fontFamily:'Syne,sans-serif' }}>Open Rooms</h3>
              <button onClick={() => setShowRooms(false)} className="text-gray-500 text-xs">Close</button>
            </div>
            <div className="flex flex-col divide-y divide-[#2A2F45] max-h-52 overflow-y-auto">
              {loadingRooms && <p className="text-center text-gray-500 text-xs py-4">Loading rooms…</p>}
              {!loadingRooms && ludoRooms.length === 0 && (
                <p className="text-center text-gray-500 text-xs py-4">No open rooms right now</p>
              )}
              {!loadingRooms && ludoRooms.map(r => (
                <div key={r.roomId} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm text-white font-semibold">{r.stake} Br stake</p>
                    <p className="text-xs text-gray-500">
                      {r.playerCount}/{r.maxPlayers} players · {r.winCondition} king{r.winCondition>1?'s':''}
                      {r.creatorUsername ? ` · ${r.creatorUsername}` : ''}
                    </p>
                  </div>
                  <motion.button whileTap={{ scale:0.9 }}
                    onClick={() => joinLudoRoom(r.roomId, (res) => {
                      if (res?.success) setShowRooms(false);
                    })}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border"
                    style={{
                      fontFamily:'Syne,sans-serif',
                      background:'rgba(245,166,35,0.12)',
                      color:'#F5A623',
                      borderColor:'rgba(245,166,35,0.35)',
                    }}>
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
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="absolute inset-0 z-40 bg-black/70 flex items-end"
            onClick={() => setShowCreator(false)}
          >
            <motion.div
              initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
              transition={{ type:'spring', damping:26, stiffness:300 }}
              className="w-full"
              onClick={e => e.stopPropagation()}
            >
              <LudoRoomCreator
                onClose={() => setShowCreator(false)}
                onCreate={handleCreate}
                isCreator={ludoState?.isCreator}
                roomId={ludoState?.roomId}
                playerCount={ludoState?.playerCount || 1}
                maxPlayers={ludoState?.maxPlayers || 2}
                onCancelRoom={() => setShowCreator(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
