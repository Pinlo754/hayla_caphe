'use client';

import { Bluetooth, BluetoothOff, User } from 'lucide-react';
import { ActiveTab } from '@/types/pos.types';
import { usePosStore } from '@/store/usePosStore';

interface Props {
  activeTab: ActiveTab;
  printerConnected: boolean;
  printerName: string;
  onConnectPrinter: () => void;
  onDisconnectPrinter: () => void;
  staffName?: string;
}

export default function PosHeader({ activeTab, printerConnected, printerName, onConnectPrinter, onDisconnectPrinter, staffName }: Props) {
  const { selectedTable } = usePosStore();

  return (
    <header className="bg-white px-4 py-3 border-b flex justify-between items-center sticky top-0 z-20 shadow-sm">
      <div>
        <h1 className="font-bold text-orange-600 text-xl tracking-tighter italic">Hay là cà phê</h1>
        {staffName && (
          <p className="flex items-center gap-1 text-[10px] text-gray-400 font-medium mt-0.5">
            <User size={10} />
            {staffName}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {selectedTable && activeTab !== 'orders' && activeTab !== 'checklist' && (
          <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold">
            Bàn {selectedTable}
          </span>
        )}

        {printerConnected ? (
          <button
            onClick={onDisconnectPrinter}
            className="flex items-center gap-1.5 bg-green-50 text-green-600 border border-green-200 px-3 py-1.5 rounded-full text-xs font-bold"
          >
            <Bluetooth size={12} />
            <span className="max-w-[80px] truncate">{printerName}</span>
          </button>
        ) : (
          <button
            onClick={onConnectPrinter}
            className="flex items-center gap-1.5 bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full text-xs font-bold"
          >
            <BluetoothOff size={12} />
            Kết nối in
          </button>
        )}
      </div>
    </header>
  );
}
