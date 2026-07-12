export interface CartItem {
  id: string;            // composite key: `${productId}-${size}-${toppings}-${combo}`
  productId?: number;    // base product id
  name: string;
  price: number;         // final price per unit (base + upsize + toppings)
  quantity: number;
  size?: string;
  toppings?: string[];
  combo?: string;
  note?: string;
  category?: string;
}

export interface MenuItem {
  id: number;
  name: string;
  price: number;
  category: string;
  combos?: string[];
  image?: string;
  available?: boolean;
  toppings?: string[];   // if set, only these toppings are available for this item
}

export interface Discount {
  type: 'percent' | 'fixed';
  value: number;
  amount: number;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
  note?: string;
}

export interface Order {
  id: string;
  tableId: number;
  items: CartItem[];
  totalPrice: number;
  discount?: Discount | null;
  status: 'pending' | 'completed' | 'Complete';
  paymentMethod?: PaymentMethod;
  receiptImage?: string;   // URL of transfer receipt photo (required for transfer)
  createdAt: string;
  updatedAt?: string;
  // Online order fields
  orderType?: 'dine-in' | 'online';
  customerInfo?: CustomerInfo;
}

export interface Customer {
  id: string;        // e.g. 'haylacaphe-KH0001'
  name: string;
  phone: string;
  address?: string;
  points: number;
  createdAt: string;
  updatedAt?: string;
}

export type PaymentMethod = 'cash' | 'transfer';
export type ActiveTab = 'tables' | 'menu' | 'orders' | 'dashboard' | 'stats';
export type DiscountType = 'percent' | 'fixed';

export interface ReceiptData {
  tableId: number;
  items: CartItem[];
  subtotal: number;
  discountType?: DiscountType;
  discountValue?: number;
  discountAmount?: number;
  total: number;
  paymentMethod: PaymentMethod;
  createdAt: Date;
}
