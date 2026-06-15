import { motion } from 'framer-motion';

const baseTabs = [
  { id: 'home',   label: 'Home',   icon: ['M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9'] },
  { id: 'bingo',  label: 'Bingo',  icon: ['M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z'] },
  { id: 'ludo',   label: 'Ludo',   icon: ['M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5'] },
  { id: 'wallet', label: 'Wallet', icon: ['M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'] },
];

const adminTab = {
  id: 'admin', label: 'Admin', icon: [
    'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  ],
};

export default function BottomNav({ active, onChange, isAdmin }) {
  const tabs = isAdmin ? [...baseTabs, adminTab] : baseTabs;

  return (
    <nav className="flex items-center bg-[#181C27] border-t border-[#2A2F45] flex-shrink-0 safe-area-pb">
      {tabs.map(tab => {
        const isActive = active === tab.id;
        const isAdminTab = tab.id === 'admin';
        return (
          <motion.button key={tab.id} whileTap={{ scale: 0.85 }}
            onClick={() => onChange(tab.id)}
            className="flex-1 flex flex-col items-center gap-1 py-3 relative overflow-hidden">
            {isActive && (
              <motion.div layoutId="nav-pill"
                className={`absolute inset-x-2 top-0 h-0.5 rounded-b-full ${
                  isAdminTab
                    ? 'bg-purple-400 shadow-[0_2px_8px_rgba(167,139,250,0.6)]'
                    : 'bg-[#F5A623] shadow-[0_2px_8px_rgba(245,166,35,0.6)]'
                }`}
              />
            )}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={isActive ? 2.2 : 1.6}
              strokeLinecap="round" strokeLinejoin="round"
              className={`w-5 h-5 transition-colors duration-200 ${
                isActive
                  ? isAdminTab ? 'text-purple-400' : 'text-[#F5A623]'
                  : 'text-gray-500'
              }`}>
              {tab.icon.map((d, i) => <path key={i} d={d} />)}
            </svg>
            <span
              className={`text-[10px] font-semibold transition-colors ${
                isActive
                  ? isAdminTab ? 'text-purple-400' : 'text-[#F5A623]'
                  : 'text-gray-600'
              }`}
              style={{ fontFamily: 'Syne,sans-serif' }}>
              {tab.label}
            </span>
          </motion.button>
        );
      })}
    </nav>
  );
}
