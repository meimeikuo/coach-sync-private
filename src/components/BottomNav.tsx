import { motion } from 'motion/react';
import { TabType } from '../types';

interface BottomNavProps {
  activeTab: TabType;
  onChange: (tab: TabType) => void;
}

export default function BottomNav({ activeTab, onChange }: BottomNavProps) {
  const tabs = [
    { id: 'dashboard', icon: '🏠', label: '首頁' },
    { id: 'students', icon: '👥', label: '學員' },
    { id: 'records', icon: '📄', label: '紀錄' },
  ] as const;

  return (
    <div className="absolute bottom-0 w-full bg-white/80 backdrop-blur-xl border-t border-slate-200 pb-safe">
      <div className="flex justify-around items-center h-16 px-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id as TabType)}
              className="relative flex flex-col items-center justify-center w-16 h-full"
            >
              <div className={`flex flex-col items-center justify-center space-y-1 ${isActive ? 'text-cyan-600' : 'text-slate-400'}`}>
                <span className={`text-2xl ${isActive ? 'drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'grayscale opacity-60'}`}>{tab.icon}</span>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </div>
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute top-0 w-8 h-1 bg-cyan-500 rounded-b-full shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
