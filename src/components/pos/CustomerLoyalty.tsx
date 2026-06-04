'use client';

import { useState } from 'react';
import { QrCode, Star, UserPlus, X, Check, Phone, MapPin, User, Loader2 } from 'lucide-react';
import type { Customer } from '@/types/pos.types';
import { getCustomer, createCustomer } from '@/app/lib/firebaseCustomers';
import QRScanner from './QRScanner';

type FlowState = 'idle' | 'scanning' | 'loading' | 'register' | 'found';

interface Props {
  orderTotal: number;
  customer: Customer | null;
  onCustomerChange: (c: Customer | null) => void;
}

const CUSTOMER_PATTERN = /^haylacaphe-KH\d+$/;

export default function CustomerLoyalty({ orderTotal, customer, onCustomerChange }: Props) {
  const [state, setState] = useState<FlowState>(customer ? 'found' : 'idle');
  const [scannedId, setScannedId] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const pointsToEarn = Math.floor(orderTotal / 1000);

  const handleScan = async (text: string) => {
    const id = text.trim();
    if (!CUSTOMER_PATTERN.test(id)) {
      setState('idle');
      alert('Mã QR không hợp lệ.\nVui lòng quét thẻ tích điểm Hay là cà phê.');
      return;
    }

    setScannedId(id);
    setState('loading');

    try {
      const existing = await getCustomer(id);
      if (existing) {
        onCustomerChange(existing);
        setState('found');
      } else {
        setForm({ name: '', phone: '', address: '' });
        setFormError('');
        setState('register');
      }
    } catch {
      setState('idle');
    }
  };

  const handleRegister = async () => {
    const name = form.name.trim();
    const phone = form.phone.trim();
    if (!name) { setFormError('Vui lòng nhập họ tên'); return; }
    if (!phone) { setFormError('Vui lòng nhập số điện thoại'); return; }
    if (!/^(0|\+84)\d{8,10}$/.test(phone.replace(/\s/g, ''))) {
      setFormError('Số điện thoại không hợp lệ');
      return;
    }

    setSaving(true);
    try {
      const newCustomer = await createCustomer(scannedId, {
        name,
        phone,
        address: form.address.trim() || undefined,
        points: 0,
      });
      onCustomerChange(newCustomer);
      setState('found');
    } catch (e) {
      setFormError('Lỗi: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = () => {
    onCustomerChange(null);
    setState('idle');
  };

  // ── IDLE ──────────────────────────────────────────────────────────
  if (state === 'idle') {
    return (
      <div
        onClick={() => setState('scanning')}
        className="flex items-center gap-3 p-3 rounded-2xl border-2 border-dashed border-gray-200 cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-all active:scale-[0.98]"
      >
        <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
          <QrCode size={18} className="text-orange-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-600">Quét thẻ tích điểm</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Đơn này tích được <span className="text-orange-500 font-bold">+{pointsToEarn} điểm</span></p>
        </div>
        <QrCode size={16} className="text-gray-300 ml-auto" />
      </div>
    );
  }

  // ── SCANNING ──────────────────────────────────────────────────────
  if (state === 'scanning') {
    return (
      <QRScanner
        onScan={handleScan}
        onClose={() => setState('idle')}
      />
    );
  }

  // ── LOADING ───────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-2xl">
        <Loader2 size={18} className="text-orange-500 animate-spin shrink-0" />
        <p className="text-sm text-orange-600">Đang tra cứu khách hàng...</p>
      </div>
    );
  }

  // ── REGISTER ──────────────────────────────────────────────────────
  if (state === 'register') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-blue-800">Khách hàng mới</p>
            <p className="text-[10px] text-blue-500 font-mono mt-0.5">{scannedId}</p>
          </div>
          <button onClick={() => setState('idle')} className="p-1 hover:bg-blue-100 rounded-lg transition">
            <X size={16} className="text-blue-400" />
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-white rounded-xl border border-blue-100 px-3 py-2">
            <User size={14} className="text-gray-400 shrink-0" />
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Họ và tên *"
              className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder-gray-400"
            />
          </div>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-blue-100 px-3 py-2">
            <Phone size={14} className="text-gray-400 shrink-0" />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Số điện thoại *"
              type="tel"
              className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder-gray-400"
            />
          </div>
          <div className="flex items-center gap-2 bg-white rounded-xl border border-blue-100 px-3 py-2">
            <MapPin size={14} className="text-gray-400 shrink-0" />
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Tòa nhà / Địa chỉ (tuỳ chọn)"
              className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder-gray-400"
            />
          </div>
        </div>

        {formError && (
          <p className="text-red-500 text-xs bg-red-50 px-3 py-1.5 rounded-xl">{formError}</p>
        )}

        <button
          onClick={handleRegister}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition disabled:opacity-50"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
          {saving ? 'Đang lưu...' : 'Đăng ký & Tích điểm'}
        </button>
      </div>
    );
  }

  // ── FOUND ─────────────────────────────────────────────────────────
  if (state === 'found' && customer) {
    return (
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-200 rounded-full flex items-center justify-center shrink-0">
              <span className="text-orange-700 font-bold text-sm">
                {customer.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm">{customer.name}</p>
              <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                <Phone size={9} />
                {customer.phone}
                {customer.address && (
                  <><MapPin size={9} className="ml-1" />{customer.address}</>
                )}
              </p>
              <p className="text-[10px] text-gray-400 font-mono mt-0.5">{customer.id}</p>
            </div>
          </div>
          <button onClick={handleRemove} className="p-1 hover:bg-orange-100 rounded-lg transition shrink-0 mt-0.5">
            <X size={15} className="text-orange-400" />
          </button>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-orange-200">
          <div className="flex items-center gap-1.5">
            <Star size={14} className="text-yellow-500 fill-yellow-400" />
            <span className="text-sm font-bold text-gray-700">{customer.points.toLocaleString()} điểm</span>
            <span className="text-xs text-gray-400">hiện có</span>
          </div>
          {pointsToEarn > 0 && (
            <div className="flex items-center gap-1 bg-orange-500 text-white px-2.5 py-1 rounded-full">
              <Check size={11} strokeWidth={3} />
              <span className="text-xs font-bold">+{pointsToEarn} điểm</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
