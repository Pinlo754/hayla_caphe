'use client';

import { useEffect, useMemo, useState } from 'react';
import { getOrders } from '@/app/lib/firebaseOrders';
import type { Order } from '@/types/pos.types';
import { TrendingUp, ShoppingBag, Receipt, Clock } from 'lucide-react';

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrders().then(setOrders).finally(() => setLoading(false));
  }, []);

  const completed = useMemo(
    () => orders.filter((o) => o.status === 'completed' || o.status === 'Complete'),
    [orders]
  );

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayList = completed.filter((o) => new Date(o.createdAt) >= todayStart);
  const todayRevenue = todayList.reduce((s, o) => s + o.totalPrice, 0);

  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
  const weekList = completed.filter((o) => new Date(o.createdAt) >= weekStart);
  const weekRevenue = weekList.reduce((s, o) => s + o.totalPrice, 0);

  const totalRevenue = completed.reduce((s, o) => s + o.totalPrice, 0);
  const pending = orders.filter((o) => o.status === 'pending').length;

  const stats = [
    { label: 'Hôm nay', value: todayRevenue.toLocaleString() + 'đ', sub: `${todayList.length} đơn hoàn thành`, icon: TrendingUp, bg: 'bg-orange-50', color: 'text-orange-500' },
    { label: '7 ngày qua', value: weekRevenue.toLocaleString() + 'đ', sub: `${weekList.length} đơn hoàn thành`, icon: ShoppingBag, bg: 'bg-blue-50', color: 'text-blue-500' },
    { label: 'Tổng doanh thu', value: totalRevenue.toLocaleString() + 'đ', sub: `${completed.length} đơn`, icon: Receipt, bg: 'bg-green-50', color: 'text-green-500' },
    { label: 'Chờ thanh toán', value: String(pending), sub: 'đơn đang mở', icon: Clock, bg: 'bg-yellow-50', color: 'text-yellow-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((s) => (
              <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.bg}`}>
                  <s.icon size={20} className={s.color} />
                </div>
                <p className="text-xl font-bold text-gray-800 truncate">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                <p className="text-xs text-gray-500 mt-1">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-700">Đơn hàng gần đây</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {orders.slice(0, 10).map((order) => (
                <div key={order.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Bàn {order.tableId}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {order.items.length} món ·{' '}
                      {new Date(order.createdAt).toLocaleString('vi-VN', {
                        hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-orange-600">{order.totalPrice.toLocaleString()}đ</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      order.status === 'pending' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                    }`}>
                      {order.status === 'pending' ? 'Chờ TT' : 'Xong'}
                    </span>
                  </div>
                </div>
              ))}
              {orders.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-10">Chưa có đơn hàng nào</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
