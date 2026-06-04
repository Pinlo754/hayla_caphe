'use client';

import { useEffect, useState } from 'react';
import { getAllCustomers, updateCustomer } from '@/app/lib/firebaseCustomers';
import type { Customer } from '@/types/pos.types';
import { Star, Phone, MapPin, RefreshCw, Pencil, Check, X, Search } from 'lucide-react';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getAllCustomers().then(setCustomers).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return c.name.toLowerCase().includes(s) || c.phone.includes(s) || c.id.toLowerCase().includes(s);
  });

  const totalPoints = customers.reduce((s, c) => s + c.points, 0);

  const openEdit = (c: Customer) => {
    setEditingId(c.id);
    setEditForm({ name: c.name, phone: c.phone, address: c.address ?? '' });
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    try {
      await updateCustomer(id, {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        address: editForm.address.trim() || undefined,
      });
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, name: editForm.name.trim(), phone: editForm.phone.trim(), address: editForm.address.trim() || undefined }
            : c
        )
      );
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Khách hàng</h1>
          <p className="text-xs text-gray-400 mt-0.5">{customers.length} thành viên · {totalPoints.toLocaleString()} điểm tổng cộng</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded-xl font-bold hover:bg-orange-100 transition"
        >
          <RefreshCw size={14} />
          Làm mới
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên, SĐT, mã thẻ..."
          className="w-full pl-8 pr-3 py-2.5 text-sm bg-white rounded-xl border border-gray-200 outline-none focus:border-orange-300 shadow-sm transition"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-16">Không có khách hàng nào</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map((c) => (
                <div key={c.id} className="px-5 py-4">
                  {editingId === c.id ? (
                    /* Edit mode */
                    <div className="space-y-2">
                      <p className="text-[10px] font-mono text-gray-400 mb-1">{c.id}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          placeholder="Họ tên"
                          className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-400"
                        />
                        <input
                          value={editForm.phone}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          placeholder="SĐT"
                          className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-400"
                        />
                        <input
                          value={editForm.address}
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                          placeholder="Địa chỉ / Tòa nhà"
                          className="px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-orange-400"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSave(c.id)}
                          disabled={saving}
                          className="flex items-center gap-1 bg-orange-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-orange-600 transition disabled:opacity-50"
                        >
                          <Check size={12} />
                          {saving ? 'Đang lưu...' : 'Lưu'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex items-center gap-1 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-gray-200 transition"
                        >
                          <X size={12} />
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* View mode */
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                        <span className="text-orange-600 font-bold text-sm">{c.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-800 text-sm">{c.name}</p>
                          <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{c.id}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone size={10} />{c.phone}
                          </span>
                          {c.address && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <MapPin size={10} />{c.address}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            {new Date(c.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <Star size={13} className="text-yellow-400 fill-yellow-400" />
                            <span className="font-bold text-gray-800 text-sm">{c.points.toLocaleString()}</span>
                          </div>
                          <p className="text-[10px] text-gray-400">điểm</p>
                        </div>
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Pencil size={14} />
                        </button>
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
