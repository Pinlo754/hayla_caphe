'use client';

import { useState } from 'react';
import { X, Check, Coffee, ChevronUp } from 'lucide-react';
import { MenuItem, CartItem } from '@/types/pos.types';
import type { ToppingItem } from '@/app/lib/firebaseToppings';
import { UPSIZE_PRICE } from '@/data/menuItems';

interface Props {
  item: MenuItem;
  toppings: ToppingItem[];
  onClose: () => void;
  onAdd: (cartItem: Omit<CartItem, 'quantity'>) => void;
}

export default function ItemConfigModal({ item, toppings: allToppings, onClose, onAdd }: Props) {
  const [isUpsized, setIsUpsized] = useState(false);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [selectedCombo, setSelectedCombo] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [comboError, setComboError] = useState(false);

  // Available toppings: item-specific list if set, otherwise all available
  const availableToppings = item.toppings?.length
    ? allToppings.filter((t) => item.toppings!.includes(t.name))
    : allToppings;

  const basePrice = item.price + (isUpsized ? UPSIZE_PRICE : 0);
  const toppingsCost = selectedToppings.reduce((sum, name) => {
    const t = availableToppings.find((x) => x.name === name);
    return sum + (t?.price ?? 5000);
  }, 0);
  const total = basePrice + toppingsCost;

  const toggleTopping = (topping: string) => {
    setSelectedToppings(prev =>
      prev.includes(topping) ? prev.filter(t => t !== topping) : [...prev, topping]
    );
  };

  const handleAdd = () => {
    if (item.combos && !selectedCombo) {
      setComboError(true);
      return;
    }

    const sizeLabel = isUpsized ? 'L' : '';
    const toppingsKey = [...selectedToppings].sort().join('|');
    const comboKey = selectedCombo ?? '';
    const noteKey = note.trim();
    const compositeId = `${item.id}-${sizeLabel}-${toppingsKey}-${comboKey}-${noteKey}`;

    onAdd({
      id: compositeId,
      productId: item.id,
      name: item.name,
      price: total,
      size: isUpsized ? 'L' : undefined,
      toppings: selectedToppings.length > 0 ? selectedToppings : undefined,
      combo: selectedCombo ?? undefined,
      note: noteKey || undefined,
      category: item.category,
    });
  };

  return (
    <div className="fixed inset-0 z-60 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-[40px] max-h-[88vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">

        {/* Handle + close */}
        <div className="flex justify-center pt-4 pb-1">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
        </div>
        <button onClick={onClose} className="absolute top-5 right-5 p-2 bg-gray-100 rounded-full">
          <X size={18} className="text-gray-600" />
        </button>

        {/* Item header */}
        <div className="px-6 pt-2 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center shrink-0">
              <Coffee size={26} className="text-orange-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">{item.name}</h2>
              <p className="text-orange-600 font-bold">{item.price.toLocaleString()}đ</p>
            </div>
          </div>
        </div>

        {/* Scrollable options */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

          {/* Upsize */}
          <section>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Kích cỡ</p>
            <div className="flex gap-2">
              <button
                onClick={() => setIsUpsized(false)}
                className={`flex-1 py-3 rounded-2xl border-2 font-bold transition-all ${!isUpsized ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-100 text-gray-500'}`}
              >
                <span className="text-base">Mặc định</span>
                <span className="block text-[11px] mt-0.5 opacity-70">{item.price.toLocaleString()}đ</span>
              </button>
              <button
                onClick={() => setIsUpsized(true)}
                className={`flex-1 py-3 rounded-2xl border-2 font-bold transition-all ${isUpsized ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-100 text-gray-500'}`}
              >
                <span className="flex items-center justify-center gap-1 text-base">
                  <ChevronUp size={14} />Upsize
                </span>
                <span className="block text-[11px] mt-0.5 opacity-70">
                  {(item.price + UPSIZE_PRICE).toLocaleString()}đ
                  <span className="text-green-500 ml-1">(+{UPSIZE_PRICE.toLocaleString()}đ)</span>
                </span>
              </button>
            </div>
          </section>

          {/* Toppings */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Topping</p>
              <span className="text-[10px] text-gray-400">Tuỳ chọn</span>
            </div>
            <div className="space-y-1.5">
              {availableToppings.map((topping) => {
                const isSelected = selectedToppings.includes(topping.name);
                return (
                  <button
                    key={topping.id}
                    onClick={() => toggleTopping(topping.name)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${isSelected ? 'border-orange-300 bg-orange-50' : 'border-gray-100 bg-white'}`}
                  >
                    <span className={`text-sm font-medium ${isSelected ? 'text-orange-700' : 'text-gray-700'}`}>
                      {topping.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${isSelected ? 'text-orange-500' : 'text-gray-400'}`}>
                        +{topping.price.toLocaleString()}đ
                      </span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-gray-300'}`}>
                        {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Combo (required for daily juice) */}
          {item.combos && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Combo</p>
                <span className={`text-[10px] font-bold ${comboError ? 'text-red-500 animate-pulse' : 'text-orange-400'}`}>
                  {comboError ? '⚠ Bắt buộc chọn 1' : 'Bắt buộc · Chọn 1'}
                </span>
              </div>
              <div className="space-y-1.5">
                {item.combos.map((combo) => {
                  const isSelected = selectedCombo === combo;
                  return (
                    <button
                      key={combo}
                      onClick={() => { setSelectedCombo(combo); setComboError(false); }}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                        isSelected ? 'border-emerald-400 bg-emerald-50' : comboError ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-white'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'}`}>
                        {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <span className={`text-sm font-medium ${isSelected ? 'text-emerald-700' : 'text-gray-700'}`}>
                        🍹 {combo}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Note */}
          <section>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Ghi chú</p>
            <input
              type="text"
              placeholder="Ít đường, không đá, thêm đá..."
              className="w-full text-sm text-gray-700 p-3 rounded-2xl border border-gray-200 bg-gray-50 outline-none focus:border-orange-300 focus:bg-orange-50 transition"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t bg-white">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-xs text-gray-400 uppercase font-bold">Tổng cộng</p>
              {(isUpsized || selectedToppings.length > 0) && (
                <p className="text-[11px] text-gray-400">
                  {item.price.toLocaleString()}đ
                  {isUpsized && ` + upsize`}
                  {selectedToppings.length > 0 && ` + ${selectedToppings.length} topping`}
                </p>
              )}
            </div>
            <span className="text-2xl font-bold text-orange-600">{total.toLocaleString()}đ</span>
          </div>
          <button
            onClick={handleAdd}
            className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold text-base shadow-lg shadow-orange-200 active:scale-95 transition-transform"
          >
            Thêm vào giỏ hàng
          </button>
          <div className="h-2" />
        </div>
      </div>
    </div>
  );
}
