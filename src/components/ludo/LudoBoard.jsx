/**
 * LudoBoard.jsx — Ludo King-style SVG board
 * Drop-in replacement. Same props as before:
 *   players, boardState, currentTurnTelegramId, telegramId, onPieceClick
 *
 * Server position system (from LudoRoom.js):
 *   -1      = in base yard
 *   0–51    = main 52-cell loop
 *   52–56   = home column (5 cells toward centre)
 *   57      = finished (centre)
 *
 * Start positions on main loop:
 *   red:0  blue:13  green:26  yellow:39
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useMemo, memo, useState, useEffect, useRef } from 'react';
import { Sentry } from '../../lib/sentry';
import { LUDO_COLORS, LUDO_PALETTE } from './ludoTheme';

/* ── Colours ─────────────────────────────────────────────────────────────── */
/* Spec's exact primary/glow hex values, with dark/yard shades derived from
 * them in ludoTheme.js — see that file if the palette itself ever changes. */
const C = LUDO_COLORS;

/* ── The 15×15 board uses SVG units where each cell = 40px ─────────────── */
const SZ  = 40;   // cell size in SVG units
const W   = 15 * SZ; // 600
const cx  = 7;    // centre column index
const cy  = 7;    // centre row index

/* ── Classify every cell ─────────────────────────────────────────────────── */
function cellType(r, c) {
  // 6×6 yard blocks (corners)
  if (r <= 5 && c <= 5)   return { type:'yard', color:'red' };
  if (r <= 5 && c >= 9)   return { type:'yard', color:'blue' };
  // FIX: green/yellow corners were swapped — green's track entry & home
  // stretch physically sit bottom-right, yellow's sit bottom-left, but the
  // yards were rendered the other way round. Re-labelled to match.
  if (r >= 9 && c <= 5)   return { type:'yard', color:'yellow' };
  if (r >= 9 && c >= 9)   return { type:'yard', color:'green' };
  // Centre 3×3
  if (r >= 6 && r <= 8 && c >= 6 && c <= 8) return { type:'centre' };
  // Home columns (coloured runway to centre)
  if (r === 7 && c >= 1 && c <= 5)  return { type:'home', color:'red' };
  if (c === 7 && r >= 1 && r <= 5)  return { type:'home', color:'blue' };
  if (r === 7 && c >= 9 && c <= 13) return { type:'home', color:'green' };
  if (c === 7 && r >= 9 && r <= 13) return { type:'home', color:'yellow' };
  // Path cells
  return { type:'path' };
}

/* ── Safe cells (shield stars) on main path indices ──────────────────────── */
const SAFE_PATH_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

/* ── The 52-cell main loop mapped to [row,col] ───────────────────────────── */
const PATH_CELLS = [
  // Red start → right along row6 bottom edge
  [6,1],[6,2],[6,3],[6,4],[6,5],
  // Up left column col6
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
  // Right along top
  [0,7],[0,8],
  // Down right column col8 — blue start at idx 13
  [1,8],[2,8],[3,8],[4,8],[5,8],
  // Right along row6 right side
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
  // Down right edge row7
  [7,14],
  // Left along row8
  [8,14],[8,13],[8,12],[8,11],[8,10],[8,9],
  // Down left col8 — green start at idx 39 counted from 0, but server uses 26 here
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  // Left along bottom
  [14,7],[14,6],
  // Up left col6 — green start idx 39
  [13,6],[12,6],[11,6],[10,6],[9,6],
  // Left along row8
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
  // Up left edge
  [7,0],
  // Back near red
  [6,0],
];
// Sanity: PATH_CELLS.length should be 52
// [6,1]...[6,0] = 52 entries ✓

/* ── Home column cells per colour (positions 52-56) ─────────────────────── */
const HOME_RUNWAY = {
  red:    [[7,1],[7,2],[7,3],[7,4],[7,5]],
  blue:   [[1,7],[2,7],[3,7],[4,7],[5,7]],
  green:  [[7,13],[7,12],[7,11],[7,10],[7,9]],
  yellow: [[13,7],[12,7],[11,7],[10,7],[9,7]],
};

