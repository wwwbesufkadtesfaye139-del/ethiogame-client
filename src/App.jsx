import { useState } from 'react';
import { useTelegram }   from './hooks/useTelegram';
import { GameProvider, useGame } from './context/GameContext';
import WalletBar    from './components/WalletBar';
import BottomNav    from './components/BottomNav';
import HomeScreen   from './screens/HomeScreen';
import BingoScreen  from './screens/BingoScreen';
import LudoScreen   from './screens/LudoScreen';
import WalletScreen from './screens/WalletScreen';
import DepositScreen from './components/deposit/DepositScreen';
import { AnimatePresence, motion } from 'framer-motion';

const SCREENS = { home: HomeScreen, bingo: BingoScreen, ludo: LudoScreen, wallet: WalletScreen };

function AppInner() {
  const { balance } = useGame();
  const { user }    = useTelegram();
  const [screen, setScreen]       = useState('home');
  const [showDeposit, setDeposit] = useState(false);

  const Screen = SCREENS[screen] || HomeScreen;

  return (
    <div className="flex flex-col h-full bg-[#0F1117] text-white overflow-hidden" style={{fontFamily:'DM Sans,sans-serif'}}>
      <WalletBar user={user} balance={balance} connected={true} onDepositClick={() => setDeposit(true)} />

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div key={screen}
            initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }}
            transition={{ duration:0.2 }}
            className="h-full overflow-y-auto" style={{scrollbarWidth:'none'}}>
            <Screen onNavigate={setScreen} />
          </motion.div>
        </AnimatePresence>
      </div>

      <BottomNav active={screen} onChange={setScreen} />

      <AnimatePresence>
        {showDeposit && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-[200] bg-black/75 flex items-end"
            onClick={() => setDeposit(false)}>
            <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
              transition={{ type:'spring', damping:28, stiffness:320 }}
              className="w-full max-h-[92vh] overflow-y-auto rounded-t-2xl"
              onClick={e => e.stopPropagation()}>
              <DepositScreen onClose={() => setDeposit(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const { user } = useTelegram();
  return (
    <GameProvider telegramId={user?.id || 'dev'} username={user?.username || 'player'}>
      <AppInner />
    </GameProvider>
  );
}
