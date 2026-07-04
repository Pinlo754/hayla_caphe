'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ShoppingCart, Plus, Minus, Trash2, Coffee, X,
  ChevronLeft, User, Phone, MapPin, MessageSquare,
  CheckCircle2, Upload, CreditCard, Banknote, Copy,
  Check,
} from 'lucide-react';
import { getMenuItems } from '@/app/lib/firebaseMenu';
import { getToppings } from '@/app/lib/firebaseToppings';
import { getActiveJuiceCombos } from '@/app/lib/firebaseJuiceCombos';
import { createOrder } from '@/app/lib/firebaseOrders';
import { uploadReceiptImage } from '@/app/lib/firebaseStorage';
import type { MenuItem, CartItem } from '@/types/pos.types';
import type { ToppingItem } from '@/app/lib/firebaseToppings';
import ItemConfigModal from '@/components/pos/ItemConfigModal';

// ── Bank constants (MB Bank) ────────────────────────────────────────
const BANK = {
  shortName: 'MB',
  displayName: 'MB Bank',
  account: '4440122752004',
  owner: 'Hay là cà phê',
};

function buildQrUrl(amount: number, info: string) {
  return `https://img.vietqr.io/image/${BANK.shortName}-${BANK.account}-compact2.jpg?amount=${amount}&addInfo=${encodeURIComponent(info)}`;
}

type Step = 'menu' | 'checkout' | 'success';

type FormState = { name: string; phone: string; address: string; note: string };
const EMPTY_FORM: FormState = { name: '', phone: '', address: '', note: '' };

// ── Helper: copy to clipboard with graceful fallback ────────────────
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  }
}

