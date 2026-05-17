'use client';

import { ClipboardList, Clock } from 'lucide-react';
import { Order } from '@/types/pos.types';

interface Props {
  orders: Order[];
  isLoading: boolean;
  onRefresh: () => void;
}

export default function OrdersTab({ orders, isLoading, onRefresh }: Props) {
  return (
    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
      <div className="flex justify-between items-center">
        <h2 className="text-gray-800 text-lg">Lịch sử đơn hàng</h2>
        <button
          onClick={onRefresh}
          className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg"
        >
          Làm mới
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
          <p className="text-sm">Đang tải...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
          <ClipboardList size={48} className="mx-auto text-gray-200 mb-2" />
          <p className="text-gray-400 text-sm">Chưa có đơn hàng nào</p>
        </div>
      ) : (
        orders.map((order) => (
          <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest">#{order.id.slice(-6)}</p>
                <h4 className="text-lg text-gray-800">Bàn {order.tableId}</h4>
              </div>
              {order.status === 'pending' ? (
                <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                  Chờ thanh toán
                </span>
              ) : (
                <span className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                  ✅ Đã xong
                </span>
              )}
            </div>

            <div className="space-y-1 mb-3 border-t border-b border-gray-50 py-2">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs text-gray-600">
                  <div>
                    <span>{item.quantity}x {item.name}</span>
                    {item.note && <p className="text-[10px] text-orange-400">📝 {item.note}</p>}
                  </div>
                  <span>{(item.price * item.quantity).toLocaleString()}đ</span>
                </div>
              ))}
            </div>

            {order.discount && order.discount.amount > 0 && (
              <div className="flex justify-between text-xs text-red-400 mb-1">
                <span>Giảm ({order.discount.type === 'percent' ? `${order.discount.value}%` : 'VNĐ'})</span>
                <span>-{order.discount.amount.toLocaleString()}đ</span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1 text-gray-400 text-[10px]">
                <Clock size={12} />
                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {' - '}
                {new Date(order.createdAt).toLocaleDateString('vi-VN')}
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase">Tổng</p>
                <p className="text-base text-orange-600">{order.totalPrice?.toLocaleString()}đ</p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
