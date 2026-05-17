export interface CartItem {
  id: number | string;
  name: string;
  price: number;
  quantity: number;
  note?: string;
  category?: string;
}

export interface MenuItem {
  id: number;
  name: string;
  price: number;
  category: string;
}

export interface Discount {
  type: 'percent' | 'fixed';
  value: number;
  amount: number;
}

export interface Order {
  id: string;
  tableId: number;
  items: CartItem[];
  totalPrice: number;
  discount?: Discount | null;
  status: 'pending' | 'completed' | 'Complete';
  paymentMethod?: PaymentMethod;
  createdAt: string;
  updatedAt?: string;
}

export type PaymentMethod = 'cash' | 'transfer';
export type ActiveTab = 'tables' | 'menu' | 'orders';
export type DiscountType = 'percent' | 'fixed';

export interface ReceiptData {
  tableId: number;
  items: Array<{ name: string; price: number; quantity: number; note?: string }>;
  subtotal: number;
  discountType?: DiscountType;
  discountValue?: number;
  discountAmount?: number;
  total: number;
  paymentMethod: PaymentMethod;
  createdAt: Date;
}
