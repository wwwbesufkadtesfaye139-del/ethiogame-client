import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = 'https://ethiogame-server-production.up.railway.app';

const GameCtx = createContext(null);

export const GameProvider = ({ children, telegramId, username }) => {
  const socketRef   = useRef(null);
  const [connected,  setConnected]  = useState(false);
  const [balance,    setBalance]    = useState(0);
  const [bingoState, setBingoState] = useState(null);
  const [ludoState,  setLudoState]  = useState(null);

  useEffect(() => {
    const socket = io(SERVER_URL, { transports: ['websocket', 'polling'], reconnection: true });
    socketRef.current = socket;
    socket.on('connect',    () => { setConnected(true); console.log('Connected to server'); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('bingo:gameStarted',  d => { setBingoState(p => ({...p,...d,calledNumbers:[],state:'active'})); setBalance(b => b - d.stake); });
    socket.on('bingo:numberDrawn',  d => setBingoState(p => p ? {...p,calledNumbers:d.calledNumbers,lastDrawn:d.drawnNumber} : p));
    socket.on('bingo:countdown',    d => setBingoState(p => ({...p,...d,state:'countdown'})));
    socket.on('bingo:playerJoined', d => setBingoState(p => p ? {...p,playerCount:d.playerCount} : p));
    socket.on('bingo:gameOver',     d => setBingoState(p => ({...p,...d,state:'finished'})));
    socket.on('bingo:claimResult',  d => setBingoState(p => ({...p,claimResult:d})));
    socket.on('ludo:gameStarted',   d => { setLudoState(p => ({...p,...d,state:'active'})); setBalance(b => b - d.stake); });
    socket.on('ludo:diceRolled',    d => setLudoState(p => p ? {...p,lastDice:d} : p));
    socket.on('ludo:pieceMoved',    d => setLudoState(p => p ? {...p,boardState:d.boardState,lastMove:d} : p));
    socket.on('ludo:turnChanged',   d => setLudoState(p => p ? {...p,currentTurnTelegramId:d.currentTurnTelegramId} : p));
    socket.on('ludo:gameOver',      d => setLudoState(p => ({...p,...d,state:'finished'})));
    socket.on('ludo:roomCancelled', d => setLudoState(p => ({...p,state:'cancelled',message:d.message})));
    socket.on('ludo:playerJoined',  d => setLudoState(p => p ? {...p,playerCount:d.playerCount} : p));
    return () => socket.disconnect();
  }, []);

  const emit = (ev, data, cb) => {
    if (!socketRef.current?.connected) {
      cb?.({ success: false, message: 'Not connected to server. Please wait.' });
      return;
    }
    socketRef.current.emit(ev, data, cb);
  };

  const listBingoRooms = (stake, cb) => emit('bingo:listRooms', { stake }, cb);
  const joinBingo = (stake, cb) => emit('bingo:join', { telegramId, username, stake }, res => {
    if (res?.success) setBingoState({ roomId:res.roomId, card:res.card, stake, playerCount:res.playerCount, calledNumbers:[], state:'waiting' });
    cb?.(res);
  });
  const claimBingo = (roomId, cb) => emit('bingo:claimBingo', { telegramId, roomId }, cb);
  const leaveGame = () => setBingoState(null);

  const createLudoRoom = (opts, cb) => emit('ludo:createRoom', { telegramId, username, ...opts }, res => {
    if (res?.success) setLudoState({ roomId:res.roomId, maxPlayers:res.maxPlayers, winCondition:res.winCondition, stake:res.stake, playerCount:1, state:'waiting', isCreator:true });
    cb?.(res);
  });
  const joinLudoRoom  = (roomId, cb) => emit('ludo:joinRoom',  { telegramId, username, roomId }, cb);
  const rollDice      = (roomId, cb) => emit('ludo:rollDice',  { telegramId, roomId }, cb);
  const movePiece     = (roomId, pieceIndex, diceValue, cb) => emit('ludo:movePiece', { telegramId, roomId, pieceIndex, diceValue }, cb);
  const listLudoRooms = (cb) => emit('ludo:listRooms', {}, cb);
  const leaveLudoGame = () => setLudoState(null);

  return (
    <GameCtx.Provider value={{ socket:socketRef.current, connected, balance, setBalance, bingoState, setBingoState, ludoState, setLudoState, listBingoRooms, joinBingo, claimBingo, leaveGame, createLudoRoom, joinLudoRoom, rollDice, movePiece, listLudoRooms, leaveLudoGame }}>
      {children}
    </GameCtx.Provider>
  );
};

export const useGame = () => useContext(GameCtx);
