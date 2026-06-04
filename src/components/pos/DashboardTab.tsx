'use client';

import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  ShoppingBag,
  Receipt,
  Search,
  Clock,
  CreditCard,
  Banknote,
  BarChart2,
  RefreshCw,
} from 'lucide-react';
import type { Order, PaymentMethod } from '@/types/pos.types';

type Period = 'hour' | 'day' | 'week' | 'month';
type PaymentFilter = 'all' | PaymentMethod;

interface Props {
  orders: Order[];
  isLoading: boolean;
  onRefresh: () => void;
}

const CATEGORIES = ['Coffee', 'Tea', 'Milk Tea', 'Yogurt', 'Matcha', 'Cacao', 'Fruit Juice'];

function fmtMoney(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString();
}

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export default function DashboardTab({ orders, isLoading, onRefresh }: Props) {
  const [period, setPeriod] = useState<Period>('day');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');

  const completedOrders = useMemo(
    () => orders.filter((o) => o.status === 'completed' || o.status === 'Complete'),
    [orders]
  );

  // ─── Today stats ──────────────────────────────────────────────────
  const todayStart = startOfDay(new Date());
  const todayOrders = useMemo(
    () => completedOrders.filter((o) => new Date(o.createdAt) >= todayStart),
    [completedOrders]
  );
  const todayRevenue = todayOrders.reduce((s, o) => s + o.totalPrice, 0);
  const avgOrderValue = todayOrders.length ? todayRevenue / todayOrders.length : 0;

  // This week revenue
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  startOfDay(weekStart);
  const weekRevenue = useMemo(
    () =>
      completedOrders
        .filter((o) => new Date(o.createdAt) >= weekStart)
        .reduce((s, o) => s + o.totalPrice, 0),
    [completedOrders]
  );

  // ─── Chart data ───────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (period === 'hour') {
      const hours = Array.from({ length: 24 }, (_, i) => ({
        label: `${i}h`,
        revenue: 0,
        orders: 0,
      }));
      const todayStr = new Date().toDateString();
      completedOrders.forEach((o) => {
        const d = new Date(o.createdAt);
        if (d.toDateString() === todayStr) {
          hours[d.getHours()].revenue += o.totalPrice;
          hours[d.getHours()].orders++;
        }
      });
      return hours;
    }

    if (period === 'day') {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return {
          label: d.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric' }),
          dateStr: d.toDateString(),
          revenue: 0,
          orders: 0,
        };
      });
      completedOrders.forEach((o) => {
        const dateStr = new Date(o.createdAt).toDateString();
        const slot = days.find((d) => d.dateStr === dateStr);
        if (slot) { slot.revenue += o.totalPrice; slot.orders++; }
      });
      return days;
    }

    if (period === 'week') {
      const weeks = Array.from({ length: 4 }, (_, i) => {
        const start = new Date();
        start.setDate(start.getDate() - (3 - i) * 7 - start.getDay());
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return {
          label: `${start.getDate()}/${start.getMonth() + 1}`,
          start: start.getTime(),
          end: end.getTime(),
          revenue: 0,
          orders: 0,
        };
      });
      completedOrders.forEach((o) => {
        const t = new Date(o.createdAt).getTime();
        const slot = weeks.find((w) => t >= w.start && t <= w.end);
        if (slot) { slot.revenue += o.totalPrice; slot.orders++; }
      });
      return weeks;
    }

    // month
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i));
      return {
        label: `T${d.getMonth() + 1}`,
        month: d.getMonth(),
        year: d.getFullYear(),
        revenue: 0,
        orders: 0,
      };
    });
    completedOrders.forEach((o) => {
      const d = new Date(o.createdAt);
      const slot = months.find((m) => m.month === d.getMonth() && m.year === d.getFullYear());
      if (slot) { slot.revenue += o.totalPrice; slot.orders++; }
    });
    return months;
  }, [completedOrders, period]);

  // ─── Top items ────────────────────────────────────────────────────
  const topItems = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number; category: string }> = {};
    completedOrders.forEach((o) => {
      o.items.forEach((item) => {
        if (!map[item.name]) {
          map[item.name] = { name: item.name, qty: 0, revenue: 0, category: item.category ?? '' };
        }
        map[item.name].qty += item.quantity;
        map[item.name].revenue += item.price * item.quantity;
      });
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 8);
  }, [completedOrders]);

  // ─── Filtered orders list ─────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (paymentFilter !== 'all' && o.paymentMethod !== paymentFilter) return false;
      if (categoryFilter !== 'all' && !o.items.some((i) => i.category === categoryFilter)) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        const matchTable = `bàn ${o.tableId}`.includes(s);
        const matchId = o.id.toLowerCase().includes(s);
        const matchItem = o.items.some((i) => i.name.toLowerCase().includes(s));
        if (!matchTable && !matchId && !matchItem) return false;
      }
      return true;
    });
  }, [orders, paymentFilter, categoryFilter, search]);

  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 1);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    const revenue = payload[0]?.value ?? 0;
    const item = chartData.find((d) => d.label === label);
    return (
      <div className="bg-gray-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl">
        <p className="font-bold text-orange-400">{revenue.toLocaleString()}đ</p>
        {item && 'orders' in item && (
          <p className="text-gray-300">{(item as { orders: number }).orders} đơn</p>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-sm">Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">

      {/* ── Header ── */}
      <div className="flex justify-between items-center">
        <h2 className="text-gray-800 text-lg flex items-center gap-2">
          <BarChart2 size={20} className="text-orange-500" />
          Thống kê
        </h2>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg"
        >
          <RefreshCw size={12} />
          Làm mới
        </button>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={14} className="text-orange-500" />
            <span className="text-[10px] text-gray-400 uppercase">Hôm nay</span>
          </div>
          <p className="text-base font-bold text-gray-800">{fmtMoney(todayRevenue)}đ</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{todayOrders.length} đơn</p>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Receipt size={14} className="text-blue-500" />
            <span className="text-[10px] text-gray-400 uppercase">TB/đơn</span>
          </div>
          <p className="text-base font-bold text-gray-800">{fmtMoney(avgOrderValue)}đ</p>
          <p className="text-[10px] text-gray-400 mt-0.5">trung bình</p>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <ShoppingBag size={14} className="text-green-500" />
            <span className="text-[10px] text-gray-400 uppercase">Tuần này</span>
          </div>
          <p className="text-base font-bold text-gray-800">{fmtMoney(weekRevenue)}đ</p>
          <p className="text-[10px] text-gray-400 mt-0.5">doanh thu</p>
        </div>
      </div>

      {/* ── Revenue chart ── */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm text-gray-700">Doanh thu</h3>
          <div className="flex gap-1">
            {(['hour', 'day', 'week', 'month'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`text-[10px] px-2 py-1 rounded-lg font-bold transition-all ${
                  period === p
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {p === 'hour' ? 'Giờ' : p === 'day' ? 'Ngày' : p === 'week' ? 'Tuần' : 'Tháng'}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              interval={period === 'hour' ? 3 : 0}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => fmtMoney(v)}
              domain={[0, maxRevenue * 1.2]}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(249,115,22,0.08)' }} />
            <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Top items ── */}
      {topItems.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <h3 className="text-sm text-gray-700 mb-3">Món bán chạy nhất</h3>
          <div className="space-y-2">
            {topItems.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-3">
                <span
                  className={`text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    idx === 0
                      ? 'bg-yellow-400 text-white'
                      : idx === 1
                      ? 'bg-gray-300 text-white'
                      : idx === 2
                      ? 'bg-orange-300 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 truncate">{item.name}</p>
                  <div
                    className="h-1 bg-orange-100 rounded-full mt-1"
                  >
                    <div
                      className="h-1 bg-orange-400 rounded-full transition-all"
                      style={{ width: `${(item.qty / topItems[0].qty) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-orange-600">{item.qty} ly</p>
                  <p className="text-[10px] text-gray-400">{fmtMoney(item.revenue)}đ</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Orders list with filters ── */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <h3 className="text-sm text-gray-700 mb-3">Danh sách đơn hàng</h3>

        {/* Search */}
        <div className="relative mb-2">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo bàn, tên món..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-orange-300 transition"
          />
        </div>

        {/* Filter row - Payment */}
        <div className="flex gap-1.5 mb-2 overflow-x-auto scrollbar-hide">
          {(['all', 'cash', 'transfer'] as PaymentFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setPaymentFilter(f)}
              className={`flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-bold whitespace-nowrap shrink-0 transition-all ${
                paymentFilter === f
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {f === 'all' ? (
                'Tất cả'
              ) : f === 'cash' ? (
                <><Banknote size={10} /> Tiền mặt</>
              ) : (
                <><CreditCard size={10} /> Chuyển khoản</>
              )}
            </button>
          ))}
        </div>

        {/* Filter row - Category */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto scrollbar-hide">
          {['all', ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`text-[10px] px-2.5 py-1 rounded-full font-bold whitespace-nowrap shrink-0 transition-all ${
                categoryFilter === cat
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {cat === 'all' ? 'Mọi loại' : cat}
            </button>
          ))}
        </div>

        {/* Count */}
        <p className="text-[10px] text-gray-400 mb-2">
          {filteredOrders.length} đơn hàng
        </p>

        {/* Order cards */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            Không tìm thấy đơn hàng nào
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto scrollbar-hide">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="border border-gray-100 rounded-xl p-3"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                      #{order.id.slice(-6)}
                    </p>
                    <h4 className="text-sm text-gray-800">Bàn {order.tableId}</h4>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {order.status === 'pending' ? (
                      <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase">
                        Chờ TT
                      </span>
                    ) : (
                      <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase">
                        ✅ Xong
                      </span>
                    )}
                    {order.paymentMethod && (
                      <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                        {order.paymentMethod === 'cash' ? (
                          <><Banknote size={9} /> Tiền mặt</>
                        ) : (
                          <><CreditCard size={9} /> Chuyển khoản</>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-1 mb-2 border-t border-gray-50 pt-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <span className="text-gray-600 truncate flex-1 mr-2">
                        {item.quantity}x {item.name}
                        {item.size && (
                          <span className="text-[9px] text-orange-400 ml-1">[{item.size}]</span>
                        )}
                      </span>
                      <span className="text-gray-500 shrink-0">
                        {(item.price * item.quantity).toLocaleString()}đ
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(order.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {' - '}
                    {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                  <span className="text-sm font-bold text-orange-600">
                    {order.totalPrice?.toLocaleString()}đ
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
