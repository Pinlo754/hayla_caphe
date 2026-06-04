'use client';

import { useEffect, useState } from 'react';
import { getAllToppings, createTopping, updateTopping, deleteTopping } from '@/app/lib/firebaseToppings';
import type { ToppingItem } from '@/app/lib/firebaseToppings';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';

type EditForm = { name: string; price: string };
const EMPTY_FORM: EditForm = { name: '', price: '5000' };

export default function AdminToppingsPage() {
  const [toppings, setToppings] = useState<ToppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<EditForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    getAllToppings().then(setToppings).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  };

  const openEdit = (t: ToppingItem) => {
    setEditingId(t.id);
    setForm({ name: t.name, price: String(t.price) });
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const price = Number(form.price);
    if (!name) { setError('Vui lòng nhập tên topping'); return; }
    if (!price || price < 0) { setError('Giá không hợp lệ'); return; }

    setSaving(true);
    try {
      if (editingId) {
        await updateTopping(editingId, { name, price });
        setToppings((prev) => prev.map((t) => t.id === editingId ? { ...t, name, price } : t));
      } else {
        const id = await createTopping({ name, price });
        setToppings((prev) => [...prev, { id, name, price, available: true }]);
      }
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (t: ToppingItem) => {
    await updateTopping(t.id, { available: !t.available });
    setToppings((prev) => prev.map((x) => x.id === t.id ? { ...x, available: !x.available } : x));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa topping này?')) return;
    await deleteTopping(id);
    setToppings((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Topping</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 text-sm bg-orange-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-orange-600 shadow-sm shadow-orange-200 transition"
        >
          <Plus size={16} />
          Thêm topping
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-orange-200 shadow-sm p-5 mb-4">
          <h2 className="font-bold text-gray-700 mb-4">{editingId ? 'Chỉnh sửa topping' : 'Thêm topping mới'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Tên topping</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 transition"
                placeholder="Ví dụ: Kem muối"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Giá (đ)</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 transition"
                placeholder="5000"
                min="0"
              />
            </div>
          </div>
          {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-orange-600 transition disabled:opacity-50"
            >
              <Check size={14} />
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex items-center gap-1.5 bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-200 transition"
            >
              <X size={14} />
              Hủy
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {toppings.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-16">Chưa có topping nào</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Tên</th>
                  <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Giá</th>
                  <th className="text-center px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Bán</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {toppings.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3.5 font-medium text-gray-800">{t.name}</td>
                    <td className="px-5 py-3.5 text-right text-gray-600">{t.price.toLocaleString()}đ</td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => handleToggle(t)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-full transition ${
                          t.available
                            ? 'bg-green-50 text-green-600 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {t.available ? 'Có bán' : 'Nghỉ'}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(t)}
                          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
