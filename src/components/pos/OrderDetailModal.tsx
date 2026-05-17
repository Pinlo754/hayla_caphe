'use client';

import { useState } from 'react';
import { X, Printer } from 'lucide-react';
import { Order, PaymentMethod } from '@/types/pos.types';
import QRModal from './QRModal';

interface Props {
  order: Order;
  paymentMethod: PaymentMethod;
  isProcessing: boolean;
  onPaymentMethodChange: (m: PaymentMethod) => void;
  onConfirmPayment: (orderId: string) => void;
  onClose: () => void;
}

export default function OrderDetailModal({ order, paymentMethod, isProcessing, onPaymentMethodChange, onConfirmPayment, onClose }: Props) {
  const [qrExpanded, setQrExpanded] = useState(false);

  const subtotal = order.items?.reduce((s, i) => s + i.price * i.quantity, 0) ?? 0;

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col justify-end">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-t-[40px] max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">

          {/* Header */}
          <div className="px-6 py-5 border-b flex justify-between items-start">
            <div>
              <h2 className="text-xl text-gray-800">Bàn {order.tableId}</h2>
              <p className="text-gray-400 text-xs">Đơn #{order.id.slice(-6)}</p>
            </div>
            <button onClick={onClose} className="p-2 bg-gray-100 rounded-full">
              <X size={20} className="text-black" />
            </button>
          </div>

          {/* Items list */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start text-sm">
                <div>
                  <span className="text-gray-800">{item.quantity}x {item.name}</span>
                  {item.note && <p className="text-[11px] text-orange-500 mt-0.5">📝 {item.note}</p>}
                </div>
                <span className="text-gray-600 ml-4">{(item.price * item.quantity).toLocaleString()}đ</span>
              </div>
            ))}

            {/* Discount */}
            {order.discount && order.discount.amount > 0 && (
              <div className="flex justify-between text-sm text-red-500 font-bold pt-2 border-t border-dashed">
                <span>Giảm giá ({order.discount.type === 'percent' ? `${order.discount.value}%` : 'VNĐ'})</span>
                <span>-{order.discount.amount.toLocaleString()}đ</span>
              </div>
            )}

            {order.discount && order.discount.amount > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Tạm tính</span>
                <span>{subtotal.toLocaleString()}đ</span>
              </div>
            )}

            {/* Payment method */}
            <div className="pt-4 border-t border-dashed mt-2">
              <p className="font-bold text-gray-700 mb-3 text-sm">Thanh toán bằng</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onPaymentMethodChange('cash')}
                  className={`py-3 rounded-2xl border-2 font-bold text-sm ${paymentMethod === 'cash' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-100 text-gray-400'}`}
                >
                  💵 Tiền mặt
                </button>
                <button
                  onClick={() => onPaymentMethodChange('transfer')}
                  className={`py-3 rounded-2xl border-2 font-bold text-sm ${paymentMethod === 'transfer' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-100 text-gray-400'}`}
                >
                  🏦 Chuyển khoản
                </button>
              </div>

              {paymentMethod === 'transfer' && (
                <div className="mt-4 p-4 bg-orange-50 rounded-2xl flex flex-col items-center">
                  <img
                    src={`https://img.vietqr.io/image/VCB-1021950952-compact2.jpg?amount=${order.totalPrice}&addInfo=Ban%20${order.tableId}`}
                    className="w-32 h-32 object-contain cursor-pointer active:scale-95 transition-transform"
                    onClick={() => setQrExpanded(true)}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Chạm vào mã để phóng to</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t bg-white">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-gray-500 text-sm uppercase">Tổng cộng</span>
              <span className="text-2xl text-orange-600">{order.totalPrice.toLocaleString()}đ</span>
            </div>
            <button
              onClick={() => onConfirmPayment(order.id)}
              disabled={isProcessing}
              className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 disabled:bg-gray-200"
            >
              <Printer size={20} />
              {isProcessing ? 'ĐANG XỬ LÝ...' : 'THANH TOÁN & IN HÓA ĐƠN'}
            </button>
          </div>
        </div>
      </div>

      {qrExpanded && (
        <QRModal amount={order.totalPrice} tableId={order.tableId} onClose={() => setQrExpanded(false)} />
      )}
    </>
  );
}
