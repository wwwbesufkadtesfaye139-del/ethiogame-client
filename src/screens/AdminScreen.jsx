/**
 * AdminScreen.jsx
 * ───────────────
 * Full admin panel for EthioGame, embedded in the Telegram Mini App.
 * Only visible when the logged-in Telegram user ID matches ADMIN_TELEGRAM_ID.
 *
 * HOW TO SET YOUR ADMIN ID:
 *   Replace YOUR_TELEGRAM_ID_HERE below with your actual Telegram user ID (numbers only).
 *   You can get it by messaging @userinfobot on Telegram.
 *
 * ALSO REQUIRED — add to ethiogame-server index.js (see adminRoutes.js instructions):
 *   const adminRoutes = require('./adminRoutes');
 *   app.use('/admin/api', adminRoutes);
 *   And add ADMIN_SECRET env var to Railway.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameContext';

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// 👇 Replace this with your real Telegram numeric ID
const ADMIN_TELEGRAM_ID = '6584576909';

const SERVER = 'https://ethiogame-server-production.up.railway.app';

// 👇 Replace this with your ADMIN_SECRET Railway env value
const ADMIN_SECRET = 'BESUTI@11';

// ─── API helper ───────────────────────────────────────────────────────────────
async function adminFetch(path, options = {}) {
  const res = await fetch(`${SERVER}/admin/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ADMIN_SECRET}`,
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// ─── Shared UI Components ─────────────────────────────────────────────────────

function StatCard({ label, value, color = 'text-[#F5A623]', sub }) {
  return (
    <div className="bg-[#181C27] border border-[#2A2F45] rounded-xl p-3">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-extrabold font-mono ${color}`} style={{ fontFamily: 'Syne,sans-serif' }}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function Badge({ status }) {
  const styles = {
    pending:   'bg-amber-900/40 text-amber-400 border-amber-500/30',
    approved:  'bg-green-900/40 text-green-400 border-green-500/30',
    rejected:  'bg-red-900/40 text-red-400 border-red-500/30',
    active:    'bg-blue-900/40 text-blue-400 border-blue-500/30',
    completed: 'bg-green-900/40 text-green-400 border-green-500/30',
    cancelled: 'bg-gray-800/60 text-gray-500 border-gray-600/30',
    blocked:   'bg-red-900/40 text-red-400 border-red-500/30',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wide ${styles[status] || styles.cancelled}`}>
      {status}
    </span>
  );
}

function SectionBtn({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
        active
          ? 'bg-[#F5A623] text-black'
          : 'bg-[#181C27] border border-[#2A2F45] text-gray-400'
      }`}
      style={{ fontFamily: 'Syne,sans-serif' }}
    >
      {children}
    </button>
  );
}

function BottomSheet({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] bg-black/75 flex items-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="w-full bg-[#181C27] border-t border-[#2A2F45] rounded-t-2xl px-4 pt-4 pb-8 max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-[#2A2F45] rounded-full mx-auto mb-4" />
            <h3 className="text-base font-bold text-white mb-4" style={{ fontFamily: 'Syne,sans-serif' }}>{title}</h3>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Input({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1 mb-3">
      {label && <label className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</label>}
      <input
        {...props}
        className="bg-[#0F1117] border border-[#2A2F45] text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#F5A623] font-mono"
      />
    </div>
  );
}

function ActionBtn({ children, onClick, variant = 'primary', className = '' }) {
  const styles = {
    primary: 'bg-[#F5A623] text-black',
    danger:  'bg-red-500/20 text-red-400 border border-red-500/30',
    success: 'bg-green-500/20 text-green-400 border border-green-500/30',
    ghost:   'bg-[#0F1117] border border-[#2A2F45] text-gray-400',
  };
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={`px-4 py-2.5 rounded-xl text-sm font-bold ${styles[variant]} ${className}`}
      style={{ fontFamily: 'Syne,sans-serif' }}
    >
      {children}
    </motion.button>
  );
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return `${Math.floor(diff)}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function Toast({ msg, type, visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
          className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[999] px-4 py-2.5 rounded-xl text-sm font-bold shadow-xl
            ${type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}
          style={{ fontFamily: 'Syne,sans-serif' }}
        >
          {type === 'error' ? '✕ ' : '✓ '}{msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AdminScreen() {
  const { telegramId } = useGame();
  const [tab, setTab] = useState('dashboard');
  const [toast, setToast] = useState({ msg: '', type: 'success', visible: false });

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type, visible: true });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }, []);

  // Access gate
  if (String(telegramId) !== String(ADMIN_TELEGRAM_ID)) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <span className="text-5xl">🔒</span>
        <p className="text-white font-bold text-lg" style={{ fontFamily: 'Syne,sans-serif' }}>Admin Only</p>
        <p className="text-gray-500 text-sm">This section is restricted.</p>
        <p className="text-[10px] text-gray-700 font-mono">Your ID: {telegramId}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0F1117] text-white overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <h1 className="text-lg font-extrabold text-[#F5A623]" style={{ fontFamily: 'Syne,sans-serif' }}>
          ⚙️ Admin Panel
        </h1>
        <p className="text-[10px] text-gray-500">EthioGame Management</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 px-4 pb-3 flex-shrink-0 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        <SectionBtn active={tab === 'dashboard'}    onClick={() => setTab('dashboard')}>📊 Overview</SectionBtn>
        <SectionBtn active={tab === 'players'}      onClick={() => setTab('players')}>👥 Players</SectionBtn>
        <SectionBtn active={tab === 'transactions'} onClick={() => setTab('transactions')}>💸 Txns</SectionBtn>
        <SectionBtn active={tab === 'sessions'}     onClick={() => setTab('sessions')}>🎮 Games</SectionBtn>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4" style={{ scrollbarWidth: 'none' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {tab === 'dashboard'    && <DashboardTab showToast={showToast} />}
            {tab === 'players'      && <PlayersTab   showToast={showToast} />}
            {tab === 'transactions' && <TransactionsTab showToast={showToast} />}
            {tab === 'sessions'     && <SessionsTab  showToast={showToast} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <Toast {...toast} />
    </div>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────
function DashboardTab({ showToast }) {
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approveSheet, setApproveSheet] = useState(null);
  const [rejectSheet, setRejectSheet] = useState(null);
  const [approveAmt, setApproveAmt] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        adminFetch('/stats'),
        adminFetch('/transactions?status=pending&type=deposit&limit=10'),
      ]);
      setStats(s);
      setPending(t.transactions);
    } catch (e) {
      showToast(e.message, 'error');
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const doApprove = async () => {
    const amt = parseFloat(approveAmt);
    if (!amt || amt <= 0) return showToast('Enter a valid amount', 'error');
    try {
      const d = await adminFetch(`/transactions/${approveSheet._id}/approve`, {
        method: 'POST', body: { amount: amt },
      });
      showToast(`✓ Approved! ${amt} ETB → Balance: ${d.newBalance?.toFixed(2)}`);
      setApproveSheet(null);
      setApproveAmt('');
      load();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const doReject = async () => {
    try {
      await adminFetch(`/transactions/${rejectSheet._id}/reject`, {
        method: 'POST', body: { reason: rejectReason },
      });
      showToast('Rejected.');
      setRejectSheet(null);
      setRejectReason('');
      load();
    } catch (e) { showToast(e.message, 'error'); }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col gap-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Total Players"     value={stats?.totalUsers ?? '—'} />
        <StatCard label="Birr in System"    value={`${stats?.totalBalanceInSystem?.toLocaleString() ?? '—'} Br`} color="text-green-400" />
        <StatCard label="Pending Deposits"  value={stats?.pendingDeposits ?? '—'}  color="text-amber-400" />
        <StatCard label="Pending Withdraw"  value={stats?.pendingWithdrawals ?? '—'} color="text-orange-400" />
        <StatCard label="Active Games"      value={stats?.activeSessions ?? '—'}  color="text-blue-400" />
        <StatCard label="Completed Games"   value={stats?.completedGames ?? '—'}  color="text-green-400" />
        <StatCard label="Blocked Players"   value={stats?.blockedUsers ?? '—'}    color="text-red-400" />
        <StatCard label="Approved Today"    value={stats?.approvedToday ?? '—'}   color="text-green-400" />
      </div>

      {/* Pending deposits */}
      <div className="bg-[#181C27] border border-[#2A2F45] rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2A2F45] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <h3 className="text-sm font-bold" style={{ fontFamily: 'Syne,sans-serif' }}>Pending Deposits</h3>
          </div>
          <button onClick={load} className="text-[10px] text-gray-500 bg-[#0F1117] border border-[#2A2F45] px-2 py-1 rounded-lg">↺ Refresh</button>
        </div>

        {pending.length === 0 ? (
          <p className="text-center text-gray-600 text-xs py-6">No pending deposits 🎉</p>
        ) : pending.map(t => (
          <div key={t._id} className="flex items-center gap-3 px-4 py-3 border-b border-[#2A2F45] last:border-0">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-sm flex-shrink-0">📥</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">@{t.username}</p>
              <p className="text-[10px] text-gray-500 font-mono">{t.telegramId} · {timeAgo(t.createdAt)}</p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <motion.button whileTap={{ scale: 0.9 }}
                onClick={() => { setApproveSheet(t); setApproveAmt(''); }}
                className="px-2.5 py-1.5 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-bold">
                ✓
              </motion.button>
              <motion.button whileTap={{ scale: 0.9 }}
                onClick={() => { setRejectSheet(t); setRejectReason(''); }}
                className="px-2.5 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold">
                ✕
              </motion.button>
            </div>
          </div>
        ))}
      </div>

      {/* Approve sheet */}
      <BottomSheet open={!!approveSheet} onClose={() => setApproveSheet(null)} title="Approve Deposit">
        {approveSheet && (
          <>
            <p className="text-xs text-gray-500 mb-3 font-mono">@{approveSheet.username} · {approveSheet.telegramId}</p>
            <Input label="Amount to Credit (ETB)" type="number" step="0.01" min="1"
              value={approveAmt} onChange={e => setApproveAmt(e.target.value)}
              placeholder="e.g. 200" />
            <div className="flex gap-2 mt-2">
              <ActionBtn variant="ghost" onClick={() => setApproveSheet(null)} className="flex-1">Cancel</ActionBtn>
              <ActionBtn variant="success" onClick={doApprove} className="flex-1">✓ Approve</ActionBtn>
            </div>
          </>
        )}
      </BottomSheet>

      {/* Reject sheet */}
      <BottomSheet open={!!rejectSheet} onClose={() => setRejectSheet(null)} title="Reject Deposit">
        {rejectSheet && (
          <>
            <p className="text-xs text-gray-500 mb-3 font-mono">@{rejectSheet.username} · {rejectSheet.telegramId}</p>
            <Input label="Reason" type="text"
              value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Blurry screenshot" />
            <div className="flex gap-2 mt-2">
              <ActionBtn variant="ghost" onClick={() => setRejectSheet(null)} className="flex-1">Cancel</ActionBtn>
              <ActionBtn variant="danger" onClick={doReject} className="flex-1">✕ Reject</ActionBtn>
            </div>
          </>
        )}
      </BottomSheet>
    </div>
  );
}

