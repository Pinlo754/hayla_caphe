import type { CartItem } from '@/types/pos.types';
import { lineTotal, paidLineTotal } from '@/lib/discount';

interface Props {
  item: CartItem;
  className?: string;
}

/** Line total of an order item — shows the original price struck through when discounted. */
export default function LinePrice({ item, className = 'text-gray-600' }: Props) {
  const full = lineTotal(item);
  const paid = paidLineTotal(item);

  if (paid >= full) {
    return <span className={`shrink-0 ${className}`}>{full.toLocaleString()}đ</span>;
  }

  return (
    <span className="shrink-0 text-right leading-tight">
      <span className="block text-[10px] text-gray-400 line-through">{full.toLocaleString()}đ</span>
      <span className="font-bold text-red-500">{paid.toLocaleString()}đ</span>
    </span>
  );
}
