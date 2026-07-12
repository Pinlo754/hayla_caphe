/**
 * Daily/Monthly Stats — lưu dữ liệu tổng hợp theo ngày vào collection `dailyStats`.
 *
 * Mục đích:
 *   - Sau khi dữ liệu đơn hàng tích lũy lớn, "archive" lại thành thống kê ngày nhỏ gọn.
 *   - Sau đó có thể xóa đơn hàng gốc để giảm Firestore reads.
 *   - Dữ liệu lưu trữ dùng để xem lịch sử, không cần truy vấn raw orders nữa.
 *
 * Firestore collection: dailyStats
 * Document ID: "YYYY-MM-DD"
 */

import { db } from './firebase';
import {
  collection,
  doc,
  getDocs,
  writeBatch,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import type { Order } from '@/types/pos.types';

export interface DailyStat {
  date: string;            // "YYYY-MM-DD"
  revenue: number;         // tổng doanh thu (completed orders)
  orders: number;          // số đơn hoàn thành
  cashRevenue: number;
  transferRevenue: number;
  onlineOrders: number;    // đơn đặt online
  archivedAt: string;      // ISO timestamp khi được archive
}

export interface MonthSummary {
  yearMonth: string;       // "YYYY-MM"
  revenue: number;
  orders: number;
  cashRevenue: number;
  transferRevenue: number;
  onlineOrders: number;
  days: number;            // số ngày trong tháng có dữ liệu
}

const COL = 'dailyStats';

function isCompleted(o: Order): boolean {
  return o.status === 'completed' || o.status === 'Complete';
}

/** Lấy daily stats theo khoảng ngày */
export async function getDailyStatsByRange(from: Date, to: Date): Promise<DailyStat[]> {
  const fromStr = from.toISOString().slice(0, 10);
  const toStr = to.toISOString().slice(0, 10);
  const q = query(
    collection(db, COL),
    where('date', '>=', fromStr),
    where('date', '<=', toStr),
    orderBy('date', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as DailyStat);
}

/** Lấy tất cả tháng đã archive (gom từ daily docs) */
export async function getAllArchivedMonths(): Promise<MonthSummary[]> {
  const snap = await getDocs(collection(db, COL));
  const monthly: Record<string, MonthSummary> = {};

  snap.docs.forEach((d) => {
    const stat = d.data() as DailyStat;
    const ym = stat.date.slice(0, 7);
    if (!monthly[ym]) {
      monthly[ym] = { yearMonth: ym, revenue: 0, orders: 0, cashRevenue: 0, transferRevenue: 0, onlineOrders: 0, days: 0 };
    }
    monthly[ym].revenue += stat.revenue;
    monthly[ym].orders += stat.orders;
    monthly[ym].cashRevenue += stat.cashRevenue;
    monthly[ym].transferRevenue += stat.transferRevenue;
    monthly[ym].onlineOrders += stat.onlineOrders;
    monthly[ym].days++;
  });

  return Object.values(monthly).sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
}

/**
 * Archive orders thành daily stats.
 * Trả về: số ngày được archive, tổng doanh thu, tổng đơn, và IDs đơn đã archive (để xóa nếu cần).
 */
export async function archiveOrdersToStats(orders: Order[]): Promise<{
  archivedDays: number;
  revenue: number;
  totalOrders: number;
  orderIds: string[];
}> {
  const completed = orders.filter(isCompleted);
  if (completed.length === 0) {
    return { archivedDays: 0, revenue: 0, totalOrders: 0, orderIds: [] };
  }

  // Gom theo ngày
  const byDay: Record<string, Order[]> = {};
  for (const o of completed) {
    const day = o.createdAt.slice(0, 10); // "YYYY-MM-DD"
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(o);
  }

  const now = new Date().toISOString();
  const batch = writeBatch(db);

  let totalRevenue = 0;
  let totalOrders = 0;

  for (const [date, dayOrders] of Object.entries(byDay)) {
    const revenue = dayOrders.reduce((s, o) => s + o.totalPrice, 0);
    const cashRevenue = dayOrders
      .filter((o) => o.paymentMethod === 'cash')
      .reduce((s, o) => s + o.totalPrice, 0);

    const stat: DailyStat = {
      date,
      revenue,
      orders: dayOrders.length,
      cashRevenue,
      transferRevenue: revenue - cashRevenue,
      onlineOrders: dayOrders.filter((o) => o.orderType === 'online' || o.tableId === 0).length,
      archivedAt: now,
    };

    // merge: nếu ngày đó đã từng archive, cộng dồn vào
    batch.set(doc(db, COL, date), stat, { merge: false });
    totalRevenue += revenue;
    totalOrders += dayOrders.length;
  }

  await batch.commit();

  return {
    archivedDays: Object.keys(byDay).length,
    revenue: totalRevenue,
    totalOrders,
    orderIds: completed.map((o) => o.id),
  };
}

/** Xây chartData từ dailyStats (dùng khi raw orders đã bị xóa) */
export function buildMonthlyChartFromStats(stats: DailyStat[]): {
  label: string;
  revenue: number;
  orders: number;
}[] {
  const monthly: Record<string, { revenue: number; orders: number }> = {};

  stats.forEach((s) => {
    const ym = s.date.slice(0, 7);
    if (!monthly[ym]) monthly[ym] = { revenue: 0, orders: 0 };
    monthly[ym].revenue += s.revenue;
    monthly[ym].orders += s.orders;
  });

  return Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ym, data]) => {
      const [year, month] = ym.split('-');
      return { label: `T${parseInt(month)}/${year}`, revenue: data.revenue, orders: data.orders };
    });
}
