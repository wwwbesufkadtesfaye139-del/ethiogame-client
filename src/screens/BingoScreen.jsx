import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback, memo } from 'react';
import { useGame } from '../context/GameContext';
import BingoCard from '../components/bingo/BingoCard';
import CalledNumbers from '../components/bingo/CalledNumbers';

const STAKE_OPTIONS = [10, 20, 50, 100, 200];
const COLS = ['B','I','N','G','O'];

// ── Mini 5x5 Card Preview ─────────────────────────────────────────────────────
const CardPreview = ({ card, calledNumbers = [] }) => {
  if (!card) return null;
  const called = new Set(calledNumbers);
  return (
    <div className="grid grid-cols-5 gap-0.5 w-full">
      {COLS.map(c => (
        <div key={c} className="text-center text-[9px] font-bold text-[#F5A623] py-0.5">{c}</div>
      ))}
      {card.map((row, ri) =>
        row.map((cell, ci) => {
          const isFree   = cell === 0;
          const isMarked = isFree || called.has(cell);
          return (
            <div key={`${ri}-${ci}`}
              className={`aspect-square flex items-center justify-center text-[10px] font-bold rounded
                ${isFree   ? 'bg-[#F5A623] text-black' :
                  isMarked ? 'bg-green-600 text-white'  :
                  'bg-[#1E2235] text-gray-300'}`}>
              {isFree ? '★' : cell}
            </div>
          );
        })
      )}
    </div>
  );
};

// ── Victory Screen ────────────────────────────────────────────────────────────
const BingoVictory = ({ prize, onClose }) => (
  <motion.div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 overflow-hidden"
    initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
    {Array.from({ length:20 }).map((_,i) => (
      <motion.div key={i} className="absolute w-3 h-3 rounded-full"
        style={{ background: ['#F5A623','#22C55E','#3B82F6','#A855F7','#EF4444'][i%5], top:'50%', left:'50%' }}
        animate={{ x:`${(Math.random()-0.5)*70}vw`, y:`${(Math.random()-0.5)*70}vh`, opacity:[1,1,0], scale:[0,1,0.5] }}
        transition={{ duration:1.2+Math.random(), delay:Math.random()*0.3 }} />
    ))}
    <motion.div initial={{ scale:0.3, y:50 }} animate={{ scale:1, y:0 }}
      transition={{ type:'spring', stiffness:300, delay:0.1 }}
      className="bg-[#181C27] border-2 border-[#F5A623] rounded-3xl p-8 flex flex-col items-center gap-4 mx-6">
      <motion.div animate={{ rotate:[0,15,-15,12,-12,0], scale:[1,1.2,0.9,1.1,1] }}
        transition={{ duration:0.8, delay:0.3 }} className="text-6xl">🎉</motion.div>
      <h2 className="text-3xl font-extrabold text-[#F5A623]" style={{fontFamily:'Syne,sans-serif'}}>BINGO!</h2>
      {prize && <p className="text-green-400 font-bold text-lg">+{prize} Birr</p>}
      <p className="text-gray-300 text-center text-sm">You won the prize pool!<br/>Check your wallet for the payout.</p>
      <motion.button whileTap={{ scale:0.9 }} onClick={onClose}
        className="px-8 py-3 rounded-xl bg-[#F5A623] text-black font-bold"
        style={{fontFamily:'Syne,sans-serif'}}>Awesome! 🎊</motion.button>
    </motion.div>
  </motion.div>
);

