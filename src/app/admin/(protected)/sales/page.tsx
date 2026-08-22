'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getOrdersByDateRange } from '@/app/lib/firebaseOrders';
import type { Order } from '@/types/pos.types';
import { RefreshCw, TrendingUp, Package, Download, CalendarDays, Search } from 'lucide-react';
import * as XLSX from 'xlsx';

// ── Types ─────────────────────────────────────────────────────────

interface ItemStat {
  name: string;
  category: string;
  qty: number;
  revenue: number;
}

type Period = 'today' | '7d' | '30d' | 'custom';

// ── Helpers ───────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().slice(0, 10); }

function isCompleted(o: Order) {
  return o.status === 'completed' || o.status === 'Complete';
}

function getPeriodDates(period: Period, customFrom: string, customTo: string): [Date, Date] {
  const now = new Date();
  const eod = new Date(now); eod.setHours(23, 59, 59, 999);

  if (period === 'today') {
    const from = new Date(now); from.setHours(0, 0, 0, 0);
    return [from, eod];
  }
  if (period === '7d') {
    const from = new Date(Date.now() - 6 * 86400000); from.setHours(0, 0, 0, 0);
    return [from, eod];
  }
  if (period === '30d') {
    const from = new Date(Date.now() - 29 * 86400000); from.setHours(0, 0, 0, 0);
    return [from, eod];
  }
  const from = new Date(customFrom); from.setHours(0, 0, 0, 0);
  const to = new Date(customTo); to.setHours(23, 59, 59, 999);
  return [from, to];
}

function fmtMoney(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toString();
}

// ── Bar sparkline ─────────────────────────────────────────────────

