'use client';

import { LayoutDashboard, Coffee, ClipboardList, BarChart2, BookCheck } from 'lucide-react';
import { ActiveTab } from '@/types/pos.types';

interface Props {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

export default function BottomNav({ activeTab, onTabChange }: Props) {
  const tabs: { key: ActiveTab; icon: React.ReactNode; label: string }[] = [
    { key: 'tables', icon: <LayoutDashboard size={22} />, label: 'Bàn' },
    { key: 'menu', icon: <Coffee size={22} />, label: 'Menu' },
    { key: 'orders', icon: <ClipboardList size={22} />, label: 'Đơn hàng' },
    { key: 'dashboard', icon: <BarChart2 size={22} />, label: 'Thống kê' },
    { key: 'stats', icon: <BookCheck size={22} />, label: 'Chốt sổ' },
  ];

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t flex justify-around p-3 z-40">
      {tabs.map(({ key, icon, label }) => (
        <button
          key={key}
          onClick={() => onTabChange(key)}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === key ? 'text-orange-500 scale-110' : 'text-gray-300'}`}
        >
          {icon}
          <span className="text-[9px] text-black uppercase">{label}</span>
        </button>
      ))}
    </footer>
  );
}
