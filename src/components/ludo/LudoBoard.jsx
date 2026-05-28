import { motion } from 'framer-motion';

const COLORS = {
  red:    { bg:'bg-red-500/80',    ring:'ring-red-400',   home:'bg-red-950/60',    border:'border-red-500/40',   text:'text-red-300'    },
  blue:   { bg:'bg-blue-500/80',   ring:'ring-blue-400',  home:'bg-blue-950/60',   border:'border-blue-500/40',  text:'text-blue-300'   },
  green:  { bg:'bg-green-500/80',  ring:'ring-green-400', home:'bg-green-950/60',  border:'border-green-500/40', text:'text-green-300'  },
  yellow: { bg:'bg-yellow-400/80', ring:'ring-yellow-300',home:'bg-yellow-950/60', border:'border-yellow-500/40',text:'text-yellow-300' },
};

function HomeBase({ color, pieces, onPieceClick, isActive }) {
  const c = COLORS[color];
  return (
    <div className={`rounded-2xl border-2 ${c.home} ${c.border} p-2.5 flex flex-col gap-1.5 transition-all ${isActive?'shadow-lg':'opacity-70'}`}>
      <p className={`text-[9px] font-bold uppercase tracking-widest text-center ${c.text}`} style={{fontFamily:'Syne,sans-serif'}}>{color}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {pieces.map((pos, idx) => {
          const isHome = pos === -1;
          const isKing = pos === 57;
          return (
            <motion.button key={idx} whileTap={{ scale:0.85 }}
              onClick={() => onPieceClick?.(idx)}
              className={`aspect-square rounded-full flex items-center justify-center text-white font-bold text-xs border-2
                ${c.bg} ${isActive && isHome ? `${c.ring} ring-2 animate-pulse cursor-pointer` : 'cursor-default'}
                ${isKing ? 'ring-2 ring-yellow-300 shadow-[0_0_8px_rgba(253,224,71,0.6)]' : ''}`}>
              {isKing ? '♛' : idx+1}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function BoardCell({ color, hasPiece, isSafe, isFinish }) {
  const c = color ? COLORS[color] : null;
  return (
    <div className={`aspect-square rounded-sm border flex items-center justify-center text-[8px] relative
      ${isSafe    ? 'bg-yellow-900/30 border-yellow-700/40' :
        isFinish  ? 'bg-[#1E2235] border-[#2A2F45]' :
                    'bg-[#181C27] border-[#2A2F45]'}`}>
      {isSafe && <span className="text-yellow-500 text-[6px] absolute top-0.5 left-0.5">★</span>}
      {hasPiece && c && <div className={`w-3/4 h-3/4 rounded-full ${c.bg}`} />}
    </div>
  );
}

export default function LudoBoard({ players = [], boardState = [], currentTurnTelegramId, telegramId, onPieceClick }) {
  const myPlayer = players.find(p => p.telegramId === telegramId);
  const myColor  = myPlayer?.color || 'red';
  const isMyTurn = currentTurnTelegramId === telegramId;

  // Build base player pieces map
  const playerMap = {};
  (boardState.length ? boardState : players).forEach(p => {
    playerMap[p.color] = p.pieces || [-1,-1,-1,-1];
  });

  const redPieces    = playerMap['red']    || [-1,-1,-1,-1];
  const bluePieces   = playerMap['blue']   || [-1,-1,-1,-1];
  const greenPieces  = playerMap['green']  || [-1,-1,-1,-1];
  const yellowPieces = playerMap['yellow'] || [-1,-1,-1,-1];

  // Show 5×5 simplified board center
  const centerBoard = Array(5).fill(null).map((_,r) =>
    Array(5).fill(null).map((_,c) => ({ isSafe: (r===2&&c===2), color:null }))
  );

  const isActive = (color) => {
    const p = players.find(pl => pl.color === color);
    return p?.telegramId === currentTurnTelegramId;
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Turn banner */}
      <div className={`text-center py-2 rounded-xl text-sm font-bold ${isMyTurn ? 'bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30' : 'bg-[#1E2235] text-gray-500 border border-[#2A2F45]'}`}
        style={{fontFamily:'Syne,sans-serif'}}>
        {isMyTurn ? '🎲 Your Turn!' : `Waiting for ${players.find(p=>p.telegramId===currentTurnTelegramId)?.username || '…'}`}
      </div>

      {/* Board layout: 2×2 home bases + center */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
        {/* Row 1: Red (TL) | Top path | Blue (TR) */}
        <HomeBase color="red"    pieces={redPieces}    onPieceClick={isMyTurn&&myColor==='red'?onPieceClick:null}    isActive={isActive('red')} />
        <div className="w-24 flex flex-col gap-px">
          {Array(6).fill(0).map((_,i)=>(
            <div key={i} className="grid grid-cols-3 gap-px">
              {Array(3).fill(0).map((_,j)=><BoardCell key={j} isSafe={i===2&&j===1}/>)}
            </div>
          ))}
        </div>
        <HomeBase color="blue"   pieces={bluePieces}   onPieceClick={isMyTurn&&myColor==='blue'?onPieceClick:null}   isActive={isActive('blue')} />

        {/* Row 2: Left path | Center | Right path */}
        <div className="flex flex-col gap-px">
          {Array(3).fill(0).map((_,i)=>(
            <div key={i} className="grid grid-cols-6 gap-px">
              {Array(6).fill(0).map((_,j)=><BoardCell key={j} isSafe={i===1&&j===4}/>)}
            </div>
          ))}
        </div>
        {/* Center star */}
        <div className="w-24 h-full bg-[#1E2235] rounded-xl border border-[#2A2F45] flex items-center justify-center">
          <div className="text-2xl text-[#F5A623] opacity-40">★</div>
        </div>
        <div className="flex flex-col gap-px">
          {Array(3).fill(0).map((_,i)=>(
            <div key={i} className="grid grid-cols-6 gap-px">
              {Array(6).fill(0).map((_,j)=><BoardCell key={j} isSafe={i===1&&j===1}/>)}
            </div>
          ))}
        </div>

        {/* Row 3: Green (BL) | Bottom path | Yellow (BR) */}
        <HomeBase color="green"  pieces={greenPieces}  onPieceClick={isMyTurn&&myColor==='green'?onPieceClick:null}  isActive={isActive('green')} />
        <div className="w-24 flex flex-col gap-px">
          {Array(6).fill(0).map((_,i)=>(
            <div key={i} className="grid grid-cols-3 gap-px">
              {Array(3).fill(0).map((_,j)=><BoardCell key={j} isSafe={i===3&&j===1}/>)}
            </div>
          ))}
        </div>
        <HomeBase color="yellow" pieces={yellowPieces} onPieceClick={isMyTurn&&myColor==='yellow'?onPieceClick:null} isActive={isActive('yellow')} />
      </div>

      {/* Player legend */}
      {players.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {players.map(p => (
            <div key={p.telegramId} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs ${COLORS[p.color]?.home} ${COLORS[p.color]?.border} ${p.telegramId===currentTurnTelegramId?'ring-1 '+COLORS[p.color]?.ring:''}`}>
              <span className={`w-2 h-2 rounded-full ${COLORS[p.color]?.bg}`}/>
              <span className={COLORS[p.color]?.text} style={{fontFamily:'Syne,sans-serif'}}>{p.username}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