/* ── Yard parking spots per colour (position -1) ──────────────────────────
   Centred on each yard's true midpoint (cell-index 2.5 within the 6-cell
   block), using ±1 offsets (1.5 / 3.5) instead of {2,4} — the old values
   averaged to index 3, which sat half a cell off-centre from the yard. ── */
const YARD_SPOTS = {
  red:    [[1.5,1.5],[1.5,3.5],[3.5,1.5],[3.5,3.5]],
  blue:   [[1.5,10.5],[1.5,12.5],[3.5,10.5],[3.5,12.5]],
  green:  [[10.5,10.5],[10.5,12.5],[12.5,10.5],[12.5,12.5]],
  yellow: [[10.5,1.5],[10.5,3.5],[12.5,1.5],[12.5,3.5]],
};

/* ── Finished slots (inside centre triangle, per colour) ─────────────────── */
const FINISH_SLOTS = {
  red:    [7,6.4],
  blue:   [6.4,7],
  green:  [7,7.6],
  yellow: [7.6,7],
};

/* ── Known-good colors — anything else means malformed/stale server data ── */
const KNOWN_COLORS = new Set(['red', 'blue', 'green', 'yellow']);

/* ── Map server position → SVG [cx_unit, cy_unit] centre ─────────────────── */
/* Phase 2 (crash hardening): position/color come straight from a socket
 * broadcast. If it's ever out of the expected range — a stale reconnect
 * payload, a future server bug, a race during a resume — the old code
 * destructured an out-of-bounds array index straight into a TypeError,
 * which crashed this entire screen (no error boundary existed before
 * Phase 0, and even with one now, it still kicks the player out of a live
 * game). Falling back to a safe yard position degrades the visual instead
 * of crashing it, and we still surface it to Sentry so it's not silently
 * swallowed. */
function getPieceXY(position, color, pieceIdx) {
  const safeColor = KNOWN_COLORS.has(color) ? color : 'red';
  const safeIdx   = (pieceIdx >= 0 && pieceIdx <= 3) ? pieceIdx : 0;

  if (position === 57) {
    const [fr, fc] = FINISH_SLOTS[safeColor];
    return [fc * SZ + SZ/2, fr * SZ + SZ/2];
  }
  if (position >= 52 && position <= 56) {
    const [hr, hc] = HOME_RUNWAY[safeColor][position - 52];
    return [hc * SZ + SZ/2, hr * SZ + SZ/2];
  }
  if (position >= 0 && position <= 51) {
    const [pr, pc] = PATH_CELLS[position];
    return [pc * SZ + SZ/2, pr * SZ + SZ/2];
  }
  // -1 (yard) and anything unrecognized both land here — same safe fallback.
  if (position !== -1) {
    console.warn('[LudoBoard] Unexpected piece position, falling back to yard:', position);
    Sentry.captureMessage('LudoBoard: unexpected piece position', {
      level: 'warning',
      tags: { source: 'LudoBoard.getPieceXY' },
      extra: { position, color, pieceIdx },
    });
  }
  const [yr, yc] = YARD_SPOTS[safeColor][safeIdx];
  return [yc * SZ + SZ/2, yr * SZ + SZ/2];
}

/* ── Step-by-step move reconstruction ─────────────────────────────────────
 * The server only tells us fromPosition → toPosition (it's the sole source
 * of truth for whether a move is legal). But the spec is explicit: pieces
 * must visibly walk one square at a time, never cut a straight line across
 * the board. This mirrors the server's own position math (LudoRoom.js
 * _calculateNewPosition) one step at a time, purely to drive the animation —
 * it never decides legality, it just replays a move we already know happened. */
const START_POSITIONS = { red: 0, blue: 13, green: 26, yellow: 39 };
const MAIN_LOOP_LEN = 52;
const FINISH_POS = 57;

function stepOnce(position, color) {
  if (position === FINISH_POS) return null;
  if (position >= 52) {
    const next = position + 1;
    return next > FINISH_POS ? null : next;
  }
  const startPos = START_POSITIONS[color] ?? 0;
  const stepsFromStart = (position - startPos + MAIN_LOOP_LEN) % MAIN_LOOP_LEN;
  const nextSteps = stepsFromStart + 1;
  if (nextSteps === MAIN_LOOP_LEN) return 52;
  if (nextSteps < MAIN_LOOP_LEN) return (startPos + nextSteps) % MAIN_LOOP_LEN;
  return null;
}

