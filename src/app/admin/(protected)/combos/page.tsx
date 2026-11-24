'use client';

import { useEffect, useState } from 'react';
import { getAllJuiceCombos, createJuiceCombo, updateJuiceCombo, deleteJuiceCombo } from '@/app/lib/firebaseJuiceCombos';
import type { JuiceCombo } from '@/app/lib/firebaseJuiceCombos';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';

export default function AdminCombosPage() {
  const [combos, setCombos] = useState<JuiceCombo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    getAllJuiceCombos().then(setCombos).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setFormName('');
    setError('');
    setShowForm(true);
  };

  const openEdit = (c: JuiceCombo) => {
    setEditingId(c.id);
    setFormName(c.name);
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    const name = formName.trim();
    if (!name) { setError('Vui lòng nhập tên combo'); return; }

    setSaving(true);
    try {
      if (editingId) {
        await updateJuiceCombo(editingId, { name });
        setCombos((prev) => prev.map((c) => c.id === editingId ? { ...c, name } : c));
      } else {
        const id = await createJuiceCombo(name);
        setCombos((prev) => [...prev, { id, name, available: true }]);
      }
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (c: JuiceCombo) => {
    await updateJuiceCombo(c.id, { available: !c.available });
    setCombos((prev) => prev.map((x) => x.id === c.id ? { ...x, available: !x.available } : x));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa combo này?')) return;
    await deleteJuiceCombo(id);
    setCombos((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Combo nước ép</h1>
          <p className="text-sm text-gray-400 mt-0.5">Danh sách combo cho mục &quot;Nước ép trái cây theo ngày&quot;</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 text-sm bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-600 shadow-sm shadow-emerald-200 transition"
        >
          <Plus size={16} />
          Thêm combo
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5 mb-4">
          <h2 className="font-bold text-gray-700 mb-4">{editingId ? 'Chỉnh sửa combo' : 'Thêm combo mới'}</h2>
          <div className="mb-4">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Tên combo</label>
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400 transition"
              placeholder="Ví dụ: Dưa hấu, cà chua, bạc hà"
            />
          </div>
          {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-600 transition disabled:opacity-50"
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
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {combos.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-16">Chưa có combo nào</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Combo</th>
                  <th className="text-center px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Hiển thị</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {combos.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-gray-800">🍹 {c.name}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => handleToggle(c)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-full transition ${
                          c.available
                            ? 'bg-green-50 text-green-600 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {c.available ? 'Hiện' : 'Ẩn'}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
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
