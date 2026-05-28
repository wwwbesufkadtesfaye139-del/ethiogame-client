import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env?.VITE_SERVER_URL || 'http://localhost:3000';

const GameCtx = createContext(null);

export const GameProvider = ({ children, telegramId, username }) => {
  const socketRef   = useRef(null);
  const [connected,  setConnected]  = useState(false);
  const [balance,    setBalance]    = useState(0);
  const [bingoState, setBingoState] = useState(null);
  const [ludoState,  setLudoState]  = useState(null);

  useEffect(() => {
    const SERVER = window.__VITE_SERVER_URL__ || 'http://localhost:3000';
    const socket = io(SERVER, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect',    () => setConnected(true));
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

  const emit = (ev, data, cb) => socketRef.current?.emit(ev, data, cb);

  const joinBingo = (stake, cb) => emit('bingo:join', { telegramId, username, stake }, res => {
    if (res?.success) setBingoState({ roomId:res.roomId, card:res.card, stake, playerCount:res.playerCount, calledNumbers:[], state:'waiting' });
    cb?.(res);
  });

  const claimBingo = (roomId, cb) => emit('bingo:claimBingo', { telegramId, roomId }, cb);

  const createLudoRoom = (opts, cb) => emit('ludo:createRoom', { telegramId, username, ...opts }, res => {
    if (res?.success) setLudoState({ roomId:res.roomId, maxPlayers:res.maxPlayers, winCondition:res.winCondition, stake:res.stake, playerCount:1, state:'waiting', isCreator:true });
    cb?.(res);
  });

  const joinLudoRoom  = (roomId, cb) => emit('ludo:joinRoom',  { telegramId, username, roomId }, cb);
  const rollDice      = (roomId, cb) => emit('ludo:rollDice',  { telegramId, roomId }, cb);
  const movePiece     = (roomId, pieceIndex, diceValue, cb) => emit('ludo:movePiece', { telegramId, roomId, pieceIndex, diceValue }, cb);
  const listLudoRooms = (cb)         => emit('ludo:listRooms', {}, cb);

  return (
    <GameCtx.Provider value={{ socket:socketRef.current, connected, balance, setBalance, bingoState, setBingoState, ludoState, setLudoState, joinBingo, claimBingo, createLudoRoom, joinLudoRoom, rollDice, movePiece, listLudoRooms }}>
      {children}
    </GameCtx.Provider>
  );
};

export const useGame = () => useContext(GameCtx);
