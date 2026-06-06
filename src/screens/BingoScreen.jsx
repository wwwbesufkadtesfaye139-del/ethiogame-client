import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { useGame } from '../context/GameContext';

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
  <motion.div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80"
    initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
    {Array.from({ length:20 }).map((_,i) => (
      <motion.div key={i} className="absolute w-3 h-3 rounded-full"
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
      {prize && <p className="text-green-400 font-bold text-lg">+{prize} Birr</p>}
      <p className="text-gray-300 text-center text-sm">You won the prize pool!<br/>Check your wallet for the payout.</p>
      <motion.button whileTap={{ scale:0.9 }} onClick={onClose}
        className="px-8 py-3 rounded-xl bg-[#F5A623] text-black font-bold"
        style={{fontFamily:'Syne,sans-serif'}}>Awesome! 🎊</motion.button>
    </motion.div>
  </motion.div>
);

// ── Stake Selector ────────────────────────────────────────────────────────────
const StakeSelector = ({ onSelect, balance }) => (
  <div className="flex flex-col gap-3">
    <div className="flex items-center justify-between mb-1">
      <h2 className="text-base font-bold text-white" style={{fontFamily:'Syne,sans-serif'}}>Choose Your Stake</h2>
      <span className="text-xs text-[#F5A623]">{balance?.toFixed(2)} Br available</span>
    </div>
    {STAKE_OPTIONS.map(stake => (
      <motion.button key={stake} whileTap={{ scale:0.97 }}
        onClick={() => onSelect(stake)}
        disabled={balance < stake}
        className={`w-full bg-[#181C27] border rounded-2xl p-4 flex items-center justify-between transition-all
          ${balance < stake ? 'border-gray-800 opacity-40 cursor-not-allowed' : 'border-[#2A2F45] hover:border-[#F5A623]/40'}`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#1E2235] border border-[#2A2F45] flex items-center justify-center">
            <span className="text-[#F5A623] font-extrabold text-sm">{stake}Br</span>
          </div>
          <div className="text-left">
            <p className="text-white font-bold text-sm" style={{fontFamily:'Syne,sans-serif'}}>{stake} Birr per Card</p>
            <p className="text-xs text-gray-500">Pick from 200 cards · Up to 200 players</p>
          </div>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-gray-500">
          <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </motion.button>
    ))}
  </div>
);

// ── Card Grid (200 cards) ─────────────────────────────────────────────────────
const CardGrid = ({ stake, roomCards, selectedCards, onToggleCard, onBuy, balance, buying, roomId, roomState }) => {
  const [preview, setPreview] = useState(null);

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
        {roomCards.map(({ cardNumber, card, isTaken }) => {
          const isSelected = selectedCards.includes(cardNumber);
          return (
            <motion.button key={cardNumber} whileTap={{ scale:0.88 }}
              disabled={isTaken}
              onClick={() => {
                if (!isTaken) {
                  onToggleCard(cardNumber);
                  setPreview({ cardNumber, card });
                }
              }}
              className={`aspect-square rounded-lg text-[10px] font-bold transition-all flex items-center justify-center
                ${isTaken    ? 'bg-red-900/40 text-red-600 cursor-not-allowed' :
                  isSelected ? 'bg-[#F5A623] text-black shadow-[0_0_8px_rgba(245,166,35,0.5)]' :
                  'bg-[#1E2235] text-gray-400 hover:bg-[#2A2F45]'}`}>
              {cardNumber}
            </motion.button>
          );
        })}
      </div>

      <p className="text-xs text-gray-600 text-center">
        Tap a number to preview its card · Red = taken · Gold = selected
      </p>
    </div>
  );
};

// ── Active Game View ──────────────────────────────────────────────────────────
const ActiveGame = ({ bingoState, onClaim, claimResult }) => {
  const calledNumbers = bingoState?.calledNumbers || [];
  const lastDrawn     = bingoState?.lastDrawn;
  const ownedCards    = bingoState?.ownedCards    || [];
  const [activeCard,  setActiveCard] = useState(0);

  return (
    <div className="flex flex-col gap-4">
      {/* Status */}
      <div className="bg-green-950/40 border border-green-500/30 rounded-xl px-4 py-3 text-center">
        <p className="text-green-400 text-sm font-bold">🎲 Game in Progress!</p>
        <p className="text-xs text-gray-400">
          {bingoState?.playerCount} players · Prize: {bingoState?.winnerPrize} Birr
        </p>
      </div>

      {/* Last drawn number */}
      {lastDrawn && (
        <div className="flex items-center justify-center gap-3">
          <p className="text-xs text-gray-500">Last drawn:</p>
          <motion.div key={lastDrawn} initial={{ scale:0 }} animate={{ scale:1 }}
            className="w-12 h-12 rounded-full bg-[#F5A623] flex items-center justify-center text-black font-extrabold text-lg">
            {lastDrawn}
          </motion.div>
        </div>
      )}

      {/* Called numbers */}
      <div className="bg-[#181C27] border border-[#2A2F45] rounded-xl p-3">
        <p className="text-xs text-gray-500 mb-2">Called numbers ({calledNumbers.length}/75)</p>
        <div className="flex flex-wrap gap-1">
          {calledNumbers.map(n => (
            <span key={n} className="w-7 h-7 rounded-full bg-[#F5A623]/20 text-[#F5A623] text-[10px] font-bold flex items-center justify-center">
              {n}
            </span>
          ))}
        </div>
      </div>

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

      {/* Active card */}
      {ownedCards[activeCard] && (
        <div className="bg-[#181C27] border border-[#2A2F45] rounded-2xl p-4">
          <p className="text-xs text-gray-500 mb-2 text-center">Card #{ownedCards[activeCard].cardNumber}</p>
          <CardPreview card={ownedCards[activeCard].card} calledNumbers={calledNumbers} />
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
  const { balance, bingoState, setBingoState, getBingoCards, buyBingoCard, claimBingo } = useGame();

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

  // Switch to game view when game starts
  useEffect(() => {
    if (roomStateRef === 'active' && view === 'waiting') {
      setView('game');
    }
  }, [roomStateRef, view]);

  const handleSelectStake = useCallback((stake) => {
    setStake(stake);
    setView('loading'); // ✅ show loading state
    getBingoCards(stake, (res) => {
      if (res?.success) {
        setRoomCards(res.cards || []);
        setRoomId(res.roomId);
        setRoomState(res.state);
        setView('cards');
      } else {
        setBuyError(res?.message || 'Failed to load cards. Please try again.');
        setView('stakes');
      }
    });
  }, [getBingoCards]);

  const handleToggleCard = (cardNumber) => {
    setSelected(prev =>
      prev.includes(cardNumber)
        ? prev.filter(n => n !== cardNumber)
        : [...prev, cardNumber]
    );
  };

  const handleBuy = async () => {
    if (selectedCards.length === 0) return;
    setBuying(true);
    setBuyError('');

    // Buy cards one by one
    let successCount = 0;
    for (const cardNumber of selectedCards) {
      await new Promise(resolve => {
        buyBingoCard(selectedStake, cardNumber, (res) => {
          if (res?.success) {
            successCount++;
            // Update room cards
            setRoomCards(prev => prev.map(c =>
              c.cardNumber === cardNumber ? { ...c, isTaken: true } : c
            ));
            setRoomId(res.roomId);
          } else {
            setBuyError(res?.message || 'Failed to buy card.');
          }
          resolve();
        });
      });
    }

    setBuying(false);
    setSelected([]);

    if (successCount > 0) {
      setView('waiting');
    }
  };

  const handleClaim = () => {
    const rId = bingoState?.roomId || roomId;
    if (!rId) return;
    claimBingo(rId, (res) => {
      setClaimResult(res);
      if (res?.isWinner) {
        setVictory(true);
        setVictoryPrize(res.winnerPrize);
      }
    });
  };

  const handleBack = () => {
    if (view === 'cards')   { setView('stakes'); setSelected([]); }
    if (view === 'waiting') { setView('cards'); }
  };

  return (
    <div className="relative flex flex-col gap-4 p-4 pb-6 min-h-full">
      <AnimatePresence>
        {victory && (
          <BingoVictory prize={victoryPrize} onClose={() => { setVictory(false); setView('stakes'); setBingoState(null); }} />
        )}
      </AnimatePresence>

      {/* Back button */}
      {(view === 'cards' || view === 'waiting') && (
        <button onClick={handleBack} className="flex items-center gap-1 text-gray-400 text-sm w-fit">
          ← Back
        </button>
      )}

      {/* ── Loading view ── */}
      {view === 'loading' && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
          className="flex flex-col items-center justify-center gap-4 py-16">
          <motion.div animate={{ rotate:360 }} transition={{ repeat:Infinity, duration:0.8, ease:'linear' }}
            className="w-10 h-10 border-3 border-[#F5A623] border-t-transparent rounded-full" />
          <p className="text-gray-400 text-sm">Loading cards for {selectedStake} Birr room…</p>
        </motion.div>
      )}

      {/* ── Stakes view ── */}
      {view === 'stakes' && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
          {buyError && (
            <div className="bg-red-950/40 border border-red-500/30 rounded-xl px-4 py-3 mb-3 text-center">
              <p className="text-red-400 text-sm">{buyError}</p>
              <button onClick={() => setBuyError('')} className="text-xs text-gray-500 mt-1">Dismiss</button>
            </div>
          )}
          <StakeSelector onSelect={handleSelectStake} balance={balance} />
        </motion.div>
      )}

      {/* ── Cards view ── */}
      {view === 'cards' && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
          <CardGrid
            stake={selectedStake}
            roomCards={roomCards}
            selectedCards={selectedCards}
            onToggleCard={handleToggleCard}
            onBuy={handleBuy}
            balance={balance}
            buying={buying}
            roomId={roomId}
            roomState={roomState}
          />
          {buyError && <p className="text-xs text-red-400 text-center mt-2">{buyError}</p>}
        </motion.div>
      )}

      {/* ── Waiting view ── */}
      {view === 'waiting' && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="flex flex-col gap-4">
          <div className="bg-[#181C27] border border-[#2A2F45] rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
            <motion.div animate={{ rotate:360 }} transition={{ repeat:Infinity, duration:2, ease:'linear' }}
              className="w-16 h-16 border-4 border-[#F5A623] border-t-transparent rounded-full" />
            <div>
              <p className="text-white font-bold" style={{fontFamily:'Syne,sans-serif'}}>
                {bingoState?.state === 'countdown' ? '⏱ Game Starting Soon!' : '⏳ Waiting for Players…'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {bingoState?.playerCount || 1} player(s) joined
              </p>
            </div>
            <div className="w-full">
              <p className="text-xs text-gray-500 mb-2">Your cards:</p>
              <div className="flex gap-2 flex-wrap justify-center">
                {(bingoState?.ownedCards || []).map(c => (
                  <span key={c.cardNumber} className="px-2 py-1 bg-[#F5A623]/20 text-[#F5A623] rounded-lg text-xs font-bold">
                    #{c.cardNumber}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Game view ── */}
      {view === 'game' && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
          <ActiveGame bingoState={bingoState} onClaim={handleClaim} claimResult={claimResult} />
        </motion.div>
      )}
    </div>
  );
      }
