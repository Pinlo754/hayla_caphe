import { create } from 'zustand';
import { CartItem } from '@/types/pos.types';

interface PosState {
  selectedTable: number | null;
  cart: CartItem[];
  selectTable: (tableId: number) => void;
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  updateQuantity: (id: string, delta: number) => void;
  updateNote: (id: string, note: string) => void;
  clearCart: () => void;
  setCart: (items: CartItem[]) => void;
}

export const usePosStore = create<PosState>((set) => ({
  selectedTable: null,
  cart: [],

  selectTable: (tableId) => set({ selectedTable: tableId }),

  addToCart: (item) => set((state) => {
    const existing = state.cart.find(c => c.id === item.id);
    if (existing) {
      return {
        cart: state.cart.map(c =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        ),
      };
    }
    return { cart: [...state.cart, { ...item, quantity: 1 }] };
  }),

  updateQuantity: (id, delta) => set((state) => ({
    cart: state.cart
      .map(item => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item)
      .filter(item => item.quantity > 0),
  })),

  updateNote: (id, note) => set((state) => ({
    cart: state.cart.map(item => item.id === id ? { ...item, note } : item),
  })),

  clearCart: () => set({ cart: [], selectedTable: null }),
  setCart: (items) => set({ cart: items }),
}));
