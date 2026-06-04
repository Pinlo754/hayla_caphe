'use client';

import { Bluetooth, BluetoothOff } from 'lucide-react';
import { ActiveTab } from '@/types/pos.types';
import { usePosStore } from '@/store/usePosStore';

interface Props {
  activeTab: ActiveTab;
  printerConnected: boolean;
  printerName: string;
  onConnectPrinter: () => void;
  onDisconnectPrinter: () => void;
}

export default function PosHeader({ activeTab, printerConnected, printerName, onConnectPrinter, onDisconnectPrinter }: Props) {
  const { selectedTable } = usePosStore();

  return (
    <header className="bg-white px-4 py-3 border-b flex justify-between items-center sticky top-0 z-20 shadow-sm">
      <h1 className="font-bold text-orange-600 text-xl tracking-tighter italic">Hay là cà phê</h1>

      <div className="flex items-center gap-2">
        {selectedTable && activeTab !== 'orders' && activeTab !== 'dashboard' && (
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
