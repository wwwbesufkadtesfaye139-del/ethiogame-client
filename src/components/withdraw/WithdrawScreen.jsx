import { motion } from 'framer-motion';
import { useState } from 'react';
import { useGame } from '../../context/GameContext';

export default function WithdrawScreen({ onClose }) {
  const { balance, socket } = useGame();
  const [step,      setStep]      = useState('amount'); // 'amount' | 'phone' | 'done'
  const [amount,    setAmount]    = useState('');
  const [phone,     setPhone]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [txId,      setTxId]      = useState('');

  const MIN = 50;
  const MAX = 5000;

  const handleAmountNext = () => {
    setError('');
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0)   return setError('Please enter a valid amount');
    if (amt < MIN)                 return setError(`Minimum withdrawal is ${MIN} Birr`);
    if (amt > MAX)                 return setError(`Maximum withdrawal is ${MAX} Birr`);
    if (amt > balance)             return setError(`Insufficient balance. Available: ${balance.toFixed(2)} Birr`);
    setStep('phone');
  };

  const handleSubmit = () => {
    setError('');
    const phoneRegex = /^(\+?251|0)[97]\d{8}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return setError('Please enter a valid Ethiopian Telebirr number (e.g. 0912345678)');
    }

    if (!socket?.connected) {
      return setError('Not connected to server. Please try again.');
    }

    setLoading(true);

    // ✅ Send withdraw request through socket with telegramId
    const telegramId = String(window.Telegram?.WebApp?.initDataUnsafe?.user?.id || '');
    socket.emit('user:requestWithdraw', {
      telegramId,
      amount: parseFloat(amount),
      phone:  phone.replace(/\s/g, ''),
    }, (res) => {
      setLoading(false);
      if (res?.success) {
        setTxId(res.txId || '');
        setStep('done');
      } else {
        setError(res?.message || 'Something went wrong. Please try again.');
      }
    });
  };

  // ── Done screen ──────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="bg-[#181C27] p-6 flex flex-col items-center gap-5 text-center rounded-t-2xl min-h-[40vh] justify-center">
        <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', stiffness:300 }}
          className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center text-3xl">
          ✓
        </motion.div>
        <div>
          <h3 className="text-lg font-bold text-white" style={{fontFamily:'Syne,sans-serif'}}>Withdrawal Requested!</h3>
          <p className="text-sm text-gray-400 mt-1">
            Your request for <span className="text-[#F5A623] font-bold">{amount} Birr</span> has been submitted.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            🔒 This amount is locked until processed.{'\n'}
            You will be notified once approved.
          </p>
          {txId && (
            <p className="text-xs text-gray-600 mt-2 font-mono">ID: {txId}</p>
          )}
        </div>
        <motion.button whileTap={{ scale:0.94 }} onClick={onClose}
          className="px-8 py-3 rounded-xl bg-[#F5A623] text-black font-bold"
          style={{fontFamily:'Syne,sans-serif'}}>
          Done
        </motion.button>
      </div>
    );
  }

  return (
    <div className="bg-[#181C27] rounded-t-2xl p-5 flex flex-col gap-5">
      {/* Drag handle */}
      <div className="w-10 h-1 rounded-full bg-[#2A2F45] mx-auto -mt-1" />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white" style={{fontFamily:'Syne,sans-serif'}}>
          {step === 'amount' ? 'Withdraw Funds' : 'Telebirr Number'}
        </h2>
        <motion.button whileTap={{ scale:0.9 }} onClick={onClose}
          className="w-8 h-8 rounded-lg bg-[#1E2235] border border-[#2A2F45] flex items-center justify-center text-gray-500">✕
        </motion.button>
      </div>

      {/* Available balance */}
      <div className="bg-[#1E2235] border border-[#F5A623]/20 rounded-xl p-3 flex items-center justify-between">
        <p className="text-xs text-gray-500">Available Balance</p>
        <p className="text-sm font-bold text-[#F5A623]">{(balance || 0).toFixed(2)} Birr</p>
      </div>

      {/* ── Step 1: Amount ── */}
      {step === 'amount' && (
        <>
          <div className="flex flex-col gap-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Amount to Withdraw</p>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Enter amount in Birr"
                className="w-full bg-[#1E2235] border border-[#2A2F45] rounded-xl px-4 py-3.5 text-white text-lg font-mono focus:outline-none focus:border-[#F5A623]/50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">Br</span>
            </div>
            <p className="text-xs text-gray-600">Min: {MIN} Birr • Max: {MAX} Birr</p>
          </div>

          {/* Quick amount buttons */}
          <div className="grid grid-cols-4 gap-2">
            {[50, 100, 200, 500].map(v => (
              <motion.button key={v} whileTap={{ scale:0.92 }}
                onClick={() => setAmount(String(v))}
                className={`py-2 rounded-xl text-sm font-bold border transition-all ${amount === String(v) ? 'bg-[#F5A623]/20 border-[#F5A623]/50 text-[#F5A623]' : 'bg-[#1E2235] border-[#2A2F45] text-gray-400'}`}>
                {v}
              </motion.button>
            ))}
          </div>

          {error && <p className="text-xs text-red-400 text-center">{error}</p>}

          <motion.button whileTap={{ scale:0.96 }} onClick={handleAmountNext}
            disabled={!amount}
            className="w-full py-4 rounded-xl font-bold text-base disabled:opacity-40"
            style={{ background: amount ? '#F5A623' : '#1E2235', color: amount ? '#0F1117' : '#4B5563', fontFamily:'Syne,sans-serif' }}>
            Continue →
          </motion.button>
        </>
      )}

      {/* ── Step 2: Phone ── */}
      {step === 'phone' && (
        <>
          <div className="bg-[#1E2235] border border-[#2A2F45] rounded-xl p-3 flex items-center justify-between">
            <p className="text-xs text-gray-500">Withdrawal Amount</p>
            <p className="text-sm font-bold text-white">{amount} Birr</p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Your Telebirr Number</p>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. 0912345678"
              className="w-full bg-[#1E2235] border border-[#2A2F45] rounded-xl px-4 py-3.5 text-white text-lg font-mono focus:outline-none focus:border-[#F5A623]/50"
            />
            <p className="text-xs text-gray-600">Enter the Telebirr number to receive funds</p>
          </div>

          <div className="bg-amber-950/40 border border-amber-500/20 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-400/90 leading-relaxed">
              ⚠️ Make sure this is your correct Telebirr number. The admin will send <strong>{amount} Birr</strong> to this number.
            </p>
          </div>

          {error && <p className="text-xs text-red-400 text-center">{error}</p>}

          <div className="flex gap-2">
            <motion.button whileTap={{ scale:0.96 }} onClick={() => { setStep('amount'); setError(''); }}
              className="flex-1 py-4 rounded-xl font-bold text-sm bg-[#1E2235] border border-[#2A2F45] text-gray-400"
              style={{fontFamily:'Syne,sans-serif'}}>
              ← Back
            </motion.button>
            <motion.button whileTap={{ scale:0.96 }} onClick={handleSubmit}
              disabled={!phone || loading}
              className="flex-1 py-4 rounded-xl font-bold text-base disabled:opacity-40"
              style={{ background: phone ? '#F5A623' : '#1E2235', color: phone ? '#0F1117' : '#4B5563', fontFamily:'Syne,sans-serif' }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span animate={{ rotate:360 }} transition={{ repeat:Infinity, duration:0.8, ease:'linear' }}
                    className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                  Submitting…
                </span>
              ) : 'Submit Request'}
            </motion.button>
          </div>
        </>
      )}
    </div>
  );
}
