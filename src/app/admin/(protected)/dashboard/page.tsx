'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import * as XLSX from 'xlsx';
import {
  getOrdersByDateRange, getRecentOrders, getPendingCount, deleteOrdersBatch,
} from '@/app/lib/firebaseOrders';
import {
  archiveOrdersToStats, getAllArchivedMonths, getDailyStatsByRange, buildMonthlyChartFromStats,
} from '@/app/lib/firebaseDailyStats';
import type { Order } from '@/types/pos.types';
import type { MonthSummary } from '@/app/lib/firebaseDailyStats';
import {
  TrendingUp, ShoppingBag, Calendar, Clock, CalendarDays, Download,
  Archive, Trash2, ChevronDown, ChevronUp, Loader2, Check, AlertCircle,
  Printer, Banknote, CreditCard,
} from 'lucide-react';

type Period = 'hour' | 'day' | 'week' | 'month' | 'custom';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtMoney(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString();
}

function toDateStr(d: Date) { return d.toISOString().split('T')[0]; }

function isCompleted(o: Order) { return o.status === 'completed' || o.status === 'Complete'; }

/** Trả về [from, to] tương ứng với period đang chọn */
function getPeriodRange(period: Period, dateFrom: string, dateTo: string): [Date, Date] {
  const now = new Date();
  const eod = new Date(now); eod.setHours(23, 59, 59, 999);

  if (period === 'hour') {
    const from = new Date(now); from.setHours(0, 0, 0, 0);
    return [from, eod];
  }
  if (period === 'day') {
    const from = new Date(Date.now() - 6 * 86400000); from.setHours(0, 0, 0, 0);
    return [from, eod];
  }
  if (period === 'week') {
    const from = new Date(Date.now() - 27 * 86400000); from.setHours(0, 0, 0, 0);
    return [from, eod];
  }
  if (period === 'month') {
    const from = new Date(now); from.setMonth(from.getMonth() - 11); from.setDate(1); from.setHours(0, 0, 0, 0);
    return [from, eod];
  }
  const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
  const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
  return [from, to];
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl">
      <p className="text-gray-400 mb-0.5">{label}</p>
      <p className="font-bold text-orange-400">{(payload[0]?.value ?? 0).toLocaleString()}đ</p>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const today = toDateStr(new Date());
  const sevenDaysAgo = toDateStr(new Date(Date.now() - 6 * 86400000));

  // Summary cards state
  const [summary, setSummary] = useState({ todayRev: 0, todayCount: 0, weekRev: 0, weekCount: 0, monthRev: 0, monthCount: 0, pending: 0 });
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Chốt sổ hôm nay
  interface TodayBreakdown {
    cashRev: number; cashCount: number;
    transferRev: number; transferCount: number;
    dineInRev: number; dineInCount: number;
    onlineRev: number; onlineCount: number;
    pendingRev: number; pendingCount: number;
  }
  const [todayBreakdown, setTodayBreakdown] = useState<TodayBreakdown>({
    cashRev: 0, cashCount: 0, transferRev: 0, transferCount: 0,
    dineInRev: 0, dineInCount: 0, onlineRev: 0, onlineCount: 0,
    pendingRev: 0, pendingCount: 0,
  });

  // Chart state
  const [period, setPeriod] = useState<Period>('day');
  const [dateFrom, setDateFrom] = useState(sevenDaysAgo);
  const [dateTo, setDateTo] = useState(today);
  const [chartOrders, setChartOrders] = useState<Order[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [usingArchivedStats, setUsingArchivedStats] = useState(false);
  const [archivedChartData, setArchivedChartData] = useState<{ label: string; revenue: number; orders: number }[]>([]);

  // Recent orders
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  // Excel export
  const [exporting, setExporting] = useState(false);

  // Archive section
  const [showArchive, setShowArchive] = useState(false);
  const [archiveFrom, setArchiveFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); d.setDate(1);
    return toDateStr(d);
  });
  const [archiveTo, setArchiveTo] = useState(() => {
    const d = new Date(); d.setDate(0); // last day of prev month
    return toDateStr(d);
  });
  const [deleteAfterArchive, setDeleteAfterArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveResult, setArchiveResult] = useState<{ days: number; revenue: number; orders: number } | null>(null);
  const [archiveError, setArchiveError] = useState('');
  const [archivedMonths, setArchivedMonths] = useState<MonthSummary[]>([]);
  const [archiveListLoading, setArchiveListLoading] = useState(true);

  // ── Load summary on mount ─────────────────────────────────────────────────

  useEffect(() => {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(Date.now() - 6 * 86400000); weekStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    // Fetch from earlier of (monthStart, weekStart) to cover all cards in 1 query
    const summaryFrom = weekStart < monthStart ? weekStart : monthStart;

    Promise.all([
      getOrdersByDateRange(summaryFrom, now),
      getPendingCount(),
      getRecentOrders(10),
    ]).then(([orders, pending, recent]) => {
      const comp = orders.filter(isCompleted);
      const todayAll  = orders.filter((o) => new Date(o.createdAt) >= todayStart);
      const todayComp = todayAll.filter(isCompleted);
      const weekComp  = comp.filter((o) => new Date(o.createdAt) >= weekStart);
      const monthComp = comp.filter((o) => new Date(o.createdAt) >= monthStart);

      setSummary({
        todayRev:   todayComp.reduce((s, o) => s + o.totalPrice, 0),
        todayCount: todayComp.length,
        weekRev:    weekComp.reduce((s, o) => s + o.totalPrice, 0),
        weekCount:  weekComp.length,
        monthRev:   monthComp.reduce((s, o) => s + o.totalPrice, 0),
        monthCount: monthComp.length,
        pending,
      });

      const todayPending = todayAll.filter((o) => o.status === 'pending');
      const isOnlineOrder = (o: Order) => o.orderType === 'online' || o.tableId === 0;
      const todayCash     = todayComp.filter((o) => o.paymentMethod === 'cash');
      const todayTransfer = todayComp.filter((o) => o.paymentMethod === 'transfer');
      const todayDineIn   = todayComp.filter((o) => !isOnlineOrder(o));
      const todayOnline   = todayComp.filter((o) => isOnlineOrder(o));

      setTodayBreakdown({
        cashRev:      todayCash.reduce((s, o) => s + o.totalPrice, 0),
        cashCount:    todayCash.length,
        transferRev:  todayTransfer.reduce((s, o) => s + o.totalPrice, 0),
        transferCount:todayTransfer.length,
        dineInRev:    todayDineIn.reduce((s, o) => s + o.totalPrice, 0),
        dineInCount:  todayDineIn.length,
        onlineRev:    todayOnline.reduce((s, o) => s + o.totalPrice, 0),
        onlineCount:  todayOnline.length,
        pendingRev:   todayPending.reduce((s, o) => s + o.totalPrice, 0),
        pendingCount: todayPending.length,
      });

      setRecentOrders(recent);
      setSummaryLoading(false);
    });

    // Load archived months list
    getAllArchivedMonths()
      .then(setArchivedMonths)
      .finally(() => setArchiveListLoading(false));
  }, []);

  // ── Fetch chart data when period/dates change ─────────────────────────────

  const fetchChart = useCallback(async () => {
    setChartLoading(true);
    setUsingArchivedStats(false);
    try {
      const [from, to] = getPeriodRange(period, dateFrom, dateTo);
      const orders = await getOrdersByDateRange(from, to);
      const completed = orders.filter(isCompleted);

      // For "month" view: if raw orders are sparse (likely deleted after archiving),
      // supplement with dailyStats for months not covered
      if (period === 'month' && completed.length === 0) {
        const stats = await getDailyStatsByRange(from, to);
        if (stats.length > 0) {
          setArchivedChartData(buildMonthlyChartFromStats(stats));
          setUsingArchivedStats(true);
        }
      }
      setChartOrders(completed);
    } finally {
      setChartLoading(false);
    }
  }, [period, dateFrom, dateTo]);

  useEffect(() => { fetchChart(); }, [fetchChart]);

  // ── Chart data computation ────────────────────────────────────────────────

  const chartData = useMemo(() => {
    if (usingArchivedStats) return archivedChartData;

    if (period === 'hour') {
      const hours = Array.from({ length: 24 }, (_, i) => ({ label: `${i}h`, revenue: 0, orders: 0 }));
      const todayStr = new Date().toDateString();
      chartOrders.forEach((o) => {
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
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        return { label: d.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric' }), dateStr: d.toDateString(), revenue: 0, orders: 0 };
      });
      chartOrders.forEach((o) => {
        const slot = days.find((d) => d.dateStr === new Date(o.createdAt).toDateString());
        if (slot) { slot.revenue += o.totalPrice; slot.orders++; }
      });
      return days;
    }

    if (period === 'week') {
      const weeks = Array.from({ length: 4 }, (_, i) => {
        const start = new Date(); start.setDate(start.getDate() - (3 - i) * 7 - start.getDay()); start.setHours(0, 0, 0, 0);
        const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999);
        return { label: `${start.getDate()}/${start.getMonth() + 1}`, start: start.getTime(), end: end.getTime(), revenue: 0, orders: 0 };
      });
      chartOrders.forEach((o) => {
        const t = new Date(o.createdAt).getTime();
        const slot = weeks.find((w) => t >= w.start && t <= w.end);
        if (slot) { slot.revenue += o.totalPrice; slot.orders++; }
      });
      return weeks;
    }

    if (period === 'month') {
      const months = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(); d.setMonth(d.getMonth() - (11 - i));
        return { label: `T${d.getMonth() + 1}/${d.getFullYear()}`, month: d.getMonth(), year: d.getFullYear(), revenue: 0, orders: 0 };
      });
      chartOrders.forEach((o) => {
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
    chartOrders.forEach((o) => {
      const od = new Date(o.createdAt);
      if (od >= from && od <= to) {
        const slot = days.find((d) => d.dateStr === od.toDateString());
        if (slot) { slot.revenue += o.totalPrice; slot.orders++; }
      }
    });
    return days;
  }, [chartOrders, period, dateFrom, dateTo, usingArchivedStats, archivedChartData]);

  const chartTotal = chartData.reduce((s, d) => s + d.revenue, 0);
  const chartOrderCount = chartData.reduce((s, d) => s + d.orders, 0);
  const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 1);

  // ── Excel export (current period) ────────────────────────────────────────

  const handleExport = () => {
    if (chartOrders.length === 0 && !usingArchivedStats) return;
    setExporting(true);
    try {
      const periodLabels: Record<Period, string> = {
        hour: 'Hôm nay (theo giờ)', day: '7 ngày gần đây',
        week: '4 tuần gần đây', month: '12 tháng gần đây',
        custom: `${dateFrom} → ${dateTo}`,
      };

      const ws1 = XLSX.utils.aoa_to_sheet([
        ['Khoảng thời gian', periodLabels[period]],
        ['Tổng doanh thu', chartTotal],
        ['Tổng số đơn', chartOrderCount],
        [],
        ['Thời điểm', 'Doanh thu (đ)', 'Số đơn'],
        ...chartData.map((d) => [d.label, d.revenue, d.orders]),
        [],
        ['TỔNG', chartTotal, chartOrderCount],
      ]);
      ws1['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 10 }];

      const ws2 = XLSX.utils.aoa_to_sheet([
        ['Mã đơn', 'Loại', 'Tổng tiền (đ)', 'Thanh toán', 'Ngày giờ', 'Các món'],
        ...chartOrders.map((o) => [
          o.id.slice(-8).toUpperCase(),
          o.orderType === 'online' || o.tableId === 0 ? 'Online' : `Bàn ${o.tableId}`,
          o.totalPrice,
          o.paymentMethod === 'cash' ? 'Tiền mặt' : 'Chuyển khoản',
          new Date(o.createdAt).toLocaleString('vi-VN'),
          o.items.map((i) => `${i.quantity}x ${i.name}`).join(', '),
        ]),
      ]);
      ws2['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 14 }, { wch: 20 }, { wch: 50 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, 'Doanh thu');
      if (chartOrders.length > 0) XLSX.utils.book_append_sheet(wb, ws2, 'Chi tiết đơn');
      XLSX.writeFile(wb, `hayla_doanhthu_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  // ── Archive handler ───────────────────────────────────────────────────────

  const handleArchive = async () => {
    setArchiveError('');
    setArchiveResult(null);

    if (!archiveFrom || !archiveTo || archiveFrom > archiveTo) {
      setArchiveError('Khoảng ngày không hợp lệ');
      return;
    }
    if (!confirm(`Lưu thống kê từ ${archiveFrom} đến ${archiveTo}?${deleteAfterArchive ? '\n⚠️ Đơn hàng gốc sẽ bị XÓA sau khi lưu!' : ''}`)) return;

    setArchiving(true);
    try {
      const from = new Date(archiveFrom); from.setHours(0, 0, 0, 0);
      const to = new Date(archiveTo); to.setHours(23, 59, 59, 999);

      const orders = await getOrdersByDateRange(from, to);
      const result = await archiveOrdersToStats(orders);

      if (deleteAfterArchive && result.orderIds.length > 0) {
        await deleteOrdersBatch(result.orderIds);
      }

      setArchiveResult({ days: result.archivedDays, revenue: result.revenue, orders: result.totalOrders });

      // Refresh archived months list
      getAllArchivedMonths().then(setArchivedMonths);
    } catch (e) {
      setArchiveError(e instanceof Error ? e.message : 'Lỗi không xác định');
    } finally {
      setArchiving(false);
    }
  };

  // ── Excel export lịch sử (từ dailyStats) ─────────────────────────────────

  const handleExportHistory = async () => {
    if (archivedMonths.length === 0) return;
    setExporting(true);
    try {
      const rows = [
        ['Tháng', 'Doanh thu (đ)', 'Số đơn', 'Tiền mặt (đ)', 'Chuyển khoản (đ)', 'Đơn online'],
        ...archivedMonths.map((m) => [
          m.yearMonth,
          m.revenue,
          m.orders,
          m.cashRevenue,
          m.transferRevenue,
          m.onlineOrders,
        ]),
        [],
        ['TỔNG', archivedMonths.reduce((s, m) => s + m.revenue, 0), archivedMonths.reduce((s, m) => s + m.orders, 0)],
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 10 }, { wch: 18 }, { wch: 20 }, { wch: 12 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Lịch sử tháng');
      XLSX.writeFile(wb, `hayla_lichsu_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  // ── In phiếu chốt sổ ─────────────────────────────────────────────────────

  const handlePrint = () => {
    const dateLabel = new Date().toLocaleDateString('vi-VN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const totalRev  = todayBreakdown.cashRev + todayBreakdown.transferRev;
    const totalComp = todayBreakdown.cashCount + todayBreakdown.transferCount;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Chốt sổ ${new Date().toLocaleDateString('vi-VN')}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Courier New', monospace; font-size: 13px; padding: 24px; max-width: 320px; margin: 0 auto; color: #111; }
  h1 { font-size: 17px; text-align: center; letter-spacing: 1px; margin-bottom: 4px; }
  .sub { text-align: center; font-size: 11px; color: #555; margin-bottom: 2px; }
  .date { text-align: center; font-size: 12px; color: #333; margin-bottom: 14px; }
  .dash { border: none; border-top: 1px dashed #999; margin: 10px 0; }
  .row { display: flex; justify-content: space-between; padding: 3px 0; }
  .row .label { color: #444; }
  .row .val { font-weight: bold; }
  .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 4px; margin-top: 6px; }
  .total-row { display: flex; justify-content: space-between; font-size: 15px; font-weight: bold; padding: 6px 0; }
  .pending { color: #c04a00; }
  .footer { text-align: center; font-size: 11px; color: #888; margin-top: 14px; }
  @media print { body { padding: 8px; } }
</style></head><body>
<h1>HAY LÀ CÀ PHÊ</h1>
<p class="sub">Phiếu chốt sổ cuối ngày</p>
<p class="date">${dateLabel}</p>
<hr class="dash"/>

<p class="section-title">Theo hình thức thanh toán</p>
<div class="row"><span class="label">💵 Tiền mặt (${todayBreakdown.cashCount} đơn)</span><span class="val">${todayBreakdown.cashRev.toLocaleString('vi-VN')}đ</span></div>
<div class="row"><span class="label">💳 Chuyển khoản (${todayBreakdown.transferCount} đơn)</span><span class="val">${todayBreakdown.transferRev.toLocaleString('vi-VN')}đ</span></div>

<hr class="dash"/>

<p class="section-title">Theo kênh bán</p>
<div class="row"><span class="label">🍽️ Tại bàn (${todayBreakdown.dineInCount} đơn)</span><span class="val">${todayBreakdown.dineInRev.toLocaleString('vi-VN')}đ</span></div>
<div class="row"><span class="label">🌐 Đặt online (${todayBreakdown.onlineCount} đơn)</span><span class="val">${todayBreakdown.onlineRev.toLocaleString('vi-VN')}đ</span></div>

<hr class="dash"/>

<div class="total-row"><span>TỔNG THU</span><span>${totalRev.toLocaleString('vi-VN')}đ</span></div>
<div class="row"><span class="label">Tổng số đơn đã thanh toán</span><span class="val">${totalComp} đơn</span></div>

${todayBreakdown.pendingCount > 0 ? `
<hr class="dash"/>
<div class="row pending"><span class="label">⏳ Chờ thanh toán (${todayBreakdown.pendingCount} đơn)</span><span class="val">${todayBreakdown.pendingRev.toLocaleString('vi-VN')}đ</span></div>
` : ''}

<hr class="dash"/>
<p class="footer">In lúc ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
</body></html>`;

    const w = window.open('', '_blank', 'width=420,height=600');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.onload = () => { w.print(); };
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const summaryCards = [
    { label: 'Hôm nay', value: summary.todayRev.toLocaleString() + 'đ', sub: `${summary.todayCount} đơn`, icon: TrendingUp, bg: 'bg-orange-50', color: 'text-orange-500' },
    { label: '7 ngày qua', value: summary.weekRev.toLocaleString() + 'đ', sub: `${summary.weekCount} đơn`, icon: ShoppingBag, bg: 'bg-blue-50', color: 'text-blue-500' },
    { label: 'Tháng này', value: summary.monthRev.toLocaleString() + 'đ', sub: `${summary.monthCount} đơn`, icon: Calendar, bg: 'bg-green-50', color: 'text-green-500' },
    { label: 'Chờ thanh toán', value: String(summary.pending), sub: 'đơn đang mở', icon: Clock, bg: 'bg-yellow-50', color: 'text-yellow-500' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.bg}`}>
              <s.icon size={20} className={s.color} />
            </div>
            {summaryLoading
              ? <div className="h-7 w-28 bg-gray-100 rounded animate-pulse mb-1" />
              : <p className="text-xl font-bold text-gray-800 truncate">{s.value}</p>
            }
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            <p className="text-xs text-gray-500 mt-1">{summaryLoading ? '...' : s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Chốt sổ hôm nay ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50">
          <div>
            <h2 className="font-bold text-gray-700">Chốt sổ hôm nay</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={handlePrint}
            disabled={summaryLoading}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-bold bg-gray-800 text-white hover:bg-gray-700 transition disabled:opacity-40"
          >
            <Printer size={13} /> In phiếu
          </button>
        </div>

        {summaryLoading ? (
          <div className="px-5 py-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">

            {/* ── Theo thanh toán ── */}
            <div className="px-5 pt-3 pb-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Theo hình thức thanh toán</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-green-50 rounded-xl px-3.5 py-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Banknote size={14} className="text-green-600" />
                    <span className="text-xs font-bold text-green-700">Tiền mặt</span>
                  </div>
                  <p className="text-base font-bold text-green-700">{todayBreakdown.cashRev.toLocaleString()}đ</p>
                  <p className="text-[11px] text-green-500 mt-0.5">{todayBreakdown.cashCount} đơn</p>
                </div>
                <div className="bg-blue-50 rounded-xl px-3.5 py-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CreditCard size={14} className="text-blue-500" />
                    <span className="text-xs font-bold text-blue-600">Chuyển khoản</span>
                  </div>
                  <p className="text-base font-bold text-blue-600">{todayBreakdown.transferRev.toLocaleString()}đ</p>
                  <p className="text-[11px] text-blue-400 mt-0.5">{todayBreakdown.transferCount} đơn</p>
                </div>
              </div>
            </div>

            {/* ── Theo kênh bán ── */}
            <div className="px-5 pt-3 pb-1">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Theo kênh bán</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-orange-50 rounded-xl px-3.5 py-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">🍽️</span>
                    <span className="text-xs font-bold text-orange-700">Tại bàn</span>
                  </div>
                  <p className="text-base font-bold text-orange-700">{todayBreakdown.dineInRev.toLocaleString()}đ</p>
                  <p className="text-[11px] text-orange-500 mt-0.5">{todayBreakdown.dineInCount} đơn</p>
                </div>
                <div className="bg-purple-50 rounded-xl px-3.5 py-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">🌐</span>
                    <span className="text-xs font-bold text-purple-700">Đặt online</span>
                  </div>
                  <p className="text-base font-bold text-purple-700">{todayBreakdown.onlineRev.toLocaleString()}đ</p>
                  <p className="text-[11px] text-purple-400 mt-0.5">{todayBreakdown.onlineCount} đơn</p>
                </div>
              </div>
            </div>

            {/* ── Tổng ── */}
            <div className="px-5 py-4 bg-gray-800 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">Tổng thu hôm nay</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {todayBreakdown.cashCount + todayBreakdown.transferCount} đơn đã thanh toán
                </p>
              </div>
              <p className="text-xl font-bold text-orange-400">
                {(todayBreakdown.cashRev + todayBreakdown.transferRev).toLocaleString()}đ
              </p>
            </div>

            {/* ── Chờ thanh toán ── */}
            {todayBreakdown.pendingCount > 0 && (
              <div className="px-5 py-3 flex items-center justify-between bg-amber-50">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-amber-400" />
                  <span className="text-xs text-amber-700 font-medium">Chờ thanh toán ({todayBreakdown.pendingCount} đơn)</span>
                </div>
                <span className="text-xs font-bold text-amber-600">{todayBreakdown.pendingRev.toLocaleString()}đ</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Revenue chart ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-bold text-gray-700">Doanh thu</h2>
            {chartLoading
              ? <div className="h-8 w-32 bg-gray-100 rounded animate-pulse mt-1" />
              : <>
                  <p className="text-2xl font-bold text-orange-500 mt-0.5">{chartTotal.toLocaleString()}đ</p>
                  <p className="text-xs text-gray-400">{chartOrderCount} đơn hoàn thành{usingArchivedStats && <span className="ml-1.5 text-purple-500 font-bold">· dữ liệu lưu trữ</span>}</p>
                </>
            }
          </div>

          <div className="flex flex-wrap items-center gap-2">
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

            <button
              onClick={handleExport}
              disabled={exporting || (chartData.length === 0)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm shadow-emerald-200 transition disabled:opacity-50"
            >
              <Download size={13} />
              {exporting ? 'Đang xuất...' : 'Xuất Excel'}
            </button>
          </div>
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-orange-50 rounded-xl">
            <CalendarDays size={15} className="text-orange-400 shrink-0" />
            <input type="date" value={dateFrom} max={dateTo}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-sm bg-transparent outline-none text-gray-700 cursor-pointer" />
            <span className="text-gray-300">→</span>
            <input type="date" value={dateTo} min={dateFrom} max={today}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-sm bg-transparent outline-none text-gray-700 cursor-pointer" />
          </div>
        )}

        {chartLoading ? (
          <div className="h-[200px] flex items-center justify-center">
            <Loader2 size={24} className="text-orange-400 animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="adminRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                interval={period === 'hour' ? 3 : period === 'custom' && chartData.length > 14 ? Math.ceil(chartData.length / 7) - 1 : 0} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => fmtMoney(v)} domain={[0, maxRevenue * 1.2]} width={56} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#f97316', strokeWidth: 1, strokeDasharray: '4 2' }} />
              <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2}
                fill="url(#adminRevenueGrad)" dot={false} activeDot={{ r: 4, fill: '#f97316', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Archive section ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => setShowArchive(!showArchive)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center">
              <Archive size={16} className="text-purple-500" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-700">Lưu trữ & Xuất lịch sử</p>
              <p className="text-xs text-gray-400">
                {archiveListLoading ? '...' : `${archivedMonths.length} tháng đã lưu`}
              </p>
            </div>
          </div>
          {showArchive ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>

        {showArchive && (
          <div className="border-t border-gray-100 divide-y divide-gray-50">
            {/* Archive action */}
            <div className="px-5 py-4 space-y-3">
              <p className="text-xs text-gray-500 leading-relaxed">
                Gom đơn hàng theo ngày thành dữ liệu thống kê nhỏ gọn. Sau đó có thể xóa đơn gốc để giảm dung lượng Firestore.
              </p>

              <div className="flex items-center gap-2 flex-wrap">
                <CalendarDays size={14} className="text-gray-400 shrink-0" />
                <input type="date" value={archiveFrom} max={archiveTo}
                  onChange={(e) => setArchiveFrom(e.target.value)}
                  className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:border-purple-300 bg-gray-50 cursor-pointer" />
                <span className="text-gray-300 text-sm">→</span>
                <input type="date" value={archiveTo} min={archiveFrom}
                  onChange={(e) => setArchiveTo(e.target.value)}
                  className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:border-purple-300 bg-gray-50 cursor-pointer" />
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={deleteAfterArchive}
                  onChange={(e) => setDeleteAfterArchive(e.target.checked)}
                  className="w-4 h-4 accent-red-500 rounded" />
                <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                  <Trash2 size={12} /> Xóa đơn hàng gốc sau khi lưu thống kê
                </span>
              </label>

              {deleteAfterArchive && (
                <div className="flex items-start gap-2 bg-red-50 rounded-xl px-3 py-2 text-xs text-red-600">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  Đơn hàng gốc sẽ bị xóa vĩnh viễn. Dữ liệu chi tiết từng đơn sẽ không thể khôi phục. Chỉ giữ lại thống kê tổng hợp theo ngày.
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={handleArchive}
                  disabled={archiving}
                  className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition disabled:opacity-60"
                >
                  {archiving ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                  {archiving ? 'Đang lưu...' : 'Lưu thống kê'}
                </button>
              </div>

              {archiveError && (
                <p className="text-xs text-red-500 flex items-center gap-1.5"><AlertCircle size={12} />{archiveError}</p>
              )}
              {archiveResult && (
                <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2.5 text-xs text-green-700 space-y-0.5">
                  <p className="font-bold flex items-center gap-1"><Check size={13} /> Lưu thành công!</p>
                  <p>{archiveResult.days} ngày · {archiveResult.orders} đơn · {archiveResult.revenue.toLocaleString()}đ</p>
                </div>
              )}
            </div>

            {/* Archived months list */}
            {archivedMonths.length > 0 && (
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Các tháng đã lưu</p>
                  <button
                    onClick={handleExportHistory}
                    disabled={exporting}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition disabled:opacity-50"
                  >
                    <Download size={12} />
                    Xuất Excel lịch sử
                  </button>
                </div>
                <div className="space-y-1.5">
                  {archivedMonths.map((m) => (
                    <div key={m.yearMonth} className="flex items-center justify-between bg-gray-50 rounded-xl px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-purple-500 font-mono w-16">{m.yearMonth}</span>
                        <span className="text-xs text-gray-400">{m.orders} đơn · {m.days} ngày</span>
                      </div>
                      <span className="text-sm font-bold text-gray-700">{m.revenue.toLocaleString()}đ</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {archivedMonths.length === 0 && !archiveListLoading && (
              <p className="px-5 py-4 text-xs text-gray-400">Chưa có tháng nào được lưu trữ.</p>
            )}
          </div>
        )}
      </div>

      {/* ── Recent orders ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-700">Đơn hàng gần đây</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {recentOrders.length === 0 && !summaryLoading && (
            <p className="text-center text-gray-400 text-sm py-10">Chưa có đơn hàng nào</p>
          )}
          {summaryLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-3.5 flex items-center justify-between animate-pulse">
                  <div className="space-y-1.5"><div className="h-4 w-20 bg-gray-100 rounded" /><div className="h-3 w-28 bg-gray-100 rounded" /></div>
                  <div className="h-5 w-20 bg-gray-100 rounded" />
                </div>
              ))
            : recentOrders.map((order) => (
                <div key={order.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition">
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {order.orderType === 'online' || order.tableId === 0 ? '🌐 Online' : `Bàn ${order.tableId}`}
                      {order.customerInfo && <span className="text-gray-400 font-normal text-xs ml-1.5">· {order.customerInfo.name}</span>}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {order.items.length} món ·{' '}
                      {new Date(order.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-orange-600">{order.totalPrice.toLocaleString()}đ</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${order.status === 'pending' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                      {order.status === 'pending' ? 'Chờ TT' : 'Xong'}
                    </span>
                  </div>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  );
}