// ── Stake Selector ────────────────────────────────────────────────────────────
const StakeSelector = ({ onSelect, balance, activeStake, onResume }) => (
  <div className="flex flex-col gap-3">
    <div className="flex items-center justify-between mb-1">
      <h2 className="text-base font-bold text-white" style={{fontFamily:'Syne,sans-serif'}}>Choose Your Stake</h2>
      <span className="text-xs text-[#F5A623]">{balance?.toFixed(2)} Br available</span>
    </div>
    {STAKE_OPTIONS.map(stake => {
      const isActive = activeStake === stake;
      return (
        <motion.button key={stake} whileTap={{ scale:0.97 }}
          onClick={() => isActive ? onResume() : onSelect(stake)}
          disabled={!isActive && balance < stake}
          className={`w-full bg-[#181C27] border rounded-2xl p-4 flex items-center justify-between transition-all
            ${isActive
              ? 'border-green-500/60 shadow-[0_0_12px_rgba(34,197,94,0.2)]'
              : balance < stake ? 'border-gray-800 opacity-40 cursor-not-allowed' : 'border-[#2A2F45] hover:border-[#F5A623]/40'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center
              ${isActive ? 'bg-green-950/60 border-green-500/40' : 'bg-[#1E2235] border-[#2A2F45]'}`}>
              <span className={`font-extrabold text-sm ${isActive ? 'text-green-400' : 'text-[#F5A623]'}`}>{stake} Br</span>
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <p className="text-white font-bold text-sm" style={{fontFamily:'Syne,sans-serif'}}>{stake} Birr per Card</p>
                {isActive && <span className="px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold">LIVE</span>}
              </div>
              <p className="text-xs text-gray-500">
                {isActive ? 'You have an active game here' : 'Pick from 200 cards · Up to 200 players'}
              </p>
            </div>
          </div>
          {isActive
            ? <span className="px-3 py-1.5 rounded-xl bg-green-500 text-black text-xs font-bold flex-shrink-0"
                style={{fontFamily:'Syne,sans-serif'}}>Continue →</span>
            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-gray-500">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
          }
        </motion.button>
      );
    })}
  </div>
);

// ── Single card-grid cell (Phase 2: memoized) ─────────────────────────────────
// This is the fix for the biggest single render cost in the app: up to 200 of
// these mount at once, and a live 'bingo:cardTaken' listener re-renders the
// whole grid every time ANY of up to 200 players buys a card — i.e. exactly
// during the most contended, highest-frequency moment of the game. Memoizing
// each cell means a purchase only actually re-renders the 1 cell that changed
// instead of re-diffing all 200. Also swapped motion.button → plain button +
// CSS active-state transform, since Framer Motion's gesture tracking on 200
// simultaneous elements isn't free, and a CSS :active transform gives the
// same tap feedback without it.
const CardCell = memo(function CardCell({ cardNumber, isTaken, isSelected, onTap }) {
  return (
    <button
      disabled={isTaken}
      onClick={() => onTap(cardNumber)}
      className={`aspect-square rounded-lg text-[10px] font-bold flex items-center justify-center
        transition-transform duration-100 active:scale-90
        ${isTaken    ? 'bg-red-900/40 text-red-600 cursor-not-allowed' :
          isSelected ? 'bg-[#F5A623] text-black shadow-[0_0_8px_rgba(245,166,35,0.5)]' :
          'bg-[#1E2235] text-gray-400'}`}>
      {cardNumber}
    </button>
  );
});

// ── Card Grid (200 cards) ─────────────────────────────────────────────────────
const CardGrid = ({ stake, roomCards, selectedCards, onToggleCard, onBuy, balance, buying, roomId, roomState }) => {
  const [preview, setPreview] = useState(null);

  const handleTap = useCallback((cardNumber) => {
    const target = roomCards.find(c => c.cardNumber === cardNumber);
    if (!target || target.isTaken) return;
    onToggleCard(cardNumber);
    setPreview({ cardNumber, card: target.card });
  }, [roomCards, onToggleCard]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white" style={{fontFamily:'Syne,sans-serif'}}>
            {stake} Birr Room
          </h2>
          <p className="text-xs text-gray-500">
            {roomCards.filter(c => c.isTaken).length}/200 cards taken
          </p>
        </div>
        {roomState === 'countdown' && (
          <span className="text-xs font-bold px-2 py-1 rounded-lg bg-amber-900/40 text-amber-400">
            ⏱ Starting…
          </span>
        )}
      </div>

      {/* Selected cards summary */}
      {selectedCards.length > 0 && (
        <div className="bg-[#1E2235] border border-[#F5A623]/30 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Selected: {selectedCards.length} card(s)</p>
            <p className="text-sm font-bold text-[#F5A623]">Total: {selectedCards.length * stake} Birr</p>
          </div>
          <motion.button whileTap={{ scale:0.94 }} onClick={onBuy}
            disabled={buying || balance < stake * selectedCards.length}
            className="px-4 py-2 rounded-xl bg-[#F5A623] text-black font-bold text-sm disabled:opacity-40"
            style={{fontFamily:'Syne,sans-serif'}}>
            {buying ? '⏳' : '▶ START!'}
          </motion.button>
        </div>
      )}

      {/* Card preview */}
      {preview !== null && (
        <div className="bg-[#181C27] border border-[#2A2F45] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-white">Card #{preview.cardNumber}</p>
            <button onClick={() => setPreview(null)} className="text-gray-500 text-xs">✕ Close</button>
          </div>
          <CardPreview card={preview.card} />
        </div>
      )}

      {/* 200 cards grid */}
      <div className="grid grid-cols-10 gap-1">
        {roomCards.map(({ cardNumber, isTaken }) => (
          <CardCell
            key={cardNumber}
            cardNumber={cardNumber}
            isTaken={isTaken}
            isSelected={selectedCards.includes(cardNumber)}
            onTap={handleTap}
          />
        ))}
      </div>

      <p className="text-xs text-gray-600 text-center">
        Tap a number to preview its card · Red = taken · Gold = selected
      </p>
    </div>
  );
};

