'use client';

import { useEffect, useMemo, useState } from 'react';
import { getAllMenuItems, createMenuItem, updateMenuItem, deleteMenuItem } from '@/app/lib/firebaseMenu';
import { getAllToppings } from '@/app/lib/firebaseToppings';
import type { ToppingItem } from '@/app/lib/firebaseToppings';
import type { MenuItem } from '@/types/pos.types';
import { Plus, Pencil, Trash2, X, Check, Search, ImageOff } from 'lucide-react';

const CATEGORIES = ['Coffee', 'Tea', 'Milk Tea', 'Yogurt', 'Matcha', 'Cacao', 'Fruit Juice'];

type FormState = {
  name: string;
  price: string;
  category: string;
  image: string;
  available: boolean;
  combos: string;
  toppings: string[];
};

const EMPTY_FORM: FormState = {
  name: '', price: '', category: 'Coffee', image: '',
  available: true, combos: '', toppings: [],
};

export default function AdminMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [allToppings, setAllToppings] = useState<ToppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');

  const load = () => {
    setLoading(true);
    Promise.all([getAllMenuItems(), getAllToppings()])
      .then(([menuData, toppingData]) => {
        setItems(menuData);
        setAllToppings(toppingData);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const displayed = useMemo(() => {
    return items.filter((i) => {
      if (catFilter !== 'all' && i.category !== catFilter) return false;
      if (search.trim() && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [items, catFilter, search]);

  const openAdd = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      price: String(item.price),
      category: item.category,
      image: item.image ?? '',
      available: item.available !== false,
      combos: item.combos?.join('\n') ?? '',
      toppings: item.toppings ?? [],
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const price = Number(form.price);
    if (!name) { setFormError('Vui lòng nhập tên món'); return; }
    if (!price || price <= 0) { setFormError('Giá không hợp lệ'); return; }

    const combosArr = form.combos.trim()
      ? form.combos.split('\n').map((s) => s.trim()).filter(Boolean)
      : undefined;

    const data: Omit<MenuItem, 'id'> = {
      name, price,
      category: form.category,
      image: form.image.trim() || undefined,
      available: form.available,
      combos: combosArr,
      toppings: form.toppings.length ? form.toppings : undefined,
    };

    setSaving(true);
    try {
      if (editingItem) {
        await updateMenuItem(editingItem.id, data);
        setItems((prev) => prev.map((i) => i.id === editingItem.id ? { ...i, ...data } : i));
      } else {
        const newId = await createMenuItem(data);
        setItems((prev) => [...prev, { id: newId, ...data }].sort(
          (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
        ));
      }
      setShowModal(false);
    } catch (e) {
      setFormError('Lỗi lưu dữ liệu: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xóa món này khỏi thực đơn?')) return;
    setDeletingId(id);
    try {
      await deleteMenuItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const toggleTopping = (name: string) => {
    setForm((f) => ({
      ...f,
      toppings: f.toppings.includes(name)
        ? f.toppings.filter((t) => t !== name)
        : [...f.toppings, name],
    }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Thực đơn</h1>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 text-sm bg-orange-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-orange-600 shadow-sm shadow-orange-200 transition"
        >
          <Plus size={16} />
          Thêm món
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên món..."
            className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 rounded-xl border border-gray-100 outline-none focus:border-orange-300 transition"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition ${catFilter === cat ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'}`}
            >
              {cat === 'all' ? 'Tất cả' : cat}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-3">{displayed.length} món</p>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {displayed.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-16">Không có món nào</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest w-14">Ảnh</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Tên món</th>
                  <th className="text-right px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Giá</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest hidden sm:table-cell">Danh mục</th>
                  <th className="text-center px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Bán</th>
                  <th className="px-5 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayed.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-10 h-10 rounded-xl object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                          <ImageOff size={14} className="text-orange-200" />
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{item.name}</p>
                      {item.combos && (
                        <p className="text-[10px] text-emerald-500 mt-0.5">Combo</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-gray-700">{item.price.toLocaleString()}đ</td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{item.category}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.available !== false ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {item.available !== false ? 'Có bán' : 'Nghỉ'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-40"
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-bold text-gray-800 text-lg">
                {editingItem ? 'Chỉnh sửa món' : 'Thêm món mới'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Image preview */}
              {form.image && (
                <div className="relative w-full h-32 rounded-2xl overflow-hidden bg-gray-100">
                  <img src={form.image} alt="preview" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Image URL */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">URL Ảnh (tuỳ chọn)</label>
                <input
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 transition"
                  placeholder="https://..."
                />
              </div>

              {/* Name */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Tên món <span className="text-red-400">*</span></label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 transition"
                  placeholder="Tên món..."
                />
              </div>

              {/* Price + Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Giá (đ) <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 transition"
                    placeholder="35000"
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Danh mục <span className="text-red-400">*</span></label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 transition bg-white"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Available toggle */}
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-medium text-gray-700">Đang bán</span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, available: !form.available })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.available ? 'bg-orange-500' : 'bg-gray-200'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.available ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Combos */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">
                  Combos (mỗi dòng 1 combo, bỏ trống nếu không có)
                </label>
                <textarea
                  value={form.combos}
                  onChange={(e) => setForm({ ...form, combos: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 transition resize-none"
                  placeholder={'Dưa hấu, cà chua, bạc hà\nCà chua, cà rốt, táo'}
                />
              </div>

              {/* Toppings */}
              {allToppings.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">
                    Topping áp dụng (bỏ trống = tất cả)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {allToppings.map((t) => {
                      const selected = form.toppings.includes(t.name);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleTopping(t.name)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium text-left transition ${
                            selected ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${selected ? 'bg-orange-500' : 'border border-gray-300'}`}>
                            {selected && <Check size={10} className="text-white" strokeWidth={3} />}
                          </div>
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {formError && <p className="text-red-500 text-xs bg-red-50 px-3 py-2 rounded-xl">{formError}</p>}
            </div>

            <div className="px-6 py-4 border-t flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 text-white py-2.5 rounded-xl font-bold hover:bg-orange-600 transition disabled:opacity-50"
              >
                <Check size={16} />
                {saving ? 'Đang lưu...' : editingItem ? 'Lưu thay đổi' : 'Thêm món'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