/** Returns the ordered list of positions a piece passes through (excluding
 *  the starting one), landing on toPosition. Leaving the yard is a direct
 *  placement onto the entry cell (the spec describes it that way, not a walk),
 *  everything else is stepped one square at a time up to 6 hops (max roll). */
function buildStepPath(fromPosition, toPosition, color) {
  if (fromPosition === -1 || !KNOWN_COLORS.has(color)) return [toPosition];
  const path = [];
  let cur = fromPosition;
  for (let i = 0; i < 6; i++) {
    const next = stepOnce(cur, color);
    if (next === null) break;
    path.push(next);
    cur = next;
    if (next === toPosition) break;
  }
  if (path.length === 0 || path[path.length - 1] !== toPosition) return [toPosition];
  return path;
}

/* ── Safe cell check ─────────────────────────────────────────────────────── */
const SAFE_XY = new Set([...SAFE_PATH_INDICES].map(i => {
  const [r,c] = PATH_CELLS[i];
  return `${r},${c}`;
}));

/* ── Render a single board cell ─────────────────────────────────────────── */
/* Phase 2: memoized — this cell's own visual never changes after mount
 * (it's pure given r,c), but without memo it re-rendered along with the
 * other ~200 of these on every single piece move broadcast during active
 * play, since it's a plain function component re-created by its parent map. */
const BoardCell = memo(function BoardCell({ r, c }) {
  const x = c * SZ;
  const y = r * SZ;
  const ct = cellType(r, c);

  if (ct.type === 'yard') {
    // Large coloured yard block — only render for the outer border cells
    return null; // yards rendered as a single rect below
  }
  if (ct.type === 'centre') {
    return null; // rendered separately as star
  }

  const isSafe = SAFE_XY.has(`${r},${c}`);
  const isHome = ct.type === 'home';
  const homeColor = isHome ? ct.color : null;

  return (
    <g key={`${r}-${c}`}>
      <rect
        x={x} y={y} width={SZ} height={SZ}
        fill={isHome ? C[homeColor].main + '33' : LUDO_PALETTE.card}
        stroke={LUDO_PALETTE.grid}
        strokeOpacity={0.14}
        strokeWidth={0.5}
      />
      {isHome && (
        <rect
          x={x+4} y={y+4} width={SZ-8} height={SZ-8}
          rx={4}
          fill={C[homeColor].main + '55'}
          stroke={C[homeColor].main + '88'}
          strokeWidth={0.5}
        />
      )}
      {isSafe && !isHome && (
        <>
          {/* Gold, not green — a green star on this board would read as
              "green player's cell", which it isn't; safety is universal. */}
          <rect x={x} y={y} width={SZ} height={SZ} fill="#F5A62322" stroke={LUDO_PALETTE.grid} strokeOpacity={0.18} strokeWidth={0.5}/>
          <text
            x={x + SZ/2} y={y + SZ/2 + 5}
            textAnchor="middle" fontSize={18} fill="#F5C451" opacity={0.9}
            style={{userSelect:'none'}}
          >★</text>
        </>
      )}
    </g>
  );
});

/* ── A game piece (token) ────────────────────────────────────────────────── */
/* Phase 2: memoized — of the 16 pieces on the board, a typical move only
 * changes 1-2. Framer Motion's `animate={{x,y}}` still drives the actual
 * movement spring (that one needs to stay JS-driven for the physics feel),
 * but the other 14+ pieces that didn't move now skip re-rendering entirely
 * instead of re-diffing every prop on every socket update. */
