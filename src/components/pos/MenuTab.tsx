'use client';

import { useState } from 'react';
import { Coffee, Plus } from 'lucide-react';
import { MenuItem, CartItem } from '@/types/pos.types';
import type { ToppingItem } from '@/app/lib/firebaseToppings';
import { usePosStore } from '@/store/usePosStore';
import ItemConfigModal from './ItemConfigModal';

interface Props {
  products: MenuItem[];
  toppings: ToppingItem[];
}

export default function MenuTab({ products, toppings }: Props) {
  const { selectedTable, addToCart } = usePosStore();
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [configItem, setConfigItem] = useState<MenuItem | null>(null);

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];
  const filtered = categoryFilter === 'all' ? products : products.filter(p => p.category === categoryFilter);

  const handleTap = (p: MenuItem) => {
    if (!selectedTable) {
      alert('Vui lòng chọn bàn trước!');
      return;
    }
    setConfigItem(p);
  };

  const handleAdd = (cartItem: Omit<CartItem, 'quantity'>) => {
    addToCart(cartItem);
    setConfigItem(null);
  };

  return (
    <>
      <div className="mb-4 space-y-3 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <h2 className="text-gray-800 text-lg">Menu</h2>
          <span className="text-xs text-gray-500">{categoryFilter === 'all' ? 'Tất cả' : categoryFilter}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`py-2 px-3 rounded-2xl text-xs font-bold transition ${categoryFilter === cat ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
            >
              {cat === 'all' ? 'Tất cả' : cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-300">
        {filtered.map((p) => (
          <div
            key={p.id}
            onClick={() => handleTap(p)}
            className="bg-white p-3 rounded-2xl shadow-sm border border-gray-50 cursor-pointer active:scale-95 transition-transform relative"
          >
            <div className="h-20 bg-orange-50 rounded-xl mb-2 flex items-center justify-center text-orange-200 overflow-hidden">
              {p.image
                ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                : <Coffee size={28} />}
            </div>

            {/* Combo badge */}
            {p.combos && (
              <div className="absolute top-2 right-2 bg-emerald-100 text-emerald-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                Combo
              </div>
            )}

            <h3 className="font-bold text-xs h-8 line-clamp-2 leading-tight text-gray-800">{p.name}</h3>
            <div className="flex justify-between items-center mt-2">
              <span className="text-orange-600 text-sm">{p.price.toLocaleString()}đ</span>
              <button className="bg-orange-500 text-white p-1.5 rounded-lg shadow-md shadow-orange-100">
                <Plus size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {configItem && (
        <ItemConfigModal
          item={configItem}
          toppings={toppings}
          onClose={() => setConfigItem(null)}
          onAdd={handleAdd}
        />
      )}
    </>
  );
}
