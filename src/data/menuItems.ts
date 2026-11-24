import { MenuItem } from '@/types/pos.types';

export const TOPPINGS = [
  'Trân châu trắng',
  'Kem lá dứa',
  'Kem muối',
  'Kem trứng',
  'Hạt nổ yến mạch',
  'Thạch caramel',
  'Thạch matcha',
  'Kem matcha',
  'Thạch caramel',
] as const;

export const TOPPING_PRICE = 5000;
export const UPSIZE_PRICE = 5000;

export type ToppingName = typeof TOPPINGS[number];

export const JUICE_COMBOS = [
  'Dưa hấu, cà chua, bạc hà',
  'Cà chua, cà rốt, táo',
  'Cà rốt, dền, táo, chanh, gừng',
  'Dưa leo, táo, chanh, nước dừa',
  'Cam, dứa, lê, gừng',
  'Dưa leo, dứa, cam',
  'Cà rốt, táo, dứa, hạt chia',
  'Khác',
] as const;

export const menuItems: MenuItem[] = [
  // ── Coffee · Robusta 80% Arabica 20% ─────────────────────────────────
  { id: 1,   name: 'Cà phê đen',          price: 32000, category: 'Coffee' },
  { id: 3,   name: 'Cà phê sữa',          price: 35000, category: 'Coffee' },
  { id: 7,   name: 'Bạc xỉu',             price: 38000, category: 'Coffee' },
  { id: 9,   name: 'Cà phê muối',         price: 38000, category: 'Coffee' },
  { id: 49,  name: 'Cà phê bồng bềnh',    price: 49000, category: 'Coffee' },
  { id: 50,  name: 'Cà phê bơ đậu phộng', price: 49000, category: 'Coffee' },

  // ── Coffee · Robusta 0% Arabica 100% ─────────────────────────────────
  { id: 39,  name: 'Espresso',             price: 35000, category: 'Coffee' },
  { id: 11,  name: 'Americano',            price: 35000, category: 'Coffee' },
  { id: 15,  name: 'Cappuccino',           price: 45000, category: 'Coffee' },
  { id: 16,  name: 'Latte',                price: 45000, category: 'Coffee' },
  { id: 17,  name: 'Cold brew',            price: 45000, category: 'Coffee' },
  { id: 40,  name: 'Cold brew chanh vàng', price: 49000, category: 'Coffee' },
  { id: 41,  name: 'Espresso bomb',        price: 45000, category: 'Coffee' },

  // ── Matcha ───────────────────────────────────────────────────────────
  { id: 32, name: 'Matcha latte',      price: 45000, category: 'Matcha' },
  { id: 42, name: 'Houjicha latte',    price: 45000, category: 'Matcha' },
  { id: 34, name: 'Matcha Coldwhisk',  price: 49000, category: 'Matcha' },
  { id: 51, name: 'Matcha dừa đá xay', price: 49000, category: 'Matcha' },
  { id: 43, name: 'Matcha kem muối',   price: 49000, category: 'Matcha' },
  { id: 36, name: 'Matcha bồng bềnh',  price: 49000, category: 'Matcha' },

  // ── Tea ──────────────────────────────────────────────────────────────
  { id: 27, name: 'Trà sen vàng kem lá dứa', price: 49000, category: 'Tea' },
  { id: 28, name: 'Trà Olong xoài ổi hồng',  price: 49000, category: 'Tea' },
  { id: 33, name: 'Trà bưởi xí muội',        price: 49000, category: 'Tea' },
  { id: 52, name: 'Trà Atiso hạt chia',      price: 49000, category: 'Tea' },
  { id: 53, name: 'Trà trái cây',            price: 45000, category: 'Tea' },

  // ── Milk Tea ─────────────────────────────────────────────────────────
  { id: 45, name: 'Trà sữa Olong quế hoa',             price: 49000, category: 'Milk Tea' },
  { id: 54, name: 'Trà sữa Phổ Nhĩ Vân Nam Caramel',   price: 49000, category: 'Milk Tea' },
  { id: 55, name: 'Trà sữa gạo rang',                  price: 45000, category: 'Milk Tea' },
  { id: 56, name: 'Trà sữa Thái xanh',                 price: 45000, category: 'Milk Tea' },
  { id: 57, name: 'Trà sữa Thái đỏ',                   price: 45000, category: 'Milk Tea' },
  { id: 58, name: 'Khoai môn latte',                   price: 45000, category: 'Milk Tea' },

  // ── Cacao ────────────────────────────────────────────────────────────
  { id: 37, name: 'Cacao latte',           price: 45000, category: 'Cacao' },
  { id: 38, name: 'Cacao bạc hà kem muối', price: 49000, category: 'Cacao' },

  // ── Yogurt ───────────────────────────────────────────────────────────
  { id: 59, name: 'Sữa chua dâu kem lá dứa', price: 49000, category: 'Yogurt' },
  { id: 60, name: 'Sữa chua việt quất',      price: 45000, category: 'Yogurt' },

  // ── Fruit Juice ──────────────────────────────────────────────────────
  { id: 47, name: 'Nước ép cam đào', price: 45000, category: 'Fruit Juice' },
  {
    id: 48,
    name: 'Nước ép trái cây (mix 2 - 3 loại)',
    price: 45000,
    category: 'Fruit Juice',
    combos: [...JUICE_COMBOS],
  },
];