export default function OnlineOrderPage() {
  // ── Data ────────────────────────────────────────────────────────
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [toppings, setToppings] = useState<ToppingItem[]>([]);
  const [juiceCombos, setJuiceCombos] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMenuItems(), getToppings(), getActiveJuiceCombos()])
      .then(([m, t, c]) => {
        setMenu(m.filter((i) => i.available !== false));
        setToppings(t);
        setJuiceCombos(c);
      })
      .finally(() => setDataLoading(false));
  }, []);

  // ── Cart ────────────────────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>([]);
  const [configItem, setConfigItem] = useState<MenuItem | null>(null);
  const [showCart, setShowCart] = useState(false);

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const addToCart = (item: Omit<CartItem, 'quantity'>) => {
    setCart((prev) => {
      const exist = prev.find((c) => c.id === item.id);
      if (exist) return prev.map((c) => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => c.id === id ? { ...c, quantity: c.quantity + delta } : c)
          .filter((c) => c.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((c) => c.id !== id));

  // ── Menu filter ─────────────────────────────────────────────────
  const [catFilter, setCatFilter] = useState('all');
  const categories = useMemo(
    () => ['all', ...Array.from(new Set(menu.map((i) => i.category)))],
    [menu]
  );
  const filteredMenu = catFilter === 'all' ? menu : menu.filter((i) => i.category === catFilter);

  // ── Checkout flow ───────────────────────────────────────────────
  const [step, setStep] = useState<Step>('menu');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [payMethod, setPayMethod] = useState<'cash' | 'transfer'>('cash');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const handleCopy = async (text: string, key: string) => {
    await copyText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
    setFormErrors((prev) => ({ ...prev, receipt: '' }));
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Vui lòng nhập họ tên';
    if (!/^[0-9]{9,11}$/.test(form.phone.trim())) errs.phone = 'Số điện thoại không hợp lệ (9–11 số)';
    if (!form.address.trim()) errs.address = 'Vui lòng nhập địa chỉ giao hàng';
    if (payMethod === 'transfer' && !receiptFile) errs.receipt = 'Vui lòng tải ảnh minh chứng chuyển khoản';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || cart.length === 0) return;
    setSubmitting(true);
    try {
      let receiptImage: string | undefined;
      if (payMethod === 'transfer' && receiptFile) {
        receiptImage = await uploadReceiptImage(receiptFile);
      }
      const customerInfo = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        note: form.note.trim() || undefined,
      };
      const id = await createOrder({
        tableId: 0, // 0 = online order (not a dine-in table)
        items: cart,
        totalPrice: cartTotal,
        status: 'pending',
        paymentMethod: payMethod,
        receiptImage,
        customerInfo,
        orderType: 'online',
        createdAt: new Date().toISOString(),
      });

      // Fire-and-forget Zalo notification — never blocks or fails the order
      fetch('/api/notify-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: id,
          customerName: customerInfo.name,
          customerPhone: customerInfo.phone,
          customerAddress: customerInfo.address,
          customerNote: customerInfo.note,
          items: cart,
          total: cartTotal,
          paymentMethod: payMethod,
        }),
      }).catch(() => {});

      setOrderId(id);
      setCart([]);
      setStep('success');
    } catch (e) {
      alert('Lỗi đặt hàng: ' + (e instanceof Error ? e.message : 'Vui lòng thử lại'));
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndBack = () => {
    setStep('menu');
    setForm(EMPTY_FORM);
    setPayMethod('cash');
    setReceiptFile(null);
    setReceiptPreview(null);
    setFormErrors({});
    setOrderId('');
  };

  // ── Loading ─────────────────────────────────────────────────────
  if (dataLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-orange-50">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-orange-600 font-semibold">Đang tải menu...</p>
      </div>
    );
  }

  // ── Success ─────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-orange-50 to-white p-6 text-center">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-100">
          <CheckCircle2 size={48} className="text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Đặt hàng thành công!</h1>
        <p className="text-gray-500 text-sm mb-1">
          Mã đơn:{' '}
          <span className="font-mono font-bold text-orange-600 text-base">
            #{orderId.slice(-8).toUpperCase()}
          </span>
        </p>
        <p className="text-sm text-gray-400 mb-2">
          Chúng mình sẽ liên hệ qua số <strong>{form.phone || '...'}</strong> sớm nhất.
        </p>
        <p className="text-xs text-gray-400 mb-10">
          Đơn sẽ được giao đến: {form.address || '...'}
        </p>
        <button
          onClick={resetAndBack}
          className="bg-orange-500 text-white px-10 py-3.5 rounded-2xl font-bold text-sm hover:bg-orange-600 transition shadow-lg shadow-orange-200"
        >
          Đặt thêm món
        </button>
      </div>
    );
  }

  // ── Transfer info (pre-compute) ─────────────────────────────────
  const transferNote = `${form.name.trim() || 'Dat hang'} - Hay la ca phe`;
  const qrUrl = buildQrUrl(cartTotal, transferNote);

  // ── Main render ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ─── MENU PAGE ─────────────────────────────────────────── */}
      <div className={step === 'checkout' ? 'hidden' : ''}>

        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
            <div>
              <h1 className="font-bold text-orange-600 text-lg italic leading-tight">Hay là cà phê</h1>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Đặt hàng online</p>
            </div>
            {cartCount > 0 && (
              <button
                onClick={() => setShowCart(true)}
                className="relative flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm shadow-orange-200 hover:bg-orange-600 transition"
              >
                <ShoppingCart size={16} />
                <span className="absolute -top-1.5 -right-1.5 bg-gray-900 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              </button>
            )}
          </div>
        </header>

        {/* Category filter */}
        <div className="sticky top-[61px] z-20 bg-white border-b border-gray-100">
          <div className="max-w-2xl mx-auto px-4 py-2.5 flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                className={`shrink-0 text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                  catFilter === cat
                    ? 'bg-orange-500 text-white shadow-sm shadow-orange-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {cat === 'all' ? 'Tất cả' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Menu grid */}
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-36">
          {filteredMenu.length === 0 ? (
            <p className="text-center text-gray-400 py-20 text-sm">Không có món nào trong danh mục này</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredMenu.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setConfigItem(item)}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer active:scale-95 transition-transform select-none"
                >
                  {/* Image */}
                  <div className="h-32 bg-orange-50 flex items-center justify-center overflow-hidden relative">
                    {item.image
                      ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      : <Coffee size={36} className="text-orange-200" />
                    }
                    {item.combos && (
                      <span className="absolute top-2 right-2 bg-emerald-100 text-emerald-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        Combo
                      </span>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-3">
                    <p className="font-bold text-[13px] text-gray-800 line-clamp-2 leading-snug min-h-[2.6rem]">
                      {item.name}
                    </p>
                    <div className="flex items-center justify-between mt-2.5">
                      <span className="text-orange-600 font-bold text-sm">{item.price.toLocaleString()}đ</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfigItem(item); }}
                        className="w-8 h-8 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-sm shadow-orange-200 active:scale-90 transition"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sticky cart bar */}
        {cartCount > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-gray-100/95 via-gray-50/80 to-transparent pt-8">
            <div className="max-w-2xl mx-auto">
              <button
                onClick={() => setShowCart(true)}
                className="w-full flex items-center justify-between bg-gray-900 text-white px-5 py-4 rounded-2xl shadow-2xl hover:bg-gray-800 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500 p-2 rounded-xl">
                    <ShoppingCart size={18} />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{cartCount} món đã chọn</p>
                    <p className="font-bold">{cartTotal.toLocaleString()}đ</p>
                  </div>
                </div>
                <span className="text-orange-400 text-sm font-bold">Xem giỏ →</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── ITEM CONFIG MODAL ────────────────────────────────────── */}
      {configItem && (
        <ItemConfigModal
          item={configItem}
          toppings={toppings}
          juiceCombos={juiceCombos}
          onClose={() => setConfigItem(null)}
          onAdd={(cartItem) => {
            addToCart(cartItem);
            setConfigItem(null);
          }}
        />
      )}

      {/* ─── CART DRAWER ─────────────────────────────────────────── */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCart(false)} />
          <div className="relative bg-white rounded-t-3xl max-h-[82vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h2 className="font-bold text-gray-800 text-base">Giỏ hàng</h2>
              <button onClick={() => setShowCart(false)} className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition">
                <X size={16} className="text-gray-500" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
              {cart.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-10">Giỏ hàng trống</p>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {item.size && <span className="text-[10px] bg-orange-50 text-orange-500 px-1.5 py-0.5 rounded-full font-bold">Size {item.size}</span>}
                        {item.combo && <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full">🍹 {item.combo}</span>}
                        {item.toppings?.map((t) => (
                          <span key={t} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                      <p className="text-sm font-bold text-orange-600 mt-1">{(item.price * item.quantity).toLocaleString()}đ</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"
                      >
                        <Minus size={12} className="text-gray-600" />
                      </button>
                      <span className="text-sm font-bold w-5 text-center text-gray-800">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center hover:bg-orange-600 transition"
                      >
                        <Plus size={12} className="text-white" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center ml-1 hover:bg-red-100 transition"
                      >
                        <Trash2 size={12} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-gray-500">Tổng cộng</span>
                <span className="text-xl font-bold text-orange-600">{cartTotal.toLocaleString()}đ</span>
              </div>
              <button
                onClick={() => { setShowCart(false); setStep('checkout'); }}
                disabled={cart.length === 0}
                className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-orange-200 hover:bg-orange-600 transition disabled:opacity-50"
              >
                Đặt hàng ngay →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CHECKOUT PAGE ───────────────────────────────────────── */}
      {step === 'checkout' && (
        <div className="fixed inset-0 z-50 bg-gray-50 overflow-y-auto">
          <div className="max-w-2xl mx-auto min-h-screen">

            {/* Checkout header */}
            <div className="bg-white sticky top-0 z-10 px-4 py-3.5 flex items-center gap-3 border-b border-gray-100 shadow-sm">
              <button
                onClick={() => { setStep('menu'); setShowCart(true); }}
                className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
              >
                <ChevronLeft size={18} className="text-gray-600" />
              </button>
              <div>
                <h2 className="font-bold text-gray-800">Thông tin đặt hàng</h2>
                <p className="text-[10px] text-gray-400">{cartCount} món · {cartTotal.toLocaleString()}đ</p>
              </div>
            </div>

            <div className="px-4 py-4 space-y-4 pb-10">

              {/* Order summary */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-orange-50 border-b border-orange-100">
                  <h3 className="font-bold text-orange-700 text-sm">Đơn hàng của bạn</h3>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div className="flex-1 mr-3 min-w-0">
                        <span className="text-gray-700">{item.quantity}×</span>
                        <span className="font-medium text-gray-800 ml-1">{item.name}</span>
                        {item.size && <span className="text-orange-400 text-[11px] ml-1">[{item.size}]</span>}
                        {item.combo && <p className="text-[11px] text-emerald-500 ml-0">🍹 {item.combo}</p>}
                      </div>
                      <span className="shrink-0 font-semibold text-gray-700">{(item.price * item.quantity).toLocaleString()}đ</span>
                    </div>
                  ))}
                  <div className="border-t border-dashed border-gray-200 pt-2 mt-2 flex justify-between">
                    <span className="font-bold text-gray-700">Tổng cộng</span>
                    <span className="font-bold text-orange-600 text-base">{cartTotal.toLocaleString()}đ</span>
                  </div>
                </div>
              </div>

              {/* Customer info form */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                <h3 className="font-bold text-gray-700 text-sm">Thông tin người nhận</h3>

                {/* Name */}
                <div>
                  <div className={`flex items-center gap-3 border rounded-xl px-3.5 py-3 transition ${formErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-200 focus-within:border-orange-400'}`}>
                    <User size={15} className={formErrors.name ? 'text-red-400' : 'text-gray-300 shrink-0'} />
                    <input
                      value={form.name}
                      onChange={(e) => { setForm({ ...form, name: e.target.value }); setFormErrors((p) => ({ ...p, name: '' })); }}
                      placeholder="Họ và tên *"
                      className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder-gray-300"
                    />
                  </div>
                  {formErrors.name && <p className="text-red-500 text-xs mt-1 ml-1">{formErrors.name}</p>}
                </div>

                {/* Phone */}
                <div>
                  <div className={`flex items-center gap-3 border rounded-xl px-3.5 py-3 transition ${formErrors.phone ? 'border-red-300 bg-red-50' : 'border-gray-200 focus-within:border-orange-400'}`}>
                    <Phone size={15} className={formErrors.phone ? 'text-red-400' : 'text-gray-300 shrink-0'} />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => { setForm({ ...form, phone: e.target.value.replace(/\D/g, '') }); setFormErrors((p) => ({ ...p, phone: '' })); }}
                      placeholder="Số điện thoại *"
                      className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder-gray-300"
                      maxLength={11}
                      inputMode="numeric"
                    />
                  </div>
                  {formErrors.phone && <p className="text-red-500 text-xs mt-1 ml-1">{formErrors.phone}</p>}
                </div>

                {/* Address */}
                <div>
                  <div className={`flex items-start gap-3 border rounded-xl px-3.5 py-3 transition ${formErrors.address ? 'border-red-300 bg-red-50' : 'border-gray-200 focus-within:border-orange-400'}`}>
                    <MapPin size={15} className={`mt-0.5 shrink-0 ${formErrors.address ? 'text-red-400' : 'text-gray-300'}`} />
                    <textarea
                      value={form.address}
                      onChange={(e) => { setForm({ ...form, address: e.target.value }); setFormErrors((p) => ({ ...p, address: '' })); }}
                      placeholder="Địa chỉ giao hàng *"
                      rows={2}
                      className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder-gray-300 resize-none"
                    />
                  </div>
                  {formErrors.address && <p className="text-red-500 text-xs mt-1 ml-1">{formErrors.address}</p>}
                </div>

                {/* Note */}
                <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-3.5 py-3 focus-within:border-orange-400 transition">
                  <MessageSquare size={15} className="text-gray-300 shrink-0" />
                  <input
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    placeholder="Ghi chú (không bắt buộc)"
                    className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder-gray-300"
                  />
                </div>
              </div>

              {/* Payment method */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <h3 className="font-bold text-gray-700 text-sm mb-3">Phương thức thanh toán</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => setPayMethod('cash')}
                    className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border-2 font-bold text-sm transition-all ${
                      payMethod === 'cash'
                        ? 'border-green-400 bg-green-50 text-green-700'
                        : 'border-gray-100 text-gray-500 hover:border-gray-200'
                    }`}
                  >
                    <Banknote size={18} />
                    <span>Tiền mặt</span>
                  </button>
                  <button
                    onClick={() => setPayMethod('transfer')}
                    className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border-2 font-bold text-sm transition-all ${
                      payMethod === 'transfer'
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-gray-100 text-gray-500 hover:border-gray-200'
                    }`}
                  >
                    <CreditCard size={18} />
                    <span>Chuyển khoản</span>
                  </button>
                </div>
              </div>

              {/* Bank transfer section */}
              {payMethod === 'transfer' && (
                <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 space-y-5">
                  <h3 className="font-bold text-gray-700 text-sm">Thông tin chuyển khoản</h3>

                  {/* Bank details */}
                  <div className="bg-blue-50 rounded-xl p-3.5 space-y-2.5 text-sm border border-blue-100">
                    {[
                      { label: 'Ngân hàng', value: BANK.displayName, key: null },
                      { label: 'Số tài khoản', value: BANK.account, key: 'account' },
                      { label: 'Chủ tài khoản', value: BANK.owner, key: null },
                      { label: 'Số tiền', value: `${cartTotal.toLocaleString()}đ`, key: 'amount', highlight: true },
                      { label: 'Nội dung CK', value: transferNote, key: 'note' },
                    ].map(({ label, value, key, highlight }) => (
                      <div key={label} className="flex items-center justify-between gap-2">
                        <span className="text-gray-500 shrink-0">{label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold text-right ${highlight ? 'text-blue-600 text-base' : 'text-gray-800'}`}>
                            {value}
                          </span>
                          {key && (
                            <button
                              onClick={() => handleCopy(value, key)}
                              className="p-1 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition shrink-0"
                              title="Sao chép"
                            >
                              {copied === key
                                ? <Check size={11} className="text-green-500" />
                                : <Copy size={11} className="text-gray-400" />
                              }
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* QR code */}
                  <div className="flex flex-col items-center gap-3">
                    <p className="text-xs text-gray-400 text-center">
                      Quét mã QR bằng app ngân hàng để chuyển khoản nhanh
                    </p>
                    <div className="rounded-2xl overflow-hidden border-4 border-white shadow-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrUrl}
                        alt="QR chuyển khoản"
                        width={220}
                        height={220}
                        className="block"
                      />
                    </div>
                    <p className="text-[11px] text-gray-400 text-center max-w-xs">
                      Mở <strong>app ngân hàng</strong> → Chuyển tiền → Quét QR → Kiểm tra số tiền và nội dung → Xác nhận
                    </p>
                  </div>

                  {/* Upload receipt */}
                  <div>
                    <p className="text-sm font-bold text-gray-700 mb-2.5">
                      Ảnh minh chứng thanh toán <span className="text-red-400">*</span>
                    </p>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    {receiptPreview ? (
                      <div className="relative rounded-2xl overflow-hidden border border-gray-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={receiptPreview}
                          alt="Biên lai chuyển khoản"
                          className="w-full max-h-60 object-contain bg-gray-50"
                        />
                        <button
                          onClick={() => { setReceiptFile(null); setReceiptPreview(null); }}
                          className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-md"
                        >
                          <X size={14} className="text-gray-600" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-green-500/90 backdrop-blur-sm py-2 px-3 flex items-center gap-1.5">
                          <Check size={14} className="text-white" />
                          <span className="text-white text-xs font-bold">Đã tải ảnh minh chứng</span>
                          <button
                            onClick={() => fileRef.current?.click()}
                            className="ml-auto text-white/80 text-xs underline"
                          >
                            Đổi ảnh
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => fileRef.current?.click()}
                        className={`w-full flex flex-col items-center gap-2.5 py-8 rounded-2xl border-2 border-dashed transition ${
                          formErrors.receipt
                            ? 'border-red-300 bg-red-50'
                            : 'border-gray-200 bg-gray-50 hover:border-orange-300 hover:bg-orange-50'
                        }`}
                      >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${formErrors.receipt ? 'bg-red-100' : 'bg-gray-100'}`}>
                          <Upload size={22} className={formErrors.receipt ? 'text-red-400' : 'text-gray-400'} />
                        </div>
                        <div className="text-center">
                          <p className={`text-sm font-semibold ${formErrors.receipt ? 'text-red-500' : 'text-gray-600'}`}>
                            Tải ảnh xác nhận chuyển khoản
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">Chụp ảnh màn hình hoặc chọn từ thư viện</p>
                        </div>
                      </button>
                    )}
                    {formErrors.receipt && !receiptPreview && (
                      <p className="text-red-500 text-xs mt-1.5 ml-1">{formErrors.receipt}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={submitting || cart.length === 0}
                className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-orange-200 hover:bg-orange-600 active:scale-95 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Đang xử lý đơn hàng...
                  </span>
                ) : (
                  'Xác nhận đặt hàng'
                )}
              </button>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