// ─── Players Tab ──────────────────────────────────────────────────────────────
function PlayersTab({ showToast }) {
  const [users, setUsers] = useState([]);
  const [page, setPage]   = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);   // full user detail
  const [balSheet, setBalSheet] = useState(null);
  const [blockSheet, setBlockSheet] = useState(null);
  const [balAdj, setBalAdj]   = useState('');
  const [balNote, setBalNote] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [searchTimer, setSearchTimer] = useState(null);

  const load = useCallback(async (pg = 1, q = search, f = filter) => {
    setLoading(true);
    try {
      const d = await adminFetch(`/users?page=${pg}&search=${encodeURIComponent(q)}&filter=${f}&sort=createdAt`);
      setUsers(d.users);
      setPage(d.page);
      setPages(d.pages);
    } catch (e) { showToast(e.message, 'error'); }
    setLoading(false);
  }, [search, filter, showToast]);

  useEffect(() => { load(1); }, [filter]);

  const handleSearch = (v) => {
    setSearch(v);
    clearTimeout(searchTimer);
    setSearchTimer(setTimeout(() => load(1, v, filter), 400));
  };

  const openDetail = async (tid) => {
    try {
      const d = await adminFetch(`/users/${tid}`);
      setSelected(d);
    } catch (e) { showToast(e.message, 'error'); }
  };

  const doAdjustBalance = async () => {
    const adj = parseFloat(balAdj);
    if (isNaN(adj) || adj === 0) return showToast('Enter a non-zero amount', 'error');
    try {
      const d = await adminFetch(`/users/${balSheet.user.telegramId}/balance`, {
        method: 'PATCH', body: { adjustment: adj, note: balNote },
      });
      showToast(`Balance: ${d.oldBalance.toFixed(2)} → ${d.newBalance.toFixed(2)} ETB`);
      setBalSheet(null);
      setBalAdj(''); setBalNote('');
      load(page);
      if (selected?.user?.telegramId === balSheet.user.telegramId) openDetail(balSheet.user.telegramId);
    } catch (e) { showToast(e.message, 'error'); }
  };

  const doBlock = async () => {
    const blocking = !blockSheet.user.isBlocked;
    try {
      await adminFetch(`/users/${blockSheet.user.telegramId}/block`, {
        method: 'PATCH', body: { blocked: blocking, reason: blockReason },
      });
      showToast(blocking ? 'Player blocked.' : 'Player unblocked.');
      setBlockSheet(null);
      setBlockReason('');
      load(page);
      if (selected?.user?.telegramId === blockSheet.user.telegramId) openDetail(blockSheet.user.telegramId);
    } catch (e) { showToast(e.message, 'error'); }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Search & filter */}
      <div className="flex gap-2">
        <input
          className="flex-1 bg-[#181C27] border border-[#2A2F45] text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-[#F5A623] font-mono"
          placeholder="Search username or ID…"
          value={search}
          onChange={e => handleSearch(e.target.value)}
        />
        <select
          className="bg-[#181C27] border border-[#2A2F45] text-white rounded-xl px-2 py-2 text-xs outline-none"
          value={filter}
          onChange={e => { setFilter(e.target.value); load(1, search, e.target.value); }}
        >
          <option value="all">All</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {/* User list */}
      {loading ? <LoadingSpinner /> : (
        <>
          <div className="bg-[#181C27] border border-[#2A2F45] rounded-2xl overflow-hidden">
            {users.length === 0 ? (
              <p className="text-center text-gray-600 text-xs py-8">No users found.</p>
            ) : users.map((u, i) => (
              <motion.div key={u._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 px-4 py-3 border-b border-[#2A2F45] last:border-0">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-700/30 flex items-center justify-center font-bold text-[#F5A623] text-sm flex-shrink-0">
                  {(u.username || u.firstName || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-white truncate">@{u.username}</p>
                    {u.isBlocked && <Badge status="blocked" />}
                  </div>
                  <p className="text-[10px] text-gray-500 font-mono">{u.telegramId}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {/* FIX: show available balance (balance - lockedBalance) to match WalletBar */}
                  <p className="text-sm font-bold text-[#F5A623] font-mono">
                    {((u.balance || 0) - (u.lockedBalance || 0)).toFixed(2)} Br
                  </p>
                  {u.lockedBalance > 0 && (
                    <p className="text-[9px] text-orange-400 font-mono">🔒 {u.lockedBalance.toFixed(2)} locked</p>
                  )}
                  <p className="text-[10px] text-gray-600">{u.gamesPlayed || 0} games</p>
                </div>
                <motion.button whileTap={{ scale: 0.85 }}
                  onClick={() => openDetail(u.telegramId)}
                  className="ml-1 w-7 h-7 rounded-lg bg-[#0F1117] border border-[#2A2F45] flex items-center justify-center text-gray-400 text-xs flex-shrink-0">
                  ›
                </motion.button>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between">
              <ActionBtn variant="ghost" onClick={() => load(page - 1)} className={page <= 1 ? 'opacity-30' : ''}>← Prev</ActionBtn>
              <span className="text-xs text-gray-500">{page} / {pages}</span>
              <ActionBtn variant="ghost" onClick={() => load(page + 1)} className={page >= pages ? 'opacity-30' : ''}>Next →</ActionBtn>
            </div>
          )}
        </>
      )}

      {/* User Detail Sheet */}
      <BottomSheet open={!!selected} onClose={() => setSelected(null)} title="Player Profile">
        {selected && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-700/30 flex items-center justify-center font-bold text-[#F5A623] text-lg">
                {(selected.user.username || 'U')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-white">@{selected.user.username}</p>
                <p className="text-[10px] text-gray-500 font-mono">{selected.user.telegramId}</p>
                {selected.user.isBlocked && <Badge status="blocked" />}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <StatCard label="Balance"       value={`${selected.user.balance.toFixed(2)} Br`} />
              <StatCard label="Locked"        value={`${(selected.user.lockedBalance || 0).toFixed(2)} Br`} color="text-gray-400" />
              <StatCard label="Total Deposit" value={`${selected.user.totalDeposited.toFixed(2)} Br`} color="text-green-400" />
              <StatCard label="Total Withdraw" value={`${selected.user.totalWithdrawn.toFixed(2)} Br`} color="text-orange-400" />
              <StatCard label="Winnings"      value={`${selected.user.totalWinnings.toFixed(2)} Br`} color="text-[#F5A623]" />
              <StatCard label="Games Played"  value={`${selected.user.gamesPlayed || 0} / ${selected.user.gamesWon || 0}W`} color="text-blue-400" />
            </div>

            <div className="flex gap-2">
              <ActionBtn variant="primary" onClick={() => { setBalSheet(selected); setSelected(null); }} className="flex-1">
                💰 Adjust Balance
              </ActionBtn>
              <ActionBtn
                variant={selected.user.isBlocked ? 'success' : 'danger'}
                onClick={() => { setBlockSheet(selected); setSelected(null); }}
                className="flex-1"
              >
                {selected.user.isBlocked ? '✓ Unblock' : '🚫 Block'}
              </ActionBtn>
            </div>
          </>
        )}
      </BottomSheet>

      {/* Balance Adjust Sheet */}
      <BottomSheet open={!!balSheet} onClose={() => setBalSheet(null)} title="Adjust Balance">
        {balSheet && (
          <>
            <p className="text-xs text-gray-500 mb-1">@{balSheet.user.username}</p>
            <p className="text-sm font-bold text-[#F5A623] font-mono mb-3">Current: {balSheet.user.balance.toFixed(2)} ETB</p>
            <Input label="Adjustment (positive = add, negative = deduct)"
              type="number" step="0.01"
              value={balAdj} onChange={e => setBalAdj(e.target.value)}
              placeholder="e.g. 100 or -50" />
            <Input label="Reason / Note"
              type="text"
              value={balNote} onChange={e => setBalNote(e.target.value)}
              placeholder="e.g. Bonus, refund, correction…" />
            <div className="flex gap-2 mt-1">
              <ActionBtn variant="ghost" onClick={() => setBalSheet(null)} className="flex-1">Cancel</ActionBtn>
              <ActionBtn variant="primary" onClick={doAdjustBalance} className="flex-1">Apply →</ActionBtn>
            </div>
          </>
        )}
      </BottomSheet>

      {/* Block Sheet */}
      <BottomSheet open={!!blockSheet} onClose={() => setBlockSheet(null)}
        title={blockSheet?.user?.isBlocked ? 'Unblock Player' : 'Block Player'}>
        {blockSheet && (
          <>
            <p className="text-xs text-gray-500 mb-3">@{blockSheet.user.username} · {blockSheet.user.telegramId}</p>
            {!blockSheet.user.isBlocked && (
              <Input label="Block Reason"
                type="text"
                value={blockReason} onChange={e => setBlockReason(e.target.value)}
                placeholder="e.g. Fraud, abuse, suspicious…" />
            )}
            <div className="flex gap-2 mt-1">
              <ActionBtn variant="ghost" onClick={() => setBlockSheet(null)} className="flex-1">Cancel</ActionBtn>
              <ActionBtn
                variant={blockSheet.user.isBlocked ? 'success' : 'danger'}
                onClick={doBlock}
                className="flex-1"
              >
                {blockSheet.user.isBlocked ? '✓ Unblock' : '🚫 Block'}
              </ActionBtn>
            </div>
          </>
        )}
      </BottomSheet>
    </div>
  );
}

// ─── Transactions Tab ─────────────────────────────────────────────────────────
function TransactionsTab({ showToast }) {
  const [txns, setTxns]   = useState([]);
  const [page, setPage]   = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState('');
  const [type, setType]   = useState('');
  const [loading, setLoading] = useState(true);
  const [approveSheet, setApproveSheet] = useState(null);
  const [rejectSheet, setRejectSheet]   = useState(null);
  const [approveAmt, setApproveAmt]     = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async (pg = 1, s = status, t = type) => {
    setLoading(true);
    try {
      const d = await adminFetch(`/transactions?page=${pg}&status=${s}&type=${t}`);
      setTxns(d.transactions);
      setPage(d.page);
      setPages(d.pages);
    } catch (e) { showToast(e.message, 'error'); }
    setLoading(false);
  }, [status, type, showToast]);

  useEffect(() => { load(1); }, [status, type]);

  const doApprove = async () => {
    const amt = parseFloat(approveAmt);
    if (!amt || amt <= 0) return showToast('Enter a valid amount', 'error');
    try {
      const d = await adminFetch(`/transactions/${approveSheet._id}/approve`, {
        method: 'POST', body: { amount: amt },
      });
      showToast(`Approved! New balance: ${d.newBalance?.toFixed(2)} ETB`);
      setApproveSheet(null); setApproveAmt('');
      load(page, status, type);
    } catch (e) { showToast(e.message, 'error'); }
  };

  const doReject = async () => {
    try {
      await adminFetch(`/transactions/${rejectSheet._id}/reject`, {
        method: 'POST', body: { reason: rejectReason },
      });
      showToast('Rejected.');
      setRejectSheet(null); setRejectReason('');
      load(page, status, type);
    } catch (e) { showToast(e.message, 'error'); }
  };

  const typeIcon  = { deposit: '📥', withdrawal: '📤' };
  const typeColor = { deposit: 'text-green-400', withdrawal: 'text-orange-400' };

  return (
    <div className="flex flex-col gap-3">
      {/* Filters */}
      <div className="flex gap-2">
        <select className="flex-1 bg-[#181C27] border border-[#2A2F45] text-white rounded-xl px-2 py-2 text-xs outline-none"
          value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select className="flex-1 bg-[#181C27] border border-[#2A2F45] text-white rounded-xl px-2 py-2 text-xs outline-none"
          value={type} onChange={e => setType(e.target.value)}>
          <option value="">All Types</option>
          <option value="deposit">Deposits</option>
          <option value="withdrawal">Withdrawals</option>
        </select>
        <button onClick={() => load(1, status, type)}
          className="bg-[#181C27] border border-[#2A2F45] text-gray-400 rounded-xl px-3 py-2 text-xs">↺</button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          <div className="bg-[#181C27] border border-[#2A2F45] rounded-2xl overflow-hidden">
            {txns.length === 0 ? (
              <p className="text-center text-gray-600 text-xs py-8">No transactions.</p>
            ) : txns.map((t, i) => (
              <motion.div key={t._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 px-4 py-3 border-b border-[#2A2F45] last:border-0">
                <span className="text-lg flex-shrink-0">{typeIcon[t.type] || '💳'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold text-white">@{t.username}</p>
                    <Badge status={t.status} />
                  </div>
                  <p className="text-[10px] text-gray-500 font-mono">{timeAgo(t.createdAt)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold font-mono ${typeColor[t.type] || 'text-white'}`}>
                    {t.amount > 0 ? `${t.amount.toFixed(2)} Br` : '—'}
                  </p>
                  {t.status === 'pending' && (
                    <div className="flex gap-1 mt-1">
                      <motion.button whileTap={{ scale: 0.85 }}
                        onClick={() => { setApproveSheet(t); setApproveAmt(''); }}
                        className="px-2 py-1 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 text-[10px] font-bold">✓</motion.button>
                      <motion.button whileTap={{ scale: 0.85 }}
                        onClick={() => { setRejectSheet(t); setRejectReason(''); }}
                        className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold">✕</motion.button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between">
              <ActionBtn variant="ghost" onClick={() => load(page - 1)} className={page <= 1 ? 'opacity-30' : ''}>← Prev</ActionBtn>
              <span className="text-xs text-gray-500">{page} / {pages}</span>
              <ActionBtn variant="ghost" onClick={() => load(page + 1)} className={page >= pages ? 'opacity-30' : ''}>Next →</ActionBtn>
            </div>
          )}
        </>
      )}

      <BottomSheet open={!!approveSheet} onClose={() => setApproveSheet(null)} title="Approve Deposit">
        {approveSheet && (
          <>
            <p className="text-xs text-gray-500 mb-3 font-mono">@{approveSheet.username} · {approveSheet.telegramId}</p>
            <Input label="Amount to Credit (ETB)" type="number" step="0.01" min="1"
              value={approveAmt} onChange={e => setApproveAmt(e.target.value)} placeholder="e.g. 200" />
            <div className="flex gap-2 mt-1">
              <ActionBtn variant="ghost" onClick={() => setApproveSheet(null)} className="flex-1">Cancel</ActionBtn>
              <ActionBtn variant="success" onClick={doApprove} className="flex-1">✓ Approve</ActionBtn>
            </div>
          </>
        )}
      </BottomSheet>

      <BottomSheet open={!!rejectSheet} onClose={() => setRejectSheet(null)} title="Reject Transaction">
        {rejectSheet && (
          <>
            <p className="text-xs text-gray-500 mb-3 font-mono">@{rejectSheet.username}</p>
            <Input label="Reason" type="text"
              value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Blurry screenshot" />
            <div className="flex gap-2 mt-1">
              <ActionBtn variant="ghost" onClick={() => setRejectSheet(null)} className="flex-1">Cancel</ActionBtn>
              <ActionBtn variant="danger" onClick={doReject} className="flex-1">✕ Reject</ActionBtn>
            </div>
          </>
        )}
      </BottomSheet>
    </div>
  );
}

// ─── Sessions Tab ─────────────────────────────────────────────────────────────
function SessionsTab({ showToast }) {
  const [sessions, setSessions] = useState([]);
  const [page, setPage]   = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus]   = useState('');
  const [gameType, setGameType] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (pg = 1, s = status, g = gameType) => {
    setLoading(true);
    try {
      const d = await adminFetch(`/sessions?page=${pg}&status=${s}&gameType=${g}`);
      setSessions(d.sessions);
      setPage(d.page);
      setPages(d.pages);
    } catch (e) { showToast(e.message, 'error'); }
    setLoading(false);
  }, [status, gameType, showToast]);

  useEffect(() => { load(1); }, [status, gameType]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <select className="flex-1 bg-[#181C27] border border-[#2A2F45] text-white rounded-xl px-2 py-2 text-xs outline-none"
          value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="flex-1 bg-[#181C27] border border-[#2A2F45] text-white rounded-xl px-2 py-2 text-xs outline-none"
          value={gameType} onChange={e => setGameType(e.target.value)}>
          <option value="">All Games</option>
          <option value="bingo">Bingo</option>
          <option value="ludo">Ludo</option>
        </select>
        <button onClick={() => load(1, status, gameType)}
          className="bg-[#181C27] border border-[#2A2F45] text-gray-400 rounded-xl px-3 py-2 text-xs">↺</button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <>
          <div className="bg-[#181C27] border border-[#2A2F45] rounded-2xl overflow-hidden">
            {sessions.length === 0 ? (
              <p className="text-center text-gray-600 text-xs py-8">No sessions found.</p>
            ) : sessions.map((s, i) => (
              <motion.div key={s._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="px-4 py-3 border-b border-[#2A2F45] last:border-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{s.gameType === 'bingo' ? '🎱' : '🎲'}</span>
                    <p className="text-xs font-bold text-white capitalize">{s.gameType}</p>
                    <Badge status={s.status} />
                  </div>
                  <p className="text-sm font-bold text-[#F5A623] font-mono">{s.stakeAmount} Br</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono">
                  <span>{s.players?.length || 0} players · Pool: {s.totalPrizePool?.toFixed(2) || '—'} Br</span>
                  <span>{timeAgo(s.createdAt)}</span>
                </div>
                <p className="text-[10px] text-gray-700 mt-0.5 truncate">{s.roomId}</p>
              </motion.div>
            ))}
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-between">
              <ActionBtn variant="ghost" onClick={() => load(page - 1)} className={page <= 1 ? 'opacity-30' : ''}>← Prev</ActionBtn>
              <span className="text-xs text-gray-500">{page} / {pages}</span>
              <ActionBtn variant="ghost" onClick={() => load(page + 1)} className={page >= pages ? 'opacity-30' : ''}>Next →</ActionBtn>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-[#F5A623] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
