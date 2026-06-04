'use client';

import { useEffect, useMemo, useState } from 'react';
import { getOrders, deleteOrder } from '@/app/lib/firebaseOrders';
import type { Order } from '@/types/pos.types';
import { Trash2, RefreshCw, ChevronDown, ChevronUp, Search, Banknote, CreditCard } from 'lucide-react';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  const load = () => {
    setLoading(true);
    getOrders().then(setOrders).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa đơn hàng này?')) return;
    setDeletingId(id);
    try {
      await deleteOrder(id);
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter === 'pending' && o.status !== 'pending') return false;
      if (statusFilter === 'completed' && o.status === 'pending') return false;
      if (paymentFilter !== 'all' && o.paymentMethod !== paymentFilter) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        if (!`bàn ${o.tableId}`.includes(s) && !o.id.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [orders, statusFilter, paymentFilter, search]);

  const totalRevenue = useMemo(
    () => filtered.filter((o) => o.status !== 'pending').reduce((s, o) => s + o.totalPrice, 0),
    [filtered]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Đơn hàng</h1>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded-xl font-bold hover:bg-orange-100 transition"
        >
          <RefreshCw size={14} />
          Làm mới
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo bàn hoặc mã đơn..."
            className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-orange-300 transition"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'pending', label: 'Chờ TT' },
            { key: 'completed', label: 'Hoàn thành' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition ${statusFilter === key ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500'}`}
            >
              {label}
            </button>
          ))}
          <div className="w-px bg-gray-200" />
          {[
            { key: 'all', label: 'Mọi TT toán' },
            { key: 'cash', label: 'Tiền mặt' },
            { key: 'transfer', label: 'Chuyển khoản' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPaymentFilter(key)}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition ${paymentFilter === key ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <p className="text-xs text-gray-500 mb-3">
        {filtered.length} đơn · Doanh thu lọc: <span className="font-bold text-orange-600">{totalRevenue.toLocaleString()}đ</span>
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-16">Không có đơn hàng</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map((order) => (
                <div key={order.id}>
                  <div
                    className="px-5 py-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                  >
                    {/* ID + Table */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono text-gray-400">#{order.id.slice(-6)}</span>
                        <span className="font-semibold text-gray-800 text-sm">Bàn {order.tableId}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          order.status === 'pending' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                        }`}>
                          {order.status === 'pending' ? 'Chờ TT' : 'Xong'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                        <span>{new Date(order.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                        {order.paymentMethod && (
                          <span className="flex items-center gap-0.5">
                            {order.paymentMethod === 'cash' ? <Banknote size={10} /> : <CreditCard size={10} />}
                            {order.paymentMethod === 'cash' ? 'Tiền mặt' : 'CK'}
                          </span>
                        )}
                      </p>
                    </div>

                    <span className="font-bold text-orange-600 shrink-0">{order.totalPrice.toLocaleString()}đ</span>

                    {expandedId === order.id
                      ? <ChevronUp size={16} className="text-gray-400 shrink-0" />
                      : <ChevronDown size={16} className="text-gray-400 shrink-0" />
                    }

                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(order.id); }}
                      disabled={deletingId === order.id}
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition disabled:opacity-40"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Expanded items */}
                  {expandedId === order.id && (
                    <div className="px-5 pb-4 bg-gray-50 border-t border-gray-100">
                      <div className="space-y-1.5 pt-3">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              {item.quantity}x {item.name}
                              {item.size && <span className="text-xs text-orange-400 ml-1">[{item.size}]</span>}
                              {item.toppings?.length ? <span className="text-xs text-gray-400 ml-1">+{item.toppings.join(', ')}</span> : null}
                            </span>
                            <span className="text-gray-700 font-medium">{(item.price * item.quantity).toLocaleString()}đ</span>
                          </div>
                        ))}
                        {order.discount && order.discount.amount > 0 && (
                          <div className="flex justify-between text-xs text-red-400 pt-1 border-t border-gray-200">
                            <span>Giảm giá</span>
                            <span>-{order.discount.amount.toLocaleString()}đ</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
