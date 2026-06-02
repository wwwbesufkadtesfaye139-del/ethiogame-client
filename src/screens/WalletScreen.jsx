import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import DepositScreen from '../components/deposit/DepositScreen';
import WithdrawScreen from '../components/withdraw/WithdrawScreen';

const TX_ICONS   = { deposit:'📥', win:'🏆', stake:'🎮', withdrawal:'📤' };
const TX_COLORS  = { deposit:'text-green-400', win:'text-[#F5A623]', stake:'text-gray-400', withdrawal:'text-red-400' };
const STATUS_BADGE = {
  approved: 'bg-green-900/40 text-green-400 border-green-500/20',
  pending:  'bg-amber-900/40 text-amber-400 border-amber-500/20',
  rejected: 'bg-red-900/40  text-red-400   border-red-500/20',
};

export default function WalletScreen() {
  const { balance, socket } = useGame();
  const [showDeposit,  setShowDeposit]  = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [transactions, setTransactions] = useState([]);

  // ✅ Fetch real transactions from server when screen opens
  useEffect(() => {
    if (!socket) return;
    socket.emit('user:getTransactions', {}, (res) => {
      if (res?.success && res.transactions) {
        setTransactions(res.transactions);
      }
    });
  }, [socket]);

  return (
    <div className="flex flex-col gap-4 p-4 pb-6">
      {/* Balance card */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1E2235] to-[#181C27] border border-[#F5A623]/20 p-5">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#F5A623]/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2" />
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Available Balance</p>
        {/* ✅ Use real balance from GameContext */}
        <p className="text-4xl font-extrabold text-[#F5A623] font-mono mb-4" style={{fontFamily:'Syne,sans-serif'}}>
          {(balance || 0).toFixed(2)} <span className="text-xl text-[#F5A623]/60">Br</span>
        </p>
        <div className="flex gap-2">
          <motion.button whileTap={{ scale:0.92 }} onClick={() => setShowDeposit(true)}
            className="flex-1 py-2.5 rounded-xl bg-[#F5A623] text-black text-sm font-bold shadow-[0_0_16px_rgba(245,166,35,0.35)]"
            style={{fontFamily:'Syne,sans-serif'}}>
            + Deposit
          </motion.button>
          {/* ✅ Withdraw button now has onClick handler */}
          <motion.button whileTap={{ scale:0.92 }} onClick={() => setShowWithdraw(true)}
            className="flex-1 py-2.5 rounded-xl bg-[#1E2235] border border-[#2A2F45] text-gray-400 text-sm font-bold"
            style={{fontFamily:'Syne,sans-serif'}}>
            Withdraw
          </motion.button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { l:'Total Won',  v:'1,200 Br', c:'text-[#F5A623]' },
          { l:'Deposited',  v:'500 Br',   c:'text-green-400' },
          { l:'Games',      v:'24',        c:'text-blue-400'  },
        ].map(s => (
          <div key={s.l} className="bg-[#181C27] border border-[#2A2F45] rounded-xl p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{s.l}</p>
            <p className={`text-sm font-bold mt-0.5 ${s.c}`} style={{fontFamily:'Syne,sans-serif'}}>{s.v}</p>
          </div>
        ))}
      </div>

      {/* Transactions */}
      <div className="bg-[#181C27] border border-[#2A2F45] rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2A2F45] flex items-center justify-between">
          <h3 className="font-bold text-white text-sm" style={{fontFamily:'Syne,sans-serif'}}>Transaction History</h3>
          <span className="text-xs text-gray-500">{transactions.length} records</span>
        </div>
        <div className="flex flex-col divide-y divide-[#2A2F45]">
          {transactions.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-6">No transactions yet</p>
          ) : transactions.map((tx, i) => (
            <motion.div key={tx._id || i} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
              transition={{ delay: i*0.05 }}
              className="flex items-center gap-3 px-4 py-3.5">
              <span className="text-xl flex-shrink-0">{TX_ICONS[tx.type] || '💳'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white capitalize">{tx.type}</p>
                <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-sm font-mono font-bold ${TX_COLORS[tx.type] || 'text-white'}`}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount} Br
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${STATUS_BADGE[tx.status] || ''}`}>
                  {tx.status}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Telebirr info */}
      <div className="bg-[#181C27] border border-[#2A2F45] rounded-2xl p-4 flex flex-col gap-2">
        <h3 className="text-sm font-bold text-white" style={{fontFamily:'Syne,sans-serif'}}>Payment Method</h3>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1E2235] border border-[#2A2F45] flex items-center justify-center text-xl">📱</div>
          <div>
            <p className="text-sm text-white font-semibold">Telebirr</p>
            <p className="text-xs text-gray-500">Instant deposits • 15 min approval</p>
          </div>
        </div>
      </div>

      {/* Deposit sheet */}
      <AnimatePresence>
        {showDeposit && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-end"
            onClick={() => setShowDeposit(false)}>
            <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
              transition={{ type:'spring', damping:25, stiffness:300 }}
              className="w-full rounded-t-2xl overflow-y-auto max-h-[92vh]"
              onClick={e => e.stopPropagation()}>
              <DepositScreen onClose={() => setShowDeposit(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ Withdraw sheet */}
      <AnimatePresence>
        {showWithdraw && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-end"
            onClick={() => setShowWithdraw(false)}>
            <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
              transition={{ type:'spring', damping:25, stiffness:300 }}
              className="w-full rounded-t-2xl overflow-y-auto max-h-[92vh]"
              onClick={e => e.stopPropagation()}>
              <WithdrawScreen onClose={() => setShowWithdraw(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
      }
