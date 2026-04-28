import { create } from 'zustand';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface PosState {
  selectedTable: number | null;
  cart: CartItem[];
  selectTable: (tableId: number) => void;
  addToCart: (product: any) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  setCart: (items: CartItem[]) => void;
}

export const usePosStore = create<PosState>((set) => ({
  selectedTable: null,
  cart: [],
  selectTable: (tableId) => set({ selectedTable: tableId }),
  addToCart: (product) => set((state) => {
    const existing = state.cart.find(item => item.id === product.id);
    if (existing) {
      return {
        cart: state.cart.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      };
    }
    return { cart: [...state.cart, { ...product, quantity: 1 }] };
  }),
  updateQuantity: (id, delta) => set((state) => ({
    cart: state.cart.map(item => 
      item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
    ).filter(item => item.quantity > 0)
  })),
  clearCart: () => set({ cart: [], selectedTable: null }),
  setCart: (items) => set({ cart: items }),
}));

