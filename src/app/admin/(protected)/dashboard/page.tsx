'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import * as XLSX from 'xlsx';
import { getOrders } from '@/app/lib/firebaseOrders';
import type { Order } from '@/types/pos.types';
import {
  TrendingUp,
  ShoppingBag,
  Receipt,
  Clock,
  CalendarDays,
  Download,
} from 'lucide-react';

type Period = 'hour' | 'day' | 'week' | 'month' | 'custom';

function fmtMoney(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString();
}

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0];
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl">
      <p className="text-gray-400 mb-0.5">{label}</p>
      <p className="font-bold text-orange-400">{(payload[0]?.value ?? 0).toLocaleString()}đ</p>
    </div>
  );
};

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [period, setPeriod] = useState<Period>('day');
  const today = toDateStr(new Date());
  const sevenDaysAgo = toDateStr(new Date(Date.now() - 6 * 86400000));
  const [dateFrom, setDateFrom] = useState(sevenDaysAgo);
  const [dateTo, setDateTo] = useState(today);

  useEffect(() => {
    getOrders().then(setOrders).finally(() => setLoading(false));
  }, []);

  const completed = useMemo(
    () => orders.filter((o) => o.status === 'completed' || o.status === 'Complete'),
    [orders]
  );

  // ── Summary stats ──────────────────────────────────────────────────
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayList = completed.filter((o) => new Date(o.createdAt) >= todayStart);
  const todayRevenue = todayList.reduce((s, o) => s + o.totalPrice, 0);

  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
  const weekList = completed.filter((o) => new Date(o.createdAt) >= weekStart);
  const weekRevenue = weekList.reduce((s, o) => s + o.totalPrice, 0);

  const totalRevenue = completed.reduce((s, o) => s + o.totalPrice, 0);
  const pending = orders.filter((o) => o.status === 'pending').length;

  const stats = [
    { label: 'Hôm nay', value: todayRevenue.toLocaleString() + 'đ', sub: `${todayList.length} đơn`, icon: TrendingUp, bg: 'bg-orange-50', color: 'text-orange-500' },
    { label: '7 ngày qua', value: weekRevenue.toLocaleString() + 'đ', sub: `${weekList.length} đơn`, icon: ShoppingBag, bg: 'bg-blue-50', color: 'text-blue-500' },
    { label: 'Tổng doanh thu', value: totalRevenue.toLocaleString() + 'đ', sub: `${completed.length} đơn`, icon: Receipt, bg: 'bg-green-50', color: 'text-green-500' },
    { label: 'Chờ thanh toán', value: String(pending), sub: 'đơn đang mở', icon: Clock, bg: 'bg-yellow-50', color: 'text-yellow-500' },
  ];

  // ── Chart data ─────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (period === 'hour') {
      const hours = Array.from({ length: 24 }, (_, i) => ({ label: `${i}h`, revenue: 0, orders: 0 }));
      const todayStr = new Date().toDateString();
      completed.forEach((o) => {
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
        return { label: d.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric' }), dateStr: d.toDateString(), revenue: 0, orders: 0 };
      });
      completed.forEach((o) => {
        const slot = days.find((d) => d.dateStr === new Date(o.createdAt).toDateString());
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
        return { label: `${start.getDate()}/${start.getMonth() + 1}`, start: start.getTime(), end: end.getTime(), revenue: 0, orders: 0 };
      });
      completed.forEach((o) => {
        const t = new Date(o.createdAt).getTime();
        const slot = weeks.find((w) => t >= w.start && t <= w.end);
        if (slot) { slot.revenue += o.totalPrice; slot.orders++; }
      });
      return weeks;
    }

    if (period === 'month') {
      const months = Array.from({ length: 12 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (11 - i));
        return { label: `T${d.getMonth() + 1}/${d.getFullYear()}`, month: d.getMonth(), year: d.getFullYear(), revenue: 0, orders: 0 };
      });
      completed.forEach((o) => {
        const d = new Date(o.createdAt);
        const slot = months.find((m) => m.month === d.getMonth() && m.year === d.getFullYear());
        if (slot) { slot.revenue += o.totalPrice; slot.orders++; }
      });
      return months;
    }

    // custom
    const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
    const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
    if (from > to) return [];
    const dayCount = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
    const days = Array.from({ length: Math.min(dayCount, 180) }, (_, i) => {
      const d = new Date(from.getTime() + i * 86400000);
      return { label: `${d.getDate()}/${d.getMonth() + 1}`, dateStr: d.toDateString(), revenue: 0, orders: 0 };
    });
    completed.forEach((o) => {
      const od = new Date(o.createdAt);
      if (od >= from && od <= to) {
        const slot = days.find((d) => d.dateStr === od.toDateString());
        if (slot) { slot.revenue += o.totalPrice; slot.orders++; }
      }
    });
    return days;
  }, [completed, period, dateFrom, dateTo]);

  const chartTotal = chartData.reduce((s, d) => s + d.revenue, 0);
  const chartOrderCount = chartData.reduce((s, d) => s + d.orders, 0);
  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 1);

  // ── Excel export ───────────────────────────────────────────────────
  const handleExport = () => {
    setExporting(true);
    try {
      const periodLabels: Record<Period, string> = {
        hour: 'Hôm nay (theo giờ)',
        day: '7 ngày gần đây',
        week: '4 tuần gần đây',
        month: '12 tháng gần đây',
        custom: `${dateFrom} → ${dateTo}`,
      };

      // Sheet 1: Revenue summary
      const summaryRows = [
        ['Khoảng thời gian', periodLabels[period]],
        ['Tổng doanh thu', chartTotal],
        ['Tổng số đơn', chartOrderCount],
        [],
        ['Thời điểm', 'Doanh thu (đ)', 'Số đơn'],
        ...chartData.map((d) => [d.label, d.revenue, d.orders]),
        [],
        ['TỔNG', chartTotal, chartOrderCount],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
      ws1['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 10 }];

      // Sheet 2: Order details for the chart period
      const from = period === 'custom' ? new Date(dateFrom) : (() => {
        if (period === 'hour') { const d = new Date(); d.setHours(0,0,0,0); return d; }
        if (period === 'day') return new Date(Date.now() - 6 * 86400000);
        if (period === 'week') return new Date(Date.now() - 27 * 86400000);
        return new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1);
      })();
      from.setHours(0, 0, 0, 0);
      const to = period === 'custom' ? new Date(dateTo) : new Date();
      to.setHours(23, 59, 59, 999);

      const periodOrders = completed.filter((o) => {
        const t = new Date(o.createdAt);
        return t >= from && t <= to;
      });

      const orderRows = [
        ['Mã đơn', 'Bàn', 'Tổng tiền (đ)', 'Thanh toán', 'Ngày giờ', 'Các món'],
        ...periodOrders.map((o) => [
          o.id.slice(-8).toUpperCase(),
          `Bàn ${o.tableId}`,
          o.totalPrice,
          o.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản',
          new Date(o.createdAt).toLocaleString('vi-VN'),
          o.items.map((i) => `${i.quantity}x ${i.name}`).join(', '),
        ]),
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(orderRows);
      ws2['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 16 }, { wch: 14 }, { wch: 20 }, { wch: 50 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, 'Doanh thu');
      XLSX.utils.book_append_sheet(wb, ws2, 'Chi tiết đơn');

      const stamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `hayla_doanhthu_${stamp}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Summary cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

          {/* ── Revenue chart ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
            {/* Header row */}
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="font-bold text-gray-700">Doanh thu</h2>
                <p className="text-2xl font-bold text-orange-500 mt-0.5">{chartTotal.toLocaleString()}đ</p>
                <p className="text-xs text-gray-400">{chartOrderCount} đơn hoàn thành</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Period pills */}
                <div className="flex gap-1 flex-wrap">
                  {([
                    { key: 'hour' as Period, label: 'Hôm nay' },
                    { key: 'day' as Period, label: '7 ngày' },
                    { key: 'week' as Period, label: 'Tuần' },
                    { key: 'month' as Period, label: 'Tháng' },
                    { key: 'custom' as Period, label: <CalendarDays size={13} /> },
                  ]).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setPeriod(key)}
                      className={`flex items-center text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
                        period === key ? 'bg-orange-500 text-white shadow-sm shadow-orange-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Export button */}
                <button
                  onClick={handleExport}
                  disabled={exporting || chartData.length === 0}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm shadow-emerald-200 transition disabled:opacity-50"
                >
                  <Download size={13} />
                  {exporting ? 'Đang xuất...' : 'Xuất Excel'}
                </button>
              </div>
            </div>

            {/* Custom date range picker */}
            {period === 'custom' && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-orange-50 rounded-xl">
                <CalendarDays size={15} className="text-orange-400 shrink-0" />
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="text-sm bg-transparent outline-none text-gray-700 cursor-pointer"
                />
                <span className="text-gray-300">→</span>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  max={today}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="text-sm bg-transparent outline-none text-gray-700 cursor-pointer"
                />
              </div>
            )}

            {/* Area chart */}
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  interval={
                    period === 'hour' ? 3
                    : period === 'custom' && chartData.length > 14 ? Math.ceil(chartData.length / 7) - 1
                    : 0
                  }
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => fmtMoney(v)}
                  domain={[0, maxRevenue * 1.2]}
                  width={56}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#f97316', strokeWidth: 1, strokeDasharray: '4 2' }} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#f97316"
                  strokeWidth={2}
                  fill="url(#adminRevenueGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#f97316', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* ── Recent orders ── */}
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