const Piece = memo(function Piece({ color, pieceIdx, position, canTap, onClick, walk }) {
  const [px, py] = getPieceXY(position, color, pieceIdx);
  const col = C[color] || C.red;
  const isKing = position === 57;
  const isYard = position === -1;
  const r = SZ * 0.36;

  // `walk`, when present, is this exact piece's in-flight step-by-step move:
  // { xs, ys, times, duration }. Every other piece just springs to its
  // (unchanged) resting spot as before.
  const hasWalk = walk && walk.xs.length > 1;

  return (
    <motion.g
      style={{ cursor: canTap ? 'pointer' : 'default' }}
      onClick={canTap ? () => onClick(pieceIdx) : undefined}
      initial={{ x: px, y: py }}
      animate={hasWalk ? { x: walk.xs, y: walk.ys } : { x: px, y: py }}
      transition={
        hasWalk
          ? { duration: walk.duration, times: walk.times, ease: 'easeInOut' }
          : { type: 'spring', stiffness: 380, damping: 30, mass: 0.7 }
      }
      /* ── CRITICAL FIX ──────────────────────────────────────────────────────
         Framer Motion v11 defaults to CSS transforms ("translate(Xpx, Ypx)")
         on SVG elements. CSS pixels are relative to the DOM viewport, NOT
         SVG user units. On a 320px-wide screen with a 600-unit viewBox, a
         piece at SVG unit (340, 60) gets CSS-translated to (340px, 60px) from
         the SVG's DOM origin — well outside the clipped container → invisible.
         transformTemplate overrides the output to a plain SVG translate that
         uses user units, so pieces always land exactly where getPieceXY says. */
      transformTemplate={({ x, y }) =>
        `translate(${typeof x === 'string' ? parseFloat(x) : x} ${typeof y === 'string' ? parseFloat(y) : y})`
      }
    >
      {/* Glow ring when tappable — CSS keyframe instead of a JS-driven
          infinite Framer Motion loop (Phase 2: this ran on the main thread
          for as long as any piece was tappable; the CSS version is
          compositor-driven). r stays as a plain SVG attr either way. */}
      {canTap && (
        <circle
          className="anim-ring-pulse"
          cx={0} cy={0} r={r + 7}
          fill="none"
          stroke={col.main}
          strokeWidth={2.5}
        />
      )}
      {/* Body group scales up gently while selectable — spec: "scale up,
          glow stronger, pulse" on selection. Pure CSS keyframe (see index.css),
          so it costs nothing on the main thread while it's just sitting there
          waiting to be tapped. */}
      <g className={canTap ? 'anim-token-select' : undefined}>
        {/* Shadow, grounds the token against the board */}
        <ellipse cx={1.5} cy={r*0.7} rx={r*0.9} ry={r*0.3} fill="#00000060" />
        {/* Outline */}
        <circle cx={0} cy={0} r={r + 1.4} fill="none" stroke="#08101B" strokeWidth={1.6} opacity={0.55} />
        {/* Outer rim for depth */}
        <circle cx={0} cy={0} r={r} fill={col.dark} />
        {/* Main body — radial gradient, not a flat fill */}
        <circle cx={0} cy={0} r={r - 2.5} fill={`url(#tokenGrad-${color})`} stroke={col.dark} strokeWidth={1} />
        {/* Highlight */}
        <ellipse cx={-r*0.26} cy={-r*0.3} rx={r*0.34} ry={r*0.22} fill="#ffffff70" />
        {/* Inner dot / crown */}
        {isKing ? (
          <text x={0} y={5} textAnchor="middle" fontSize={r*0.95} fill="#FFD700"
            style={{userSelect:'none', fontWeight:900}}>♛</text>
        ) : isYard ? (
          <circle cx={0} cy={0} r={r*0.38} fill={col.light} opacity={0.85}/>
        ) : (
          <text x={0} y={4} textAnchor="middle" fontSize={r*0.75} fill="#fff"
            style={{userSelect:'none', fontWeight:700}}>{pieceIdx+1}</text>
        )}
      </g>
    </motion.g>
  );
});

/* ── Timing for the step-by-step walk animation ───────────────────────────
 * Each square takes STEP_MS, with a small upward hop at the midpoint of
 * every square ("tiny bounce ... pause ... move one square" per spec). Kept
 * snappy on purpose — the spec also says animation shouldn't slow gameplay. */
const STEP_MS = 170;

