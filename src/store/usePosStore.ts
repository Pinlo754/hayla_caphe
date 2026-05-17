import { create } from 'zustand';
import { CartItem } from '@/types/pos.types';

interface PosState {
  selectedTable: number | null;
  cart: CartItem[];
  selectTable: (tableId: number) => void;
  addToCart: (product: Omit<CartItem, 'quantity'>) => void;
  updateQuantity: (id: number | string, delta: number) => void;
  updateNote: (id: number | string, note: string) => void;
  clearCart: () => void;
  setCart: (items: CartItem[]) => void;
}

export const usePosStore = create<PosState>((set) => ({
  selectedTable: null,
  cart: [],

  selectTable: (tableId) => set({ selectedTable: tableId }),

  addToCart: (product) => set((state) => {
    const existing = state.cart.find(item => String(item.id) === String(product.id));
    if (existing) {
      return {
        cart: state.cart.map(item =>
          String(item.id) === String(product.id)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ),
      };
    }
    return { cart: [...state.cart, { ...product, quantity: 1 }] };
  }),

  updateQuantity: (id, delta) => set((state) => ({
    cart: state.cart
      .map(item => String(item.id) === String(id) ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item)
      .filter(item => item.quantity > 0),
  })),

  updateNote: (id, note) => set((state) => ({
    cart: state.cart.map(item =>
      String(item.id) === String(id) ? { ...item, note } : item
    ),
  })),

  clearCart: () => set({ cart: [], selectedTable: null }),
  setCart: (items) => set({ cart: items }),
}));
