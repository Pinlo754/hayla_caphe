import type { CartItem, DiscountType } from '@/types/pos.types';

/** Menu category that is never discounted (non-drink items). */
export const NON_DISCOUNT_CATEGORY = 'Other';

export const isDiscountable = (item: CartItem) => item.category !== NON_DISCOUNT_CATEGORY;

export const lineTotal = (item: CartItem) => item.price * item.quantity;

/** Line total the customer actually pays (falls back to full price for old orders). */
export const paidLineTotal = (item: CartItem) => item.discountedTotal ?? lineTotal(item);

export interface DiscountResult {
  items: CartItem[];          // items with `discountedTotal` filled in
  subtotal: number;           // all items, before discount
  discountableSubtotal: number; // drinks only, before discount
  amount: number;             // total discount (applied to drinks only)
  total: number;
}

/**
 * Apply an order-level discount to drink items only — "Other" items keep their price.
 * The discount amount is split across drink lines proportionally to their line total,
 * so every line shows its exact price after discount.
 */
export function applyDiscount(cart: CartItem[], type: DiscountType, value: number): DiscountResult {
  const subtotal = cart.reduce((s, i) => s + lineTotal(i), 0);
  const discountableSubtotal = cart.filter(isDiscountable).reduce((s, i) => s + lineTotal(i), 0);

  const raw = type === 'percent' ? discountableSubtotal * (value / 100) : Number(value);
  const amount = Math.round(Math.min(Math.max(0, raw || 0), discountableSubtotal));

  const lastIdx = cart.reduce((last, item, idx) => (isDiscountable(item) ? idx : last), -1);
  let remaining = amount;

  const items = cart.map((item, idx) => {
    const total = lineTotal(item);
    if (!isDiscountable(item) || amount === 0) return { ...item, discountedTotal: total };
    const lineDiscount = idx === lastIdx
      ? remaining
      : Math.round((amount * total) / discountableSubtotal);
    remaining -= lineDiscount;
    return { ...item, discountedTotal: total - lineDiscount };
  });

  return { items, subtotal, discountableSubtotal, amount, total: subtotal - amount };
}
