'use client';

import { useState } from 'react';
import { X, Minus, Plus, ShoppingBag, MessageSquare } from 'lucide-react';
import { DiscountType, PaymentMethod } from '@/types/pos.types';
import { usePosStore } from '@/store/usePosStore';

interface Props {
  discountType: DiscountType;
  discountValue: number;
  paymentMethod: PaymentMethod;
  isProcessing: boolean;
  onDiscountTypeChange: (t: DiscountType) => void;
  onDiscountValueChange: (v: number) => void;
  onPaymentMethodChange: (m: PaymentMethod) => void;
  onCheckout: () => void;
  onClose: () => void;
}

const QUICK_DISCOUNTS = [20, 30, 50, 100];

export default function CartDrawer({
  discountType, discountValue, paymentMethod, isProcessing,
  onDiscountTypeChange, onDiscountValueChange, onPaymentMethodChange,
  onCheckout, onClose,
}: Props) {
  const { cart, selectedTable, updateQuantity, updateNote } = usePosStore();
  const [expandedNoteId, setExpandedNoteId] = useState<number | string | null>(null);
  const [showQR, setShowQR] = useState(false);

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountAmount = discountType === 'percent'
    ? subtotal * (discountValue / 100)
    : Number(discountValue);
  const finalTotal = Math.max(0, subtotal - discountAmount);

  const handleQuickDiscount = (pct: number) => {
    onDiscountTypeChange('percent');
    onDiscountValueChange(discountValue === pct && discountType === 'percent' ? 0 : pct);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-[40px] max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">

        {/* Handle bar */}
        <div className="flex justify-center pt-4 pb-2" onClick={onClose}>
          <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-6 py-3 flex justify-between items-center border-b">
          <div>
            <h2 className="text-xl text-gray-800">Đơn hàng</h2>
            <p className="text-xs text-gray-400">Bàn {selectedTable}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full">
            <X size={20} className="text-black" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Items */}
          <div className="px-6 pt-4 space-y-3">
            {cart.map((item) => (
              <div key={item.id}>
                <div className="flex justify-between items-center">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="font-bold text-gray-800 text-sm truncate">{item.name}</p>
                    <p className="text-orange-600 text-xs font-bold">{item.price.toLocaleString()}đ</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setExpandedNoteId(expandedNoteId === item.id ? null : item.id)}
                      className={`p-1.5 rounded-lg transition ${expandedNoteId === item.id || item.note ? 'bg-orange-100 text-orange-500' : 'bg-gray-100 text-gray-400'}`}
                    >
                      <MessageSquare size={14} />
                    </button>
                    <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl ml-1">
                      <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 bg-white rounded-lg shadow-sm flex items-center justify-center text-gray-400">
                        <Minus size={13} />
                      </button>
                      <span className="text-black w-4 text-center text-sm">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 bg-white rounded-lg shadow-sm flex items-center justify-center text-orange-600">
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Note input */}
                {expandedNoteId === item.id && (
                  <div className="mt-2 ml-0 animate-in slide-in-from-top-1 duration-200">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Ghi chú món (ít đường, không đá...)"
                      className="w-full text-xs text-gray-700 p-2.5 rounded-xl border border-orange-200 bg-orange-50 outline-none"
                      value={item.note ?? ''}
                      onChange={(e) => updateNote(item.id, e.target.value)}
                    />
                  </div>
                )}

                {/* Show saved note */}
                {expandedNoteId !== item.id && item.note && (
                  <p className="text-[11px] text-orange-500 mt-1 ml-1">📝 {item.note}</p>
                )}
              </div>
            ))}
          </div>

          {/* Discount section */}
          <div className="mx-6 mt-5 p-4 bg-gray-50 rounded-3xl">
            <p className="font-bold text-gray-700 mb-3 text-sm">Giảm giá</p>

            {/* Quick discount buttons */}
            <div className="flex gap-2 mb-3">
              {QUICK_DISCOUNTS.map((pct) => (
                <button
                  key={pct}
                  onClick={() => handleQuickDiscount(pct)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                    discountType === 'percent' && discountValue === pct
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>

            {/* Manual input */}
            <div className="flex gap-2">
              <div className="flex bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => onDiscountTypeChange('percent')}
                  className={`px-3 py-2 text-xs font-bold transition ${discountType === 'percent' ? 'bg-orange-500 text-white' : 'text-gray-500'}`}
                >
                  %
                </button>
                <button
                  onClick={() => onDiscountTypeChange('fixed')}
                  className={`px-3 py-2 text-xs font-bold transition ${discountType === 'fixed' ? 'bg-orange-500 text-white' : 'text-gray-500'}`}
                >
                  VNĐ
                </button>
              </div>
              <input
                type="number"
                placeholder="Nhập giá trị..."
                className="flex-1 text-black text-sm p-2.5 rounded-xl border border-gray-200 bg-white outline-none"
                value={discountValue || ''}
                onChange={(e) => onDiscountValueChange(e.target.value === '' ? 0 : Number(e.target.value))}
              />
            </div>
          </div>

          {/* Payment method */}
          <div className="px-6 mt-4 pb-4">
            <p className="font-bold text-gray-700 mb-3 text-sm">Thanh toán bằng</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { onPaymentMethodChange('cash'); setShowQR(false); }}
                className={`py-3 rounded-2xl border-2 font-bold text-sm transition-all ${paymentMethod === 'cash' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-100 text-gray-400'}`}
              >
                💵 Tiền mặt
              </button>
              <button
                onClick={() => { onPaymentMethodChange('transfer'); setShowQR(true); }}
                className={`py-3 rounded-2xl border-2 font-bold text-sm transition-all ${paymentMethod === 'transfer' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-100 text-gray-400'}`}
              >
                🏦 Chuyển khoản
              </button>
            </div>

            {/* QR code inline */}
            {showQR && paymentMethod === 'transfer' && (
              <div className="mt-4 p-4 bg-orange-50 rounded-3xl border-2 border-dashed border-orange-200 flex flex-col items-center animate-in zoom-in duration-300">
                <img
                  src={`https://img.vietqr.io/image/VCB-1021950952-compact2.jpg?amount=${finalTotal}&addInfo=Ban%20${selectedTable}`}
                  alt="QR thanh toán"
                  className="w-40 h-40 object-contain rounded-xl shadow-md bg-white p-2"
                />
                <p className="mt-2 text-[10px] text-center text-gray-500">
                  Vietcombank · <b className="text-gray-900">1021950952</b>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-gray-500 text-sm">
              <span>Tạm tính</span>
              <span>{subtotal.toLocaleString()}đ</span>
            </div>
            {discountValue > 0 && (
              <div className="flex justify-between text-red-500 text-sm font-bold">
                <span>Giảm ({discountType === 'percent' ? `${discountValue}%` : 'VNĐ'})</span>
                <span>-{discountAmount.toLocaleString()}đ</span>
              </div>
            )}
          </div>
          <div className="flex justify-between items-end border-t pt-3">
            <span className="font-bold text-gray-700">TỔNG CỘNG</span>
            <span className="text-3xl text-orange-600 tracking-tighter">{finalTotal.toLocaleString()}đ</span>
          </div>
          <button
            disabled={isProcessing}
            onClick={onCheckout}
            className="w-full py-4 bg-orange-600 text-white rounded-2xl text-lg font-bold shadow-lg shadow-orange-200 disabled:bg-gray-200 flex items-center justify-center gap-2"
          >
            <ShoppingBag size={20} />
            {isProcessing ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN & IN HÓA ĐƠN'}
          </button>
          <div className="h-2" />
        </div>
      </div>
    </div>
  );
}