// ── Active Game View ──────────────────────────────────────────────────────────
const ActiveGame = ({ bingoState, onClaim, claimResult, onBack }) => {
  const calledNumbers = bingoState?.calledNumbers || [];
  const lastDrawn     = bingoState?.lastDrawn;
  const ownedCards    = bingoState?.ownedCards    || [];
  const [activeCard,  setActiveCard] = useState(0);
  const [daubedMap,   setDaubedMap]  = useState({}); // { [cardNumber]: Set<"r-c"> }

  const activeCardNumber = ownedCards[activeCard]?.cardNumber;
  const activeDaubed = daubedMap[activeCardNumber] || new Set();

  const handleDaub = useCallback((key) => {
    setDaubedMap(prev => {
      const current = new Set(prev[activeCardNumber] || []);
      if (current.has(key)) {
        current.delete(key);
      } else {
        current.add(key);
      }
      return { ...prev, [activeCardNumber]: current };
    });
  }, [activeCardNumber]);

  // Bug 3 Fix: When game is finished show winner announcement for all other players.
  // (The actual winner already sees BingoVictory via the victory state in the parent.)
  if (bingoState?.state === 'finished') {
    const winner = bingoState?.winners?.[0];
    const prize  = bingoState?.winnerPrize;
    return (
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
        className="flex flex-col items-center gap-6 py-8">
        <div className="text-6xl">🏆</div>
        <div className="bg-[#181C27] border-2 border-[#F5A623]/50 rounded-2xl p-6 flex flex-col items-center gap-3 text-center w-full">
          <p className="text-xs text-gray-500 uppercase tracking-widest">Game Over</p>
          <h2 className="text-2xl font-extrabold text-[#F5A623]" style={{fontFamily:'Syne,sans-serif'}}>
            {winner?.username || 'A player'} Won!
          </h2>
          {prize && (
            <p className="text-green-400 font-bold text-lg">Prize: {prize} Birr</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {calledNumbers.length} numbers were called
          </p>
        </div>
        <motion.button whileTap={{ scale:0.94 }} onClick={onBack}
          className="px-8 py-3 rounded-xl bg-[#1E2235] border border-[#2A2F45] text-white font-bold text-sm"
          style={{fontFamily:'Syne,sans-serif'}}>
          ← Back to Lobby
        </motion.button>
      </motion.div>
    );
  }

  // ✅ FIX #7 — All 75 numbers were drawn and nobody got Bingo.
  // The server has already refunded everyone's stake (BingoRoom._handleNoWinner
  // + the FIX #5 balance push), so this screen is purely informational —
  // it just needs to get the player off the frozen "Game in Progress" view
  // and tell them their money is safely back.
  if (bingoState?.state === 'noWinner') {
    return (
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
        className="flex flex-col items-center gap-6 py-8">
        <div className="text-6xl">😬</div>
        <div className="bg-[#181C27] border-2 border-[#2A2F45] rounded-2xl p-6 flex flex-col items-center gap-3 text-center w-full">
          <p className="text-xs text-gray-500 uppercase tracking-widest">Game Over</p>
          <h2 className="text-2xl font-extrabold text-gray-200" style={{fontFamily:'Syne,sans-serif'}}>
            No Winner This Round
          </h2>
          <p className="text-sm text-gray-400">
            All 75 numbers were called and nobody got Bingo. Your stake has been refunded to your balance.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {calledNumbers.length} numbers were called
          </p>
        </div>
        <motion.button whileTap={{ scale:0.94 }} onClick={onBack}
          className="px-8 py-3 rounded-xl bg-[#1E2235] border border-[#2A2F45] text-white font-bold text-sm"
          style={{fontFamily:'Syne,sans-serif'}}>
          ← Back to Lobby
        </motion.button>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Status */}
      <div className="bg-green-950/40 border border-green-500/30 rounded-xl px-4 py-3 text-center">
        <p className="text-green-400 text-sm font-bold">🎲 Game in Progress!</p>
        <p className="text-xs text-gray-400">
          {bingoState?.playerCount} players · Prize: {bingoState?.winnerPrize} Birr
        </p>
      </div>

      {/* Called numbers — collapsible panel with last-drawn highlight */}
      <CalledNumbers calledNumbers={calledNumbers} lastDrawn={lastDrawn} />

      {/* My cards tabs */}
      {ownedCards.length > 1 && (
        <div className="flex gap-1">
          {ownedCards.map((c, i) => (
            <button key={c.cardNumber} onClick={() => setActiveCard(i)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all
                ${activeCard === i ? 'bg-[#F5A623] text-black' : 'bg-[#1E2235] text-gray-400'}`}>
              #{c.cardNumber}
            </button>
          ))}
        </div>
      )}

      {/* Active card — interactive daubing */}
      {ownedCards[activeCard] && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-500 text-center">Card #{ownedCards[activeCard].cardNumber} · Tap called numbers to daub</p>
          <BingoCard
            card={ownedCards[activeCard].card}
            daubed={activeDaubed}
            calledNumbers={calledNumbers}
            onDaub={handleDaub}
          />
        </div>
      )}

      {/* Claim button */}
      <motion.button whileTap={{ scale:0.94 }} onClick={onClaim}
        className="w-full py-4 rounded-2xl text-black text-xl font-extrabold shadow-[0_0_30px_rgba(245,166,35,0.5)]"
        style={{ background:'linear-gradient(135deg,#F5A623,#C47F0E)', fontFamily:'Syne,sans-serif' }}>
        🎉 BINGO!
      </motion.button>

      {claimResult && !claimResult.isWinner && (
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
          className="bg-red-950/40 border border-red-500/30 rounded-xl px-4 py-3 text-center">
          <p className="text-red-400 text-sm">❌ Not yet — keep watching!</p>
        </motion.div>
      )}
    </div>
  );
};

// ── Main BingoScreen ──────────────────────────────────────────────────────────
export default function BingoScreen() {
  const { balance, bingoState, setBingoState, getBingoCards, buyBingoCard, claimBingo, socket } = useGame();

  const [view,          setView]         = useState('stakes');  // stakes | cards | waiting | game
  const [selectedStake, setStake]        = useState(null);
  const [roomCards,     setRoomCards]    = useState([]);
  const [roomId,        setRoomId]       = useState(null);
  const [roomState,     setRoomState]    = useState('waiting');
  const [selectedCards, setSelected]     = useState([]);
  const [buying,        setBuying]       = useState(false);
  const [buyError,      setBuyError]     = useState('');
  const [victory,       setVictory]      = useState(false);
  const [victoryPrize,  setVictoryPrize] = useState(null);
  const [claimResult,   setClaimResult]  = useState(null);

  const roomStateRef = bingoState?.state;

  // Resume: when user navigates away and comes back, restore the correct view.
  // This runs once on mount — if we're already mid-game, skip the stakes screen.
  useEffect(() => {
    if (!bingoState) return;
    if (bingoState.state === 'active') {
      if (bingoState.stake)  setStake(bingoState.stake);
      if (bingoState.roomId) setRoomId(bingoState.roomId);
      setView('game');
    } else if (bingoState.state === 'countdown' || bingoState.state === 'waiting') {
      if (bingoState.stake)  setStake(bingoState.stake);
      if (bingoState.roomId) setRoomId(bingoState.roomId);
      setView('cards');
    }
  }, []); //
