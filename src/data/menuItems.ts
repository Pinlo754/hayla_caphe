import { MenuItem } from '@/types/pos.types';

export const TOPPINGS = [
  'Kem muối',
  'Sốt caramel',
  'Kem matcha',
  'Hạt nổ yến mạch',
  'Trân châu trắng',
  'Thạch matcha',
  'Thạch đào',
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
] as const;

export const menuItems: MenuItem[] = [
  // ── Coffee ───────────────────────────────────────────────────────────
  { id: 1,   name: 'Cà phê đen',         price: 35000, category: 'Coffee' },
  { id: 3,   name: 'Cà phê sữa',         price: 38000, category: 'Coffee' },
  { id: 5,   name: 'Cà phê sữa tươi',    price: 44000, category: 'Coffee' },
  { id: 7,   name: 'Bạc xỉu',            price: 44000, category: 'Coffee' },
  { id: 9,   name: 'Cà phê muối',        price: 44000, category: 'Coffee' },
  { id: 11,  name: 'Americano',          price: 39000, category: 'Coffee' },
  { id: 15,  name: 'Cappuccino',         price: 44000, category: 'Coffee' },
  { id: 16,  name: 'Latte',             price: 44000, category: 'Coffee' },
  { id: 17,  name: 'Coldbrew',          price: 49000, category: 'Coffee' },
  { id: 40,  name: 'Coldbrew chanh vàng', price: 59000, category: 'Coffee' },
  { id: 39,  name: 'Espresso 1 shot',   price: 35000, category: 'Coffee' },
  { id: 392, name: 'Espresso 2 shot',   price: 39000, category: 'Coffee' },
  { id: 41,  name: 'Espresso bomb',     price: 44000, category: 'Coffee' },

  // ── Tea ──────────────────────────────────────────────────────────────
  { id: 26, name: 'Trà thạch đào',           price: 49000, category: 'Tea' },
  { id: 27, name: 'Trà sen vàng kem lá dứa', price: 49000, category: 'Tea' },
  { id: 28, name: 'Trà Olong ổi hồng',       price: 49000, category: 'Tea' },
  { id: 29, name: 'Trà quýt hồng đài',       price: 49000, category: 'Tea' },
  { id: 33, name: 'Trà bưởi xí muội',        price: 49000, category: 'Tea' },
  { id: 44, name: 'Trà dưa lưới',            price: 49000, category: 'Tea' },

  // ── Milk Tea ─────────────────────────────────────────────────────────
  { id: 45, name: 'Trà sữa olong quế hoa', price: 49000, category: 'Milk Tea' },
  { id: 46, name: 'Trà sữa bá tước',       price: 49000, category: 'Milk Tea' },

  // ── Yogurt ───────────────────────────────────────────────────────────
  { id: 30, name: 'Sữa chua bầu trời',    price: 49000, category: 'Yogurt' },
  { id: 31, name: 'Sữa chua phô mai dâu', price: 49000, category: 'Yogurt' },

  // ── Matcha ───────────────────────────────────────────────────────────
  { id: 32, name: 'Matcha latte',       price: 44000, category: 'Matcha' },
  { id: 34, name: 'Matcha Cold Whisk',  price: 49000, category: 'Matcha' },
  { id: 36, name: 'Matcha coco cloud',  price: 44000, category: 'Matcha' },
  { id: 42, name: 'Houjicha latte',     price: 49000, category: 'Matcha' },
  { id: 43, name: 'Matcha kem muối',    price: 49000, category: 'Matcha' },

  // ── Cacao ────────────────────────────────────────────────────────────
  { id: 37, name: 'Cacao latte',            price: 44000, category: 'Cacao' },
  { id: 38, name: 'Cacao bạc hà kem muối', price: 49000, category: 'Cacao' },

  // ── Fruit Juice ──────────────────────────────────────────────────────
  { id: 47, name: 'Nước ép cam đào', price: 44000, category: 'Fruit Juice' },
  {
    id: 48,
    name: 'Nước ép trái cây theo ngày',
    price: 44000,
    category: 'Fruit Juice',
    combos: [...JUICE_COMBOS],
  },
];
