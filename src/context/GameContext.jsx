import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = 'https://ethiogame-server-production.up.railway.app';

const GameCtx = createContext(null);

export const GameProvider = ({ children, telegramId: propTelegramId, username }) => {
  const socketRef    = useRef(null);
  const [connected,  setConnected]  = useState(false);
  const [balance,    setBalance]    = useState(0);
  const [bingoState, setBingoState] = useState(null);
  const [ludoState,  setLudoState]  = useState(null);

  // ✅ Get telegramId from prop OR directly from Telegram WebApp
  const telegramId = String(
    propTelegramId ||
    window?.Telegram?.WebApp?.initDataUnsafe?.user?.id ||
    'dev'
  );

  useEffect(() => {
    const socket = io(SERVER_URL, { transports: ['websocket', 'polling'], reconnection: true });
    socketRef.current = socket;

    // ✅ FIX 1 — When app connects, immediately ask Railway for the REAL balance
    socket.on('connect', () => {
      setConnected(true);
      console.log('Connected to server');
      // Ask server for real balance right away — no more starting at 0
      socket.emit('user:getBalance', { telegramId }, (res) => {
        if (res?.success) {
          setBalance(res.balance);
        }
      });
    });

    socket.on('disconnect', () => setConnected(false));

    // ✅ FIX 2 — Listen for balance updates from server (deposit, win, loss)
    // Whenever Railway changes the balance, the app will hear it and update
    socket.on('user:balanceUpdated', (d) => {
      setBalance(d.balance); // always the real number from the database
    });

    // ─── BINGO EVENTS ────────────────────────────────────────────────────────

    socket.on('bingo:gameStarted', (d) => {
      setBingoState((p) => ({ ...p, ...d, calledNumbers: [], state: 'active' }));
      // ✅ FIX 3 — Use server balance if provided, NOT local math
      // Old (wrong): setBalance(b => b - d.stake)
      // New (correct): server sends the real new balance
      if (d.newBalance !== undefined) setBalance(d.newBalance);
    });

    socket.on('bingo:numberDrawn', (d) =>
      setBingoState((p) => (p ? { ...p, calledNumbers: d.calledNumbers, lastDrawn: d.drawnNumber } : p))
    );

    socket.on('bingo:countdown', (d) =>
      setBingoState((p) => ({ ...p, ...d, state: 'countdown' }))
    );

    socket.on('bingo:playerJoined', (d) =>
      setBingoState((p) => (p ? { ...p, playerCount: d.playerCount } : p))
    );

    socket.on('bingo:gameOver', (d) => {
      setBingoState((p) => ({ ...p, ...d, state: 'finished' }));
      // ✅ Update balance when game ends (win or loss — server sends real amount)
      if (d.newBalance !== undefined) setBalance(d.newBalance);
    });

    socket.on('bingo:claimResult', (d) => {
      setBingoState((p) => ({ ...p, claimResult: d }));
      // ✅ Update balance if player won
      if (d.newBalance !== undefined) setBalance(d.newBalance);
    });

    // ─── LUDO EVENTS ─────────────────────────────────────────────────────────

    socket.on('ludo:gameStarted', (d) => {
      setLudoState((p) => ({ ...p, ...d, state: 'active' }));
      // ✅ FIX 3 — Use server balance if provided, NOT local math
      // Old (wrong): setBalance(b => b - d.stake)
      // New (correct): server sends the real new balance
      if (d.newBalance !== undefined) setBalance(d.newBalance);
    });

    socket.on('ludo:diceRolled', (d) =>
      setLudoState((p) => (p ? { ...p, lastDice: d } : p))
    );

    socket.on('ludo:pieceMoved', (d) =>
      setLudoState((p) => (p ? { ...p, boardState: d.boardState, lastMove: d } : p))
    );

    socket.on('ludo:turnChanged', (d) =>
      setLudoState((p) => (p ? { ...p, currentTurnTelegramId: d.currentTurnTelegramId } : p))
    );

    socket.on('ludo:gameOver', (d) => {
      setLudoState((p) => ({ ...p, ...d, state: 'finished' }));
      // ✅ Update balance when game ends
      if (d.newBalance !== undefined) setBalance(d.newBalance);
    });

    socket.on('ludo:roomCancelled', (d) =>
      setLudoState((p) => ({ ...p, state: 'cancelled', message: d.message }))
    );

    socket.on('ludo:playerJoined', (d) =>
      setLudoState((p) => (p ? { ...p, playerCount: d.playerCount } : p))
    );

    return () => socket.disconnect();
  }, [telegramId]); // ✅ Added telegramId as dependency so it re-fetches if user changes

  // ─── EMIT HELPER ───────────────────────────────────────────────────────────
  const emit = (ev, data, cb) => {
    if (!socketRef.current?.connected) {
      cb?.({ success: false, message: 'Not connected to server. Please wait.' });
      return;
    }
    socketRef.current.emit(ev, data, cb);
  };

  // ─── BINGO ACTIONS ─────────────────────────────────────────────────────────
  const listBingoRooms = (stake, cb) =>
    emit('bingo:listRooms', { stake }, cb);

  const joinBingo = (stake, cb) =>
    emit('bingo:join', { telegramId, username, stake }, (res) => {
      if (res?.success) {
        setBingoState({
          roomId: res.roomId,
          card: res.card,
          stake,
          playerCount: res.playerCount,
          calledNumbers: [],
          state: 'waiting',
        });
        // ✅ Update balance from server response if provided
        if (res.newBalance !== undefined) setBalance(res.newBalance);
      }
      cb?.(res);
    });

  const claimBingo = (roomId, cb) =>
    emit('bingo:claimBingo', { telegramId, roomId }, cb);

  const leaveGame = () => setBingoState(null);

  // ─── LUDO ACTIONS ──────────────────────────────────────────────────────────
  const createLudoRoom = (opts, cb) =>
    emit('ludo:createRoom', { telegramId, username, ...opts }, (res) => {
      if (res?.success) {
        setLudoState({
          roomId: res.roomId,
          maxPlayers: res.maxPlayers,
          winCondition: res.winCondition,
          stake: res.stake,
          playerCount: 1,
          state: 'waiting',
          isCreator: true,
        });
        // ✅ Update balance from server response if provided
        if (res.newBalance !== undefined) setBalance(res.newBalance);
      }
      cb?.(res);
    });

  const joinLudoRoom = (roomId, cb) =>
    emit('ludo:joinRoom', { telegramId, username, roomId }, (res) => {
      // ✅ Update balance when joining (stake deducted)
      if (res?.newBalance !== undefined) setBalance(res.newBalance);
      cb?.(res);
    });

  const rollDice  = (roomId, cb) => emit('ludo:rollDice',  { telegramId, roomId }, cb);
  const movePiece = (roomId, pieceIndex, diceValue, cb) =>
    emit('ludo:movePiece', { telegramId, roomId, pieceIndex, diceValue }, cb);

  const listLudoRooms = (cb) => emit('ludo:listRooms', {}, cb);
  const leaveLudoGame = () => setLudoState(null);

  // ─── MANUAL REFRESH (bonus) ────────────────────────────────────────────────
  // Call this anywhere in your app to force-refresh balance from server
  const refreshBalance = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('user:getBalance', { telegramId }, (res) => {
        if (res?.success) setBalance(res.balance);
      });
    }
  };

  return (
    <GameCtx.Provider
      value={{
        socket: socketRef.current,
        connected,
        balance,
        setBalance,
        refreshBalance,   // ✅ New — call this to force refresh balance anywhere
        bingoState,
        setBingoState,
        ludoState,
        setLudoState,
        listBingoRooms,
        joinBingo,
        claimBingo,
        leaveGame,
        createLudoRoom,
        joinLudoRoom,
        rollDice,
        movePiece,
        listLudoRooms,
        leaveLudoGame,
      }}
    >
      {children}
    </GameCtx.Provider>
  );
};

export const useGame = () => useContext(GameCtx);