function buildWalkAnimation(fromPosition, toPosition, color, pieceIdx) {
  const steps = buildStepPath(fromPosition, toPosition, color);
  const startXY = getPieceXY(fromPosition, color, pieceIdx);
  const coords = [startXY, ...steps.map((pos) => getPieceXY(pos, color, pieceIdx))];
  if (coords.length < 2) return null;

  const xs = [coords[0][0]];
  const ys = [coords[0][1]];
  for (let i = 1; i < coords.length; i++) {
    const [px, py] = coords[i - 1];
    const [cx, cy] = coords[i];
    // Midpoint hop: nudged upward so each square-crossing reads as a tiny bounce.
    xs.push((px + cx) / 2, cx);
    ys.push((py + cy) / 2 - 5, cy);
  }
  const stepCount = coords.length - 1;
  const times = xs.map((_, i) => i / (xs.length - 1));
  return { xs, ys, times, duration: Math.max(0.22, stepCount * STEP_MS / 1000) };
}

/* ── Main board component ────────────────────────────────────────────────── */
export default function LudoBoard({ players=[], boardState=[], currentTurnTelegramId, telegramId, onPieceClick, diceValue, lastMove }) {
  const myPlayer  = players.find(p => p.telegramId === telegramId);
  const isMyTurn  = currentTurnTelegramId === telegramId;
  const hasDice   = !!diceValue;

  /* build color→pieces map */
  const pieceMap = useMemo(() => {
    const m = {};
    const src = boardState.length ? boardState : players;
    for (const p of src) m[p.color] = p.pieces ?? [-1,-1,-1,-1];
    return m;
  }, [boardState, players]);

  const currentPlayer = players.find(p => p.telegramId === currentTurnTelegramId);

  /* Track the single piece currently mid-walk, driven by the server's own
     'ludo:pieceMoved' payload (lastMove) — never guessed, just replayed one
     square at a time instead of springing straight there. */
  const [activeWalk, setActiveWalk] = useState(null); // { color, pieceIdx, anim }
  const walkTimeoutRef = useRef(null);

  useEffect(() => {
    if (!lastMove || lastMove.fromPosition === undefined || lastMove.toPosition === undefined) return;
    const anim = buildWalkAnimation(lastMove.fromPosition, lastMove.toPosition, lastMove.color, lastMove.pieceIndex);
    if (!anim) return;

    setActiveWalk({ color: lastMove.color, pieceIdx: lastMove.pieceIndex, anim });
    if (walkTimeoutRef.current) clearTimeout(walkTimeoutRef.current);
    walkTimeoutRef.current = setTimeout(() => setActiveWalk(null), anim.duration * 1000 + 60);

    return () => clearTimeout(walkTimeoutRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMove]);

  /* all pieces flat list — falls back to all-4-colors in yard when no players
     data exists yet (idle/lobby preview), so the board never looks empty.    */
  const allPieces = useMemo(() => {
    const list = [];
    const COLORS = ['red','blue','green','yellow'];
    for (const color of COLORS) {
      const player = players.find(p => p.color === color);
      // In idle/preview: synthesise a fake entry so the yard pieces still show
      const pieces = pieceMap[color] ?? [-1,-1,-1,-1];
      for (let i = 0; i < 4; i++) {
        const isWalking = activeWalk && activeWalk.color === color && activeWalk.pieceIdx === i;
        list.push({
          color, pieceIdx:i, position:pieces[i],
          isMe: player ? player.telegramId === telegramId : false,
          isTurn: player ? player.telegramId === currentTurnTelegramId : false,
          walk: isWalking ? activeWalk.anim : null,
        });
      }
    }
    return list;
  }, [pieceMap, players, telegramId, currentTurnTelegramId, activeWalk]);

  return (
    <div className="flex flex-col gap-2">
      {/* Turn banner */}
      <motion.div
        key={currentTurnTelegramId}
        initial={{ opacity:0, scale:0.96 }}
        animate={{ opacity:1, scale:1 }}
        className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl border text-sm font-bold"
        style={{
          fontFamily: 'Syne,sans-serif',
          background: isMyTurn ? 'rgba(245,166,35,0.12)' : 'rgba(255,255,255,0.04)',
          borderColor: isMyTurn ? 'rgba(245,166,35,0.45)' : 'rgba(255,255,255,0.1)',
          color: isMyTurn ? '#F5A623' : (currentPlayer ? C[currentPlayer.color]?.light : '#9CA3AF'),
        }}
      >
        {currentPlayer && (
          <span className="w-2.5 h-2.5 rounded-full"
            style={{ background: C[currentPlayer.color]?.main, flexShrink:0 }} />
        )}
        {isMyTurn
          ? hasDice ? '👆 Tap a piece to move!' : '🎲 Roll the dice!'
          : currentPlayer ? `${currentPlayer.username}'s turn…` : 'Waiting…'
        }
      </motion.div>

      {/* SVG Board */}
      <div className="w-full rounded-2xl overflow-hidden"
           style={{
             border: `2px solid ${LUDO_PALETTE.border}22`,
             boxShadow: `0 0 40px rgba(0,0,0,0.6), inset 0 0 0 1px ${LUDO_PALETTE.border}14`,
           }}>
        <svg
          viewBox={`0 0 ${W} ${W}`}
          width="100%"
          style={{ display:'block', background: LUDO_PALETTE.background }}
        >
          <defs>
            {['red','blue','green','yellow'].map((name) => (
              <radialGradient key={name} id={`tokenGrad-${name}`} cx="35%" cy="30%" r="75%">
                <stop offset="8%"  stopColor={C[name].light} />
                <stop offset="55%" stopColor={C[name].main} />
                <stop offset="100%" stopColor={C[name].dark} />
              </radialGradient>
            ))}
          </defs>

          {/* ── Background path cells ─────────────────────────────────── */}
          {Array.from({length:15}, (_,r) =>
            Array.from({length:15}, (_,c) => {
              const ct = cellType(r,c);
              if (ct.type==='yard' || ct.type==='centre') return null;
              return <BoardCell key={`${r}-${c}`} r={r} c={c} />;
            })
          )}

          {/* ── Yard blocks (one rect each) ───────────────────────────── */}
          {[
            { color:'red',    r:0, c:0 },
            { color:'blue',   r:0, c:9 },
            { color:'yellow', r:9, c:0 },
            { color:'green',  r:9, c:9 },
          ].map(({ color, r, c }) => {
            const col = C[color];
            return (
              <g key={color}>
                {/* Yard background */}
                <rect x={c*SZ} y={r*SZ} width={6*SZ} height={6*SZ}
                  fill={col.yard} stroke={LUDO_PALETTE.background} strokeWidth={2} rx={6}/>
                {/* Inner circle motif */}
                <circle
                  cx={c*SZ + 3*SZ} cy={r*SZ + 3*SZ}
                  r={2.2*SZ}
                  fill={col.dark} opacity={0.5}
                />
                <circle
                  cx={c*SZ + 3*SZ} cy={r*SZ + 3*SZ}
                  r={1.7*SZ}
                  fill={col.main} opacity={0.3}
                />
                {/* 4 parking spots — a visible inset "slot" instead of a same-hue blur */}
                {YARD_SPOTS[color].map(([yr,yc], i) => (
                  <g key={i}>
                    {/* recessed shadow well */}
                    <circle cx={yc*SZ+SZ/2} cy={yr*SZ+SZ/2} r={SZ*0.36}
                      fill="#00000040" />
                    {/* light rim so the slot reads clearly against the yard colour */}
                    <circle cx={yc*SZ+SZ/2} cy={yr*SZ+SZ/2} r={SZ*0.32}
                      fill="#FFFFFF1A" stroke="#FFFFFF55" strokeWidth={1.5}/>
                  </g>
                ))}
                {/* Colour label */}
                <text
                  x={c*SZ + 3*SZ} y={r*SZ + 3*SZ + 5}
                  textAnchor="middle" fontSize={12}
                  fill={col.light} opacity={0.5}
                  fontFamily="sans-serif" fontWeight={700}
                  style={{userSelect:'none', textTransform:'uppercase', letterSpacing:2}}
                >
                  {color.toUpperCase()}
                </text>
              </g>
            );
          })}

          {/* ── Centre star (4 triangles + gold star) ─────────────────── */}
          <g>
            {/* Triangle: red top-left */}
            <polygon
              points={`${6*SZ},${6*SZ} ${7.5*SZ},${7.5*SZ} ${6*SZ},${9*SZ}`}
              fill={C.red.main} opacity={0.95}
            />
            {/* Triangle: blue top-right */}
            <polygon
              points={`${9*SZ},${6*SZ} ${7.5*SZ},${7.5*SZ} ${6*SZ},${6*SZ}`}
              fill={C.blue.main} opacity={0.95}
            />
            {/* Triangle: green bottom-right */}
            <polygon
              points={`${9*SZ},${9*SZ} ${7.5*SZ},${7.5*SZ} ${9*SZ},${6*SZ}`}
              fill={C.green.main} opacity={0.95}
            />
            {/* Triangle: yellow bottom-left */}
            <polygon
              points={`${6*SZ},${9*SZ} ${7.5*SZ},${7.5*SZ} ${9*SZ},${9*SZ}`}
              fill={C.yellow.main} opacity={0.95}
            />
            {/* Centre overlay */}
            <circle cx={7.5*SZ} cy={7.5*SZ} r={SZ*0.6} fill={LUDO_PALETTE.background} opacity={0.6}/>
            <text x={7.5*SZ} y={7.5*SZ+9} textAnchor="middle"
              fontSize={28} fill="#FFD700" opacity={0.95}
              style={{userSelect:'none'}}>★</text>
          </g>

          {/* ── Turn highlight ring on active player's yard ───────────── */}
          {currentPlayer && (() => {
            const yardMeta = [
              { color:'red',    r:0, c:0 },
              { color:'blue',   r:0, c:9 },
              { color:'yellow', r:9, c:0 },
              { color:'green',  r:9, c:9 },
            ].find(y => y.color === currentPlayer.color);
            if (!yardMeta) return null;
            return (
              <rect
                className="anim-ring-pulse"
                x={yardMeta.c*SZ+2} y={yardMeta.r*SZ+2}
                width={6*SZ-4} height={6*SZ-4}
                rx={6} fill="none"
                stroke={(C[currentPlayer.color] || C.red).main}
                strokeWidth={3}
              />
            );
          })()}

          {/* ── Pieces ───────────────────────────────────────────────── */}
          {allPieces.map(({ color, pieceIdx, position, isMe, isTurn, walk }) => (
            <Piece
              key={`${color}-${pieceIdx}`}
              color={color}
              pieceIdx={pieceIdx}
              position={position}
              canTap={isMe && isTurn && hasDice}
              onClick={onPieceClick}
              walk={walk}
            />
          ))}
        </svg>
      </div>

      {/* Player strip — avatars + turn indicator (spec's "Top Bar" content,
          kept docked to the board itself rather than the whole app shell) */}
      {players.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {players.map(p => {
            const isTurn  = p.telegramId === currentTurnTelegramId;
            const pieces  = pieceMap[p.color] ?? [-1,-1,-1,-1];
            const kings   = pieces.filter(pos => pos === 57).length;
            const col     = C[p.color] || C.red;
            const initial = (p.username || '?').trim().charAt(0).toUpperCase();
            return (
              <motion.div
                key={p.telegramId}
                animate={{ scale: isTurn ? 1.04 : 1 }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border flex-1 min-w-[90px]"
                style={{
                  background:  isTurn ? col.main+'18' : LUDO_PALETTE.card,
                  borderColor: isTurn ? col.main      : LUDO_PALETTE.grid+'2A',
                  boxShadow:   isTurn ? `0 0 12px ${col.glow}` : 'none',
                }}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-extrabold"
                  style={{
                    background: `radial-gradient(circle at 35% 30%, ${col.light}, ${col.main} 60%, ${col.dark} 100%)`,
                    color: '#08101B',
                    boxShadow: isTurn ? `0 0 8px ${col.main}` : 'inset 0 0 0 1px rgba(0,0,0,0.25)',
                  }}
                >
                  {initial}
                </span>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-bold truncate"
                    style={{ color: isTurn ? col.light : '#9CA3AF', fontFamily:'Syne,sans-serif' }}>
                    {p.username}
                  </span>
                  {kings > 0 && (
                    <span className="text-yellow-400 text-[10px]">{'♛'.repeat(kings)} home</span>
                  )}
                </div>
                {isTurn && <span className="text-[10px] font-bold" style={{ color: col.main }}>▶</span>}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
