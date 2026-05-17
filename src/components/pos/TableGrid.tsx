'use client';

import { Order } from '@/types/pos.types';

interface Props {
  orders: Order[];
  onSelectTable: (tableId: number) => void;
  onViewOrder: (order: Order) => void;
  onAddMore: (order: Order) => void;
}

export default function TableGrid({ orders, onSelectTable, onViewOrder, onAddMore }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-300">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => {
        const activeOrder = orders.find(o => Number(o.tableId) === t && o.status === 'pending');
        const isOccupied = !!activeOrder;

        return (
          <div
            key={t}
            className={`p-4 rounded-2xl border-2 transition-all ${isOccupied ? 'border-red-500 bg-red-50' : 'bg-white border-transparent shadow-sm'}`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="text-xl text-gray-800">Bàn {t}</div>
              {isOccupied && (
                <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                  Chưa TT
                </span>
              )}
            </div>

            <div className="flex gap-2">
              {isOccupied ? (
                <>
                  <button
                    onClick={() => onViewOrder(activeOrder!)}
                    className="flex-1 py-2 text-xs font-bold bg-white border border-red-200 text-red-600 rounded-lg"
                  >
                    Xem
                  </button>
                  <button
                    onClick={() => onAddMore(activeOrder!)}
                    className="flex-1 py-2 text-xs font-bold bg-red-500 text-white rounded-lg"
                  >
                    + Món
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onSelectTable(t)}
                  className="w-full py-2 text-xs font-bold bg-orange-500 text-white rounded-lg"
                >
                  Đặt món
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
