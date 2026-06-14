/**
 * LudoBoard.jsx — full 15×15 visual board, drop-in replacement
 *
 * Props (unchanged from old component):
 *   players              — array from ludo:gameStarted / ludoState.players
 *   boardState           — array from ludo:pieceMoved  / ludoState.boardState
 *   currentTurnTelegramId
 *   telegramId           — local user's id (from GameContext)
 *   onPieceClick(idx)    — called when user clicks their own piece
 *
 * Board coordinate system (matches LudoRoom.js server):
 *   -1        = piece is in base (home yard)
 *   0–51      = main 52-cell loop
 *   52–56     = home column (5 cells)
 *   57        = finished (centre star)
 *
 * Start positions on main loop (from LudoRoom.js):
 *   red: 0  blue: 13  green: 26  yellow: 39
 *
 * The 15×15 grid layout is the classic Ludo layout:
 *   cols 0-5  / rows 0-5   = RED home yard    (top-left)
 *   cols 9-14 / rows 0-5   = BLUE home yard   (top-right)
 *   cols 0-5  / rows 9-14  = GREEN home yard  (bottom-left)
 *   cols 9-14 / rows 9-14  = YELLOW home yard (bottom-right)
 *   col  7 (vertical) + row 7 (horizontal)   = paths + centre
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useMemo, useRef, useEffect } from 'react';

// ─── Color definitions ────────────────────────────────────────────────────────
const C = {
  red:    { fill:'#E53935', light:'#FFEBEE', border:'#B71C1C', glow:'rgba(229,57,53,0.55)',    text:'#FF8A80', yard:'#3B0A0A' },
  blue:   { fill:'#1E88E5', light:'#E3F2FD', border:'#0D47A1', glow:'rgba(30,136,229,0.55)',   text:'#82B1FF', yard:'#0A1A3B' },
  green:  { fill:'#43A047', light:'#E8F5E9', border:'#1B5E20', glow:'rgba(67,160,71,0.55)',    text:'#B9F6CA', yard:'#0A2B0A' },
  yellow: { fill:'#FFB300', light:'#FFF8E1', border:'#E65100', glow:'rgba(255,179,0,0.55)',    text:'#FFE57F', yard:'#2B1A00' },
};

// ─── Board path — 52 cells mapped to [row, col] on a 15×15 grid ──────────────
// Following standard Ludo board layout (clockwise from red start)
const PATH = [
  // Red start (cell 0) going right along row 6 then up
  [6,1],[6,2],[6,3],[6,4],[6,5],   // 0-4  bottom of red yard right
  [5,6],[4,6],[3,6],[2,6],[1,6],   // 5-9  up left column
  [0,6],                           // 10   top of left column
  [0,7],                           // 11   top centre
  [0,8],                           // 12   top right corner
  [1,8],[2,8],[3,8],[4,8],[5,8],   // 13-17 Blue start(13) down right col
  // 13 = blue start
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14], // 18-23 right side row 6
  [7,14],                          // 24   right mid
  [8,14],[8,13],[8,12],[8,11],[8,10],[8,9], // 25-30 right side row 8
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8], // 31-36 down right col
  [14,7],                          // 37   bottom centre
  [14,6],                          // 38   bottom left
  [13,6],[12,6],[11,6],[10,6],[9,6], // 39-43 Green start(39) up left col
  // 39 = green start
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0], // 44-49 row 8 going left
  [7,0],                           // 50   left mid
  [6,0],                           // 51   back to near red
];

// Home columns — each colour's private runway into centre
const HOME_COL = {
  red:    [[7,1],[7,2],[7,3],[7,4],[7,5]],     // 52-56 going right
  blue:   [[1,7],[2,7],[3,7],[4,7],[5,7]],     // 52-56 going down
  green:  [[7,13],[7,12],[7,11],[7,10],[7,9]], // 52-56 going left
  yellow: [[13,7],[12,7],[11,7],[10,7],[9,7]], // 52-56 going up
};

// Safe/star cells on main path
const SAFE_CELLS = new Set([0,8,13,21,26,34,39,47]);

// Yard piece positions (2×2 grid inside each home yard)
const YARD_POS = {
  red:    [[1,1],[1,4],[4,1],[4,4]],
  blue:   [[1,10],[1,13],[4,10],[4,13]],
  green:  [[10,1],[10,4],[13,1],[13,4]],
  yellow: [[10,10],[10,13],[13,10],[13,13]],
};

// Centre positions for finished pieces (arranged around star)
const FINISH_POS = [[6,7],[7,8],[8,7],[7,6]]; // 4 slots around centre

// ─── Helper: position for a piece ────────────────────────────────────────────
function getPieceCell(position, color, pieceIdx) {
  if (position === -1)  return YARD_POS[color][pieceIdx];
  if (position === 57)  return FINISH_POS[pieceIdx] || [7,7];
  if (position >= 52)   return HOME_COL[color][position - 52];
  return PATH[position];
}

// ─── Colour stripe cells ──────────────────────────────────────────────────────
// The home columns have coloured stripes
const HOME_COL_STRIPE = {
  red:    new Set(HOME_COL.red.map(([r,c])=>`${r},${c}`)),
  blue:   new Set(HOME_COL.blue.map(([r,c])=>`${r},${c}`)),
  green:  new Set(HOME_COL.green.map(([r,c])=>`${r},${c}`)),
  yellow: new Set(HOME_COL.yellow.map(([r,c])=>`${r},${c}`)),
};

function getCellStripe(row, col) {
  const key = `${row},${col}`;
  for (const color of ['red','blue','green','yellow']) {
    if (HOME_COL_STRIPE[color].has(key)) return color;
  }
  return null;
}

// Yard areas
const YARD_AREA = {
  red:    (r,c) => r<=5 && c<=5,
  blue:   (r,c) => r<=5 && c>=9,
  green:  (r,c) => r>=9 && c<=5,
  yellow: (r,c) => r>=9 && c>=9,
};

function getYardColor(row, col) {
  for (const color of ['red','blue','green','yellow']) {
    if (YARD_AREA[color](row, col)) return color;
  }
  return null;
}

// Centre area
function isCentre(row, col) {
  return row >= 6 && row <= 8 && col >= 6 && col <= 8;
}

// Safe star cell check
const SAFE_PATH_KEYS = new Set([...SAFE_CELLS].map(i => `${PATH[i][0]},${PATH[i][1]}`));
function isSafePath(row, col) {
  return SAFE_PATH_KEYS.has(`${row},${col}`);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Piece({ color, pieceIdx, position, isMyPiece, isActive, hasPendingDice, onClick }) {
  const cell = getPieceCell(position, color, pieceIdx);
  if (!cell) return null;
  const [row, col] = cell;
  const c = C[color];
  const isHome  = position === -1;
  const isKing  = position === 57;
  const canMove = isMyPiece && isActive && hasPendingDice;

  const CELL = 100 / 15; // percent per cell

  return (
    <motion.div
      layout
      layoutId={`piece-${color}-${pieceIdx}`}
      initial={false}
      animate={{
        left: `${col * CELL + CELL * 0.15}%`,
        top:  `${row * CELL + CELL * 0.15}%`,
        width:  `${CELL * 0.7}%`,
        height: `${CELL * 0.7}%`,
        scale: canMove ? [1, 1.18, 1] : 1,
        boxShadow: isKing
          ? `0 0 8px 3px ${c.glow}, 0 0 2px 1px #FFD70088`
          : canMove
          ? `0 0 10px 3px ${c.glow}`
          : 'none',
      }}
      transition={{
        layout: { type: 'spring', stiffness: 320, damping: 28, mass: 0.8 },
        scale:  { repeat: canMove ? Infinity : 0, duration: 0.9 },
      }}
      onClick={canMove ? () => onClick?.(pieceIdx) : undefined}
      className="absolute rounded-full flex items-center justify-center"
      style={{
        background: isKing
          ? `radial-gradient(circle at 35% 35%, #fff8, ${c.fill})`
          : c.fill,
        border: `2px solid ${isHome ? c.border : '#fff4'}`,
        cursor: canMove ? 'pointer' : 'default',
        zIndex: canMove ? 20 : 10,
        fontSize: `${CELL * 0.4}vw`,
        color: '#fff',
        fontWeight: 700,
        userSelect: 'none',
      }}
    >
      {isKing ? '♛' : pieceIdx + 1}
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LudoBoard({ players = [], boardState = [], currentTurnTelegramId, telegramId, onPieceClick }) {
  const myPlayer    = players.find(p => p.telegramId === telegramId);
  const myColor     = myPlayer?.color;
  const isMyTurn    = currentTurnTelegramId === telegramId;

  // Build a flat piece map: { color -> pieces[] }
  const pieceMap = useMemo(() => {
    const map = {};
    const src  = boardState.length ? boardState : players;
    for (const p of src) {
      map[p.color] = p.pieces || [-1,-1,-1,-1];
    }
    return map;
  }, [boardState, players]);

  // We pulse pieces only when it's the local user's turn AND they've rolled
  // (parent sets diceValue; we check via data attr on onPieceClick readiness)
  const hasPendingDice = isMyTurn; // parent won't call onPieceClick if no dice value

  // ─── Build 15×15 grid cells ────────────────────────────────────────────────
  const cells = useMemo(() => {
    const grid = [];
    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        const yard   = getYardColor(r, c);
        const stripe = getCellStripe(r, c);
        const centre = isCentre(r, c);
        const safe   = isSafePath(r, c);
        const key    = `${r}-${c}`;

        let bg    = '#1A1F30';   // default dark path cell
        let extra = null;

        if (centre) {
          // centre 3×3 — drawn as star overlay separately
          bg = '#0F1117';
        } else if (yard) {
          // 6×6 yard blocks
          bg = C[yard].yard;
          if (r >= 1 && r <= 4 && c >= 1 && c <= 4) bg = C[yard].yard;   // inner 4×4 inner yard
        } else if (stripe) {
          bg = `${C[stripe].fill}22`;
        } else {
          // path cell
          bg = '#1A1F30';
        }

        if (safe && !yard && !centre && !stripe) {
          extra = 'star';
        }

        grid.push({ r, c, key, yard, stripe, centre, safe: extra === 'star' });
      }
    }
    return grid;
  }, []);

  // ─── All pieces to render ──────────────────────────────────────────────────
  const allPieces = useMemo(() => {
    const list = [];
    for (const color of ['red','blue','green','yellow']) {
      const pieces = pieceMap[color] || [-1,-1,-1,-1];
      for (let i = 0; i < 4; i++) {
        const player = players.find(p => p.color === color);
        if (!player) continue;
        list.push({
          color,
          pieceIdx:    i,
          position:    pieces[i],
          isMyPiece:   player.telegramId === telegramId,
          isActive:    player.telegramId === currentTurnTelegramId,
        });
      }
    }
    return list;
  }, [pieceMap, players, telegramId, currentTurnTelegramId]);

  const currentPlayer = players.find(p => p.telegramId === currentTurnTelegramId);
  const turnColor     = currentPlayer?.color;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3">
      {/* Turn banner */}
      <motion.div
        key={currentTurnTelegramId}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border"
        style={{
          background: isMyTurn
            ? 'rgba(245,166,35,0.10)'
            : `${turnColor ? C[turnColor].fill : '#fff'}0D`,
          borderColor: isMyTurn
            ? 'rgba(245,166,35,0.40)'
            : `${turnColor ? C[turnColor].fill : '#fff'}30`,
        }}
      >
        {turnColor && (
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: C[turnColor]?.fill }} />
        )}
        <span className="text-sm font-bold" style={{
          fontFamily: 'Syne,sans-serif',
          color: isMyTurn ? '#F5A623' : (turnColor ? C[turnColor].text : '#9CA3AF'),
        }}>
          {isMyTurn
            ? '🎲 Your turn — pick a piece!'
            : currentPlayer
            ? `${currentPlayer.username}'s turn…`
            : 'Waiting…'}
        </span>
      </motion.div>

      {/* Board */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-[#2A2F45]"
        style={{ background: '#0F1117', aspectRatio: '1 / 1' }}>

        {/* 15×15 CSS grid */}
        <div className="absolute inset-0 grid"
          style={{ gridTemplateColumns: 'repeat(15, 1fr)', gridTemplateRows: 'repeat(15, 1fr)', gap: '1px', padding: '1px' }}>
          {cells.map(({ r, c, key, yard, stripe, centre, safe }) => {
            let bg = '#1A1F30';
            if (centre)    bg = '#0F1117';
            else if (yard) bg = C[yard].yard;
            else if (stripe) bg = `${C[stripe].fill}18`;

            return (
              <div key={key} className="relative flex items-center justify-center" style={{ background: bg, borderRadius: 2 }}>
                {/* Yard inner area — inner 4×4 circle motif */}
                {yard && r >= 1 && r <= 4 && c >= 1 && c <= 4 && (
                  <div className="absolute inset-[15%] rounded-full opacity-20" style={{ background: C[yard].fill }} />
                )}
                {yard && r >= 1 && r <= 4 && c >= 10 && c <= 13 && (
                  <div className="absolute inset-[15%] rounded-full opacity-20" style={{ background: C[yard].fill }} />
                )}
                {yard && r >= 10 && r <= 13 && c >= 1 && c <= 4 && (
                  <div className="absolute inset-[15%] rounded-full opacity-20" style={{ background: C[yard].fill }} />
                )}
                {yard && r >= 10 && r <= 13 && c >= 10 && c <= 13 && (
                  <div className="absolute inset-[15%] rounded-full opacity-20" style={{ background: C[yard].fill }} />
                )}
                {/* Stripe colour on home column cells */}
                {stripe && (
                  <div className="absolute inset-0 opacity-30 rounded-sm" style={{ background: C[stripe].fill }} />
                )}
                {/* Safe star */}
                {safe && (
                  <span className="text-[6px] text-yellow-400 opacity-70 leading-none select-none">★</span>
                )}
                {/* Centre start circles (yard start-cell on main path) */}
                {!yard && !centre && !stripe && !safe && (() => {
                  const pathIdx = PATH.findIndex(([pr,pc]) => pr === r && pc === c);
                  if (Object.values(START_POSITIONS_IDX).includes(pathIdx)) {
                    const startColor = Object.keys(START_POSITIONS_IDX).find(col => START_POSITIONS_IDX[col] === pathIdx);
                    return (
                      <div className="absolute inset-[20%] rounded-full opacity-50"
                        style={{ background: C[startColor]?.fill || 'transparent' }} />
                    );
                  }
                  return null;
                })()}
              </div>
            );
          })}
        </div>

        {/* Centre star / home triangle */}
        <div className="absolute"
          style={{
            left: `${(6/15)*100}%`,
            top:  `${(6/15)*100}%`,
            width: `${(3/15)*100}%`,
            height:`${(3/15)*100}%`,
          }}>
          {/* 4 coloured triangles pointing to centre */}
          <svg viewBox="0 0 90 90" className="w-full h-full">
            {/* Red — top-left triangle */}
            <polygon points="0,0 45,45 0,90"   fill={C.red.fill}    opacity="0.9" />
            {/* Blue — top-right triangle */}
            <polygon points="90,0 45,45 90,90"  fill={C.blue.fill}   opacity="0.9" />
            {/* Green — bottom-left triangle */}
            <polygon points="0,0 45,45 90,0"    fill={C.green.fill}  opacity="0.9" />
            {/* Yellow — bottom-right triangle */}
            <polygon points="0,90 45,45 90,90"  fill={C.yellow.fill} opacity="0.9" />
            {/* Star */}
            <text x="45" y="52" textAnchor="middle" fontSize="22" fill="#fff" opacity="0.95">★</text>
          </svg>
        </div>

        {/* Yard labels */}
        {[
          { color:'red',    style:{ top:'2%',  left:'2%',  width:'38%', height:'38%' } },
          { color:'blue',   style:{ top:'2%',  right:'2%', width:'38%', height:'38%' } },
          { color:'green',  style:{ bottom:'2%',left:'2%', width:'38%', height:'38%' } },
          { color:'yellow', style:{ bottom:'2%',right:'2%',width:'38%', height:'38%' } },
        ].map(({ color, style }) => {
          const player = players.find(p => p.color === color);
          return (
            <div key={color} className="absolute flex items-center justify-center pointer-events-none" style={style}>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[9px] font-bold uppercase tracking-widest opacity-60"
                  style={{ color: C[color].text, fontFamily: 'Syne,sans-serif' }}>
                  {color}
                </span>
                {player && (
                  <span className="text-[8px] opacity-50" style={{ color: C[color].text }}>
                    {player.username}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* All pieces — rendered as absolutely positioned overlays */}
        <AnimatePresence>
          {allPieces.map(({ color, pieceIdx, position, isMyPiece, isActive }) => (
            <Piece
              key={`${color}-${pieceIdx}`}
              color={color}
              pieceIdx={pieceIdx}
              position={position}
              isMyPiece={isMyPiece}
              isActive={isActive}
              hasPendingDice={hasPendingDice}
              onClick={onPieceClick}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Player legend */}
      {players.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {players.map(p => {
            const isTurn = p.telegramId === currentTurnTelegramId;
            const pieces = pieceMap[p.color] || [-1,-1,-1,-1];
            const kings  = pieces.filter(pos => pos === 57).length;
            return (
              <div key={p.telegramId}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border flex-1 min-w-[100px] transition-all"
                style={{
                  background:   isTurn ? `${C[p.color].fill}12` : '#181C27',
                  borderColor:  isTurn ? C[p.color].fill : '#2A2F45',
                  boxShadow:    isTurn ? `0 0 8px ${C[p.color].glow}` : 'none',
                }}>
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: C[p.color].fill }} />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold truncate" style={{ color: C[p.color].text, fontFamily: 'Syne,sans-serif' }}>
                    {p.username}
                  </span>
                  {kings > 0 && (
                    <span className="text-[9px] text-yellow-400">{'♛'.repeat(kings)}</span>
                  )}
                </div>
                {isTurn && (
                  <span className="ml-auto text-[9px] font-bold" style={{ color: C[p.color].fill }}>▶</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Start positions index map (for circle markers on board)
const START_POSITIONS_IDX = { red: 0, blue: 13, green: 26, yellow: 39 };