function BarFill({ pct, color = 'bg-orange-400' }: { pct: number; color?: string }) {
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────

export default function SalesPage() {
  const today = todayStr();

  const [orders, setOrders]     = useState<Order[]>([]);
  const [loading, setLoading]   = useState(true);

  const [period, setPeriod]         = useState<Period>('7d');
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10);
  });
  const [customTo, setCustomTo] = useState(today);

  const [search, setSearch]           = useState('');
  const [sortBy, setSortBy]           = useState<'qty' | 'revenue'>('qty');
  const [groupByCategory, setGroup]   = useState(false);
  const [exporting, setExporting]     = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [from, to] = getPeriodDates(period, customFrom, customTo);
      const data = await getOrdersByDateRange(from, to);
      setOrders(data.filter(isCompleted));
    } finally {
      setLoading(false);
    }
  }, [period, customFrom, customTo]);

  useEffect(() => { load(); }, [load]);

  // ── Aggregate ────────────────────────────────────────────────────

  const stats: ItemStat[] = useMemo(() => {
    const map = new Map<string, ItemStat>();

    for (const order of orders) {
      for (const item of order.items) {
        // Key = base name only (no size/topping variants — group them)
        const key = item.name;
        const existing = map.get(key);
        if (existing) {
          existing.qty     += item.quantity;
          existing.revenue += item.price * item.quantity;
        } else {
          map.set(key, {
            name:     item.name,
            category: item.category ?? 'Khác',
            qty:      item.quantity,
            revenue:  item.price * item.quantity,
          });
        }
      }
    }

    return Array.from(map.values());
  }, [orders]);

  const totalQty     = stats.reduce((s, i) => s + i.qty, 0);
  const totalRevenue = stats.reduce((s, i) => s + i.revenue, 0);

  // Categories for filter
  const categories = useMemo(
    () => ['Tất cả', ...Array.from(new Set(stats.map((s) => s.category))).sort()],
    [stats]
  );
  const [catFilter, setCatFilter] = useState('Tất cả');

  const filtered = useMemo(() => {
    let rows = [...stats];
    if (catFilter !== 'Tất cả') rows = rows.filter((r) => r.category === catFilter);
    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter((r) => r.name.toLowerCase().includes(s));
    }
    rows.sort((a, b) => sortBy === 'qty' ? b.qty - a.qty : b.revenue - a.revenue);
    return rows;
  }, [stats, catFilter, search, sortBy]);

  const maxQty     = Math.max(...filtered.map((r) => r.qty), 1);
  const maxRevenue = Math.max(...filtered.map((r) => r.revenue), 1);

  // ── Group by category view ────────────────────────────────────────

  const grouped: Record<string, ItemStat[]> = useMemo(() => {
    if (!groupByCategory) return {};
    const g: Record<string, ItemStat[]> = {};
    for (const row of filtered) {
      if (!g[row.category]) g[row.category] = [];
      g[row.category].push(row);
    }
    return g;
  }, [filtered, groupByCategory]);

  // ── Excel export ──────────────────────────────────────────────────

  const handleExport = () => {
    if (filtered.length === 0) return;
    setExporting(true);
    try {
      const periodLabel: Record<Period, string> = {
        today: 'Hôm nay', '7d': '7 ngày gần đây', '30d': '30 ngày gần đây',
        custom: `${customFrom} → ${customTo}`,
      };

      const rows = [
        ['Tên món', 'Danh mục', 'Số lượng', 'Doanh thu (đ)'],
        ...filtered.map((r) => [r.name, r.category, r.qty, r.revenue]),
        [],
        ['TỔNG', '', totalQty, totalRevenue],
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 32 }, { wch: 18 }, { wch: 12 }, { wch: 16 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Sản phẩm (${periodLabel[period]})`);
      XLSX.writeFile(wb, `hayla_sanpham_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────

  const PERIOD_OPTS: { key: Period; label: string }[] = [
    { key: 'today', label: 'Hôm nay' },
    { key: '7d',    label: '7 ngày' },
    { key: '30d',   label: '30 ngày' },
    { key: 'custom', label: 'Tuỳ chỉnh' },
  ];

  const renderTable = (rows: ItemStat[]) => (
    <div className="divide-y divide-gray-50">
      {rows.map((row, i) => (
        <div key={row.name} className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition">
          {/* Rank */}
          <span className={`shrink-0 w-6 text-center text-xs font-bold ${
            i === 0 ? 'text-amber-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-700' : 'text-gray-300'
          }`}>
            {i < 3 ? ['🥇','🥈','🥉'][i] : i + 1}
          </span>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{row.name}</p>
            <div className="mt-1 flex items-center gap-3">
              <BarFill pct={(row.qty / maxQty) * 100} color="bg-orange-400" />
              <BarFill pct={(row.revenue / maxRevenue) * 100} color="bg-blue-300" />
            </div>
          </div>

          {/* Stats */}
          <div className="shrink-0 text-right space-y-0.5">
            <p className="text-sm font-bold text-gray-800">{row.qty.toLocaleString()} món</p>
            <p className="text-xs text-blue-500 font-medium">{fmtMoney(row.revenue)}đ</p>
            <p className="text-[10px] text-gray-400">{totalRevenue > 0 ? `${((row.revenue / totalRevenue) * 100).toFixed(1)}%` : '—'}</p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sản phẩm bán chạy</h1>
          <p className="text-sm text-gray-500 mt-1">Số lượng và doanh thu theo từng món</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm bg-gray-100 text-gray-600 px-3 py-2 rounded-xl font-bold hover:bg-gray-200 transition"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || filtered.length === 0}
            className="flex items-center gap-1.5 text-sm bg-emerald-500 text-white px-3 py-2 rounded-xl font-bold hover:bg-emerald-600 transition disabled:opacity-50"
          >
            <Download size={14} />
            Excel
          </button>
        </div>
      </div>

      {/* Period filter */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {PERIOD_OPTS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition ${
                period === key ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2 pt-1">
            <CalendarDays size={14} className="text-gray-400 shrink-0" />
            <input
              type="date"
              value={customFrom}
              max={customTo}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:border-orange-300 bg-gray-50"
            />
            <span className="text-gray-300 text-sm">→</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              max={today}
              onChange={(e) => setCustomTo(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:border-orange-300 bg-gray-50"
            />
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-orange-50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Package size={15} className="text-orange-500" />
            <span className="text-xs font-bold text-orange-700">Món đã bán</span>
          </div>
          <p className="text-2xl font-bold text-orange-700">{loading ? '—' : totalQty.toLocaleString()}</p>
          <p className="text-[11px] text-orange-400 mt-0.5">{filtered.length} tên món</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={15} className="text-blue-500" />
            <span className="text-xs font-bold text-blue-700">Doanh thu</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{loading ? '—' : fmtMoney(totalRevenue)}đ</p>
          <p className="text-[11px] text-blue-400 mt-0.5">{orders.length} đơn hoàn thành</p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">📊</span>
            <span className="text-xs font-bold text-gray-600">TB / đơn</span>
          </div>
          <p className="text-2xl font-bold text-gray-700">
            {loading || orders.length === 0 ? '—' : fmtMoney(Math.round(totalRevenue / orders.length))}đ
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {orders.length > 0 ? `${(totalQty / orders.length).toFixed(1)} món/đơn` : '—'}
          </p>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {/* Search */}
        <div className="relative flex-1 min-w-40">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên món..."
            className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-orange-300 transition"
          />
        </div>

        {/* Category filter */}
        {categories.length > 2 && (
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none bg-white focus:border-orange-300"
          >
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        )}

        {/* Sort */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200">
          <button
            onClick={() => setSortBy('qty')}
            className={`text-xs px-3 py-2 font-bold transition ${sortBy === 'qty' ? 'bg-orange-500 text-white' : 'bg-white text-gray-500'}`}
          >
            Số lượng
          </button>
          <button
            onClick={() => setSortBy('revenue')}
            className={`text-xs px-3 py-2 font-bold transition ${sortBy === 'revenue' ? 'bg-orange-500 text-white' : 'bg-white text-gray-500'}`}
          >
            Doanh thu
          </button>
        </div>

        {/* Group toggle */}
        <button
          onClick={() => setGroup(!groupByCategory)}
          className={`text-xs px-3 py-2 rounded-xl font-bold border transition ${
            groupByCategory ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200'
          }`}
        >
          Nhóm danh mục
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-gray-400 mb-2 px-1">
        <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-orange-400 inline-block" /> Số lượng</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-full bg-blue-300 inline-block" /> Doanh thu</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-7 h-7 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">📦</p>
            <p className="text-sm">Không có dữ liệu bán hàng trong khoảng thời gian này</p>
          </div>
        ) : groupByCategory ? (
          <div>
            {Object.entries(grouped)
              .sort(([, a], [, b]) => b.reduce((s, r) => s + r[sortBy], 0) - a.reduce((s, r) => s + r[sortBy], 0))
              .map(([cat, rows]) => (
                <div key={cat}>
                  <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{cat}</span>
                    <span className="text-xs text-gray-400">
                      {rows.reduce((s, r) => s + r.qty, 0)} món ·{' '}
                      {fmtMoney(rows.reduce((s, r) => s + r.revenue, 0))}đ
                    </span>
                  </div>
                  {renderTable(rows)}
                </div>
              ))
            }
          </div>
        ) : (
          renderTable(filtered)
        )}

        {/* Footer total */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500">
              {filtered.length} tên món{catFilter !== 'Tất cả' ? ` · ${catFilter}` : ''}
            </span>
            <div className="text-right">
              <span className="text-sm font-bold text-gray-800">{totalQty.toLocaleString()} món</span>
              <span className="text-sm text-blue-500 font-bold ml-4">{totalRevenue.toLocaleString()}đ</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
