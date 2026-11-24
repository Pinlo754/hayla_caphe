'use client';

import { useEffect, useState, useCallback } from 'react';
import { getOrdersByDateRange } from '@/app/lib/firebaseOrders';
import type { Order } from '@/types/pos.types';
import {
  Banknote, CreditCard, RefreshCw, Printer,
  Loader2, UtensilsCrossed, Globe, Clock,
} from 'lucide-react';

function isCompleted(o: Order) { return o.status === 'completed' || o.status === 'Complete'; }
function isOnline(o: Order)    { return o.orderType === 'online' || o.tableId === 0; }

interface Breakdown {
  cashRev: number; cashCount: number;
  transferRev: number; transferCount: number;
  dineInRev: number; dineInCount: number;
  onlineRev: number; onlineCount: number;
  pendingRev: number; pendingCount: number;
}

const EMPTY: Breakdown = {
  cashRev: 0, cashCount: 0, transferRev: 0, transferCount: 0,
  dineInRev: 0, dineInCount: 0, onlineRev: 0, onlineCount: 0,
  pendingRev: 0, pendingCount: 0,
};

export default function StatsTab() {
  const [data, setData] = useState<Breakdown>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const now   = new Date();
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      const orders = await getOrdersByDateRange(start, now);

      const comp    = orders.filter(isCompleted);
      const pending = orders.filter((o) => o.status === 'pending');

      setData({
        cashRev:      comp.filter((o) => o.paymentMethod === 'cash').reduce((s, o) => s + o.totalPrice, 0),
        cashCount:    comp.filter((o) => o.paymentMethod === 'cash').length,
        transferRev:  comp.filter((o) => o.paymentMethod === 'transfer').reduce((s, o) => s + o.totalPrice, 0),
        transferCount:comp.filter((o) => o.paymentMethod === 'transfer').length,
        dineInRev:    comp.filter((o) => !isOnline(o)).reduce((s, o) => s + o.totalPrice, 0),
        dineInCount:  comp.filter((o) => !isOnline(o)).length,
        onlineRev:    comp.filter(isOnline).reduce((s, o) => s + o.totalPrice, 0),
        onlineCount:  comp.filter(isOnline).length,
        pendingRev:   pending.reduce((s, o) => s + o.totalPrice, 0),
        pendingCount: pending.length,
      });
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalRev  = data.cashRev + data.transferRev;
  const totalComp = data.cashCount + data.transferCount;

  const handlePrint = () => {
    const dateLabel = new Date().toLocaleDateString('vi-VN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    const timeLabel = lastUpdated?.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) ?? '';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Chốt sổ ${new Date().toLocaleDateString('vi-VN')}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Courier New', monospace; font-size: 13px; padding: 20px; max-width: 320px; margin: 0 auto; color: #111; }
  h1  { font-size: 16px; text-align: center; letter-spacing: 1px; margin-bottom: 3px; }
  .sub { text-align: center; font-size: 11px; color: #555; margin-bottom: 2px; }
  .date { text-align: center; font-size: 11px; color: #444; margin-bottom: 12px; }
  .dash { border: none; border-top: 1px dashed #999; margin: 9px 0; }
  .section { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 5px; }
  .row  { display: flex; justify-content: space-between; padding: 2px 0; }
  .val  { font-weight: bold; }
  .total-row { display: flex; justify-content: space-between; font-size: 15px; font-weight: bold; padding: 5px 0; }
  .pending { color: #b45309; }
  .footer { text-align: center; font-size: 10px; color: #aaa; margin-top: 12px; }
  @media print { body { padding: 4px; } }
</style></head><body>
<h1>HAY LÀ CÀ PHÊ</h1>
<p class="sub">Phiếu chốt sổ cuối ngày</p>
<p class="date">${dateLabel}</p>
<hr class="dash"/>

<p class="section">Theo hình thức thanh toán</p>
<div class="row"><span>💵 Tiền mặt (${data.cashCount} đơn)</span><span class="val">${data.cashRev.toLocaleString('vi-VN')}đ</span></div>
<div class="row"><span>💳 Chuyển khoản (${data.transferCount} đơn)</span><span class="val">${data.transferRev.toLocaleString('vi-VN')}đ</span></div>

<hr class="dash"/>

<p class="section">Theo kênh bán</p>
<div class="row"><span>🍽️ Tại bàn (${data.dineInCount} đơn)</span><span class="val">${data.dineInRev.toLocaleString('vi-VN')}đ</span></div>
<div class="row"><span>🌐 Đặt online (${data.onlineCount} đơn)</span><span class="val">${data.onlineRev.toLocaleString('vi-VN')}đ</span></div>

<hr class="dash"/>

<div class="total-row"><span>TỔNG THU</span><span>${totalRev.toLocaleString('vi-VN')}đ</span></div>
<div class="row"><span style="color:#555">Số đơn đã thanh toán</span><span class="val">${totalComp} đơn</span></div>

${data.pendingCount > 0 ? `
<hr class="dash"/>
<div class="row pending"><span>⏳ Chờ thanh toán (${data.pendingCount} đơn)</span><span class="val">${data.pendingRev.toLocaleString('vi-VN')}đ</span></div>
` : ''}

<hr class="dash"/>
<p class="footer">Cập nhật lúc ${timeLabel}</p>
</body></html>`;

    const w = window.open('', '_blank', 'width=420,height=600');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.onload = () => w.print();
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Chốt sổ hôm nay</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition disabled:opacity-40"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handlePrint}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-800 text-white text-sm font-bold hover:bg-gray-700 transition disabled:opacity-40"
          >
            <Printer size={15} /> In phiếu
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={28} className="text-orange-400 animate-spin" />
        </div>
      ) : (
        <div className="px-4 pt-4 space-y-3">

          {/* Theo hình thức thanh toán */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Hình thức thanh toán</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                    <Banknote size={16} className="text-green-600" />
                  </div>
                  <span className="text-xs font-bold text-gray-600">Tiền mặt</span>
                </div>
                <p className="text-xl font-bold text-green-600 leading-tight">{data.cashRev.toLocaleString()}đ</p>
                <p className="text-xs text-gray-400 mt-1">{data.cashCount} đơn</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                    <CreditCard size={16} className="text-blue-500" />
                  </div>
                  <span className="text-xs font-bold text-gray-600">Chuyển khoản</span>
                </div>
                <p className="text-xl font-bold text-blue-500 leading-tight">{data.transferRev.toLocaleString()}đ</p>
                <p className="text-xs text-gray-400 mt-1">{data.transferCount} đơn</p>
              </div>
            </div>
          </div>

          {/* Theo kênh bán */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Kênh bán</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center">
                    <UtensilsCrossed size={16} className="text-orange-500" />
                  </div>
                  <span className="text-xs font-bold text-gray-600">Tại bàn</span>
                </div>
                <p className="text-xl font-bold text-orange-500 leading-tight">{data.dineInRev.toLocaleString()}đ</p>
                <p className="text-xs text-gray-400 mt-1">{data.dineInCount} đơn</p>
              </div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Globe size={16} className="text-purple-500" />
                  </div>
                  <span className="text-xs font-bold text-gray-600">Đặt online</span>
                </div>
                <p className="text-xl font-bold text-purple-500 leading-tight">{data.onlineRev.toLocaleString()}đ</p>
                <p className="text-xs text-gray-400 mt-1">{data.onlineCount} đơn</p>
              </div>
            </div>
          </div>

          {/* Tổng thu */}
          <div className="bg-gray-900 rounded-2xl p-5 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Tổng thu hôm nay</p>
              <p className="text-xs text-gray-500 mt-1">{totalComp} đơn đã thanh toán</p>
            </div>
            <p className="text-2xl font-bold text-orange-400">{totalRev.toLocaleString()}đ</p>
          </div>

          {/* Chờ thanh toán */}
          {data.pendingCount > 0 && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-amber-500" />
                <div>
                  <p className="text-sm font-semibold text-amber-700">Chờ thanh toán</p>
                  <p className="text-xs text-amber-500">{data.pendingCount} đơn chưa chốt</p>
                </div>
              </div>
              <p className="text-base font-bold text-amber-600">{data.pendingRev.toLocaleString()}đ</p>
            </div>
          )}

          {lastUpdated && (
            <p className="text-center text-[10px] text-gray-300 pb-2">
              Cập nhật lúc {lastUpdated.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
