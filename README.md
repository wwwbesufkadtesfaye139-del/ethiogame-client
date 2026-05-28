# EthioGame — React Frontend

Telegram Mini App for Bingo & Ludo with real Birr stakes.

## Tech Stack
- **React 18** + **Vite**
- **Tailwind CSS** — dark-themed utility styling
- **Framer Motion** — animations, dice rolls, victory celebrations
- **Socket.io Client** — real-time game sync
- **Telegram Web App SDK** — user identity & haptics

## Project Structure
```
src/
├── App.jsx                        # Root with GameProvider + modal sheet
├── main.jsx
├── index.css
├── hooks/
│   ├── useTelegram.js             # SDK init, user data, haptic feedback
│   └── useSocket.js               # Singleton socket connection
├── context/
│   └── GameContext.jsx            # Global socket events + game actions
├── components/
│   ├── WalletBar.jsx              # Animated balance bar + deposit button
│   ├── BottomNav.jsx              # Tab navigation with motion indicator
│   ├── bingo/
│   │   ├── BingoCard.jsx          # 5×5 interactive daubing grid
│   │   ├── BingoRoomList.jsx      # 200 rooms with live countdown
│   │   └── CalledNumbers.jsx      # Expandable called-numbers list
│   ├── ludo/
│   │   ├── LudoBoard.jsx          # 4-color board with piece bases
│   │   ├── LudoDice.jsx           # Animated dice with roll button
│   │   └── LudoRoomCreator.jsx    # Modal: players/winCondition/stake
│   └── deposit/
│       └── DepositScreen.jsx      # Telebirr number + screenshot upload
└── screens/
    ├── HomeScreen.jsx             # Landing with game cards
    ├── BingoScreen.jsx            # Rooms list + card + claim button
    ├── LudoScreen.jsx             # Board + dice + room creator
    └── WalletScreen.jsx           # Balance, transactions, deposit
```

## Getting Started
```bash
npm install
cp .env.example .env         # set VITE_SERVER_URL
npm run dev
```

## Socket.io Events
See `src/context/GameContext.jsx` for the full event map.
All event names match the backend exactly (step 1 naming convention).

## Telegram SDK
The app calls `window.Telegram.WebApp.ready()` on mount and reads
`initDataUnsafe.user` for `first_name`, `username`, `photo_url`, and `id`.
Falls back to mock data when running outside Telegram (dev mode).
