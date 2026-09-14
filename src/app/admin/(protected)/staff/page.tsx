'use client';

import { useEffect, useState } from 'react';
import {
  getStaffAccounts,
  createStaffAccount,
  updateStaffAccount,
  resetStaffPassword,
  deleteStaffAccount,
} from '@/app/lib/firebaseStaff';
import type { StaffAccount } from '@/types/pos.types';
import { Plus, Pencil, Trash2, Check, X, KeyRound } from 'lucide-react';

type EditForm = { name: string; username: string; password: string };
const EMPTY_FORM: EditForm = { name: '', username: '', password: '' };

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<EditForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetSaving, setResetSaving] = useState(false);

  const load = () => {
    setLoading(true);
    getStaffAccounts().then(setStaff).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  };

  const openEdit = (s: StaffAccount) => {
    setEditingId(s.id);
    setForm({ name: s.name, username: s.username, password: '' });
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const username = form.username.trim();
    if (!name) { setError('Vui lòng nhập tên nhân viên'); return; }
    if (!username) { setError('Vui lòng nhập tên đăng nhập'); return; }
    if (!editingId && form.password.length < 4) { setError('Mật khẩu cần ít nhất 4 ký tự'); return; }

    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await updateStaffAccount(editingId, { name });
        setStaff((prev) => prev.map((s) => s.id === editingId ? { ...s, name } : s));
      } else {
        const id = await createStaffAccount(name, username, form.password);
        setStaff((prev) => [...prev, {
          id, name, username: username.toLowerCase(), passwordHash: '', salt: '',
          active: true, createdAt: new Date().toISOString(),
        }].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setShowForm(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không thể lưu, vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (s: StaffAccount) => {
    await updateStaffAccount(s.id, { active: !s.active });
    setStaff((prev) => prev.map((x) => x.id === s.id ? { ...x, active: !x.active } : x));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa tài khoản nhân viên này? Nhân viên sẽ không thể đăng nhập nữa.')) return;
    await deleteStaffAccount(id);
    setStaff((prev) => prev.filter((s) => s.id !== id));
  };

  const openReset = (id: string) => {
    setResetId(id);
    setResetPassword('');
  };

  const handleResetPassword = async () => {
    if (!resetId || resetPassword.length < 4) return;
    setResetSaving(true);
    try {
      await resetStaffPassword(resetId, resetPassword);
      setResetId(null);
      setResetPassword('');
    } finally {
      setResetSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Nhân viên</h1>
          <p className="text-xs text-gray-400 mt-0.5">Tài khoản đăng nhập cho ứng dụng bán hàng</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 text-sm bg-orange-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-orange-600 shadow-sm shadow-orange-200 transition"
        >
          <Plus size={16} />
          Thêm nhân viên
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-orange-200 shadow-sm p-5 mb-4">
          <h2 className="font-bold text-gray-700 mb-4">{editingId ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Tên nhân viên</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 transition"
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Tên đăng nhập</label>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                disabled={!!editingId}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 transition disabled:bg-gray-50 disabled:text-gray-400"
                placeholder="nhanvienA"
              />
            </div>
            {!editingId && (
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Mật khẩu</label>
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-400 transition"
                  placeholder="Tối thiểu 4 ký tự"
                />
              </div>
            )}
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

      {/* Reset password inline form */}
      {resetId && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm p-5 mb-4">
          <h2 className="font-bold text-gray-700 mb-4">Đặt lại mật khẩu</h2>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Mật khẩu mới</label>
              <input
                type="text"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400 transition"
                placeholder="Tối thiểu 4 ký tự"
              />
            </div>
            <button
              onClick={handleResetPassword}
              disabled={resetSaving || resetPassword.length < 4}
              className="flex items-center gap-1.5 bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-600 transition disabled:opacity-50"
            >
              <Check size={14} />
              {resetSaving ? 'Đang lưu...' : 'Xác nhận'}
            </button>
            <button
              onClick={() => setResetId(null)}
              className="flex items-center gap-1.5 bg-gray-100 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-200 transition"
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
          {staff.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-16">Chưa có tài khoản nhân viên nào</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Tên</th>
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Tên đăng nhập</th>
                  <th className="text-center px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-widest">Trạng thái</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {staff.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3.5 font-medium text-gray-800">{s.name}</td>
                    <td className="px-5 py-3.5 text-gray-500 font-mono text-xs">{s.username}</td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => handleToggle(s)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-full transition ${
                          s.active
                            ? 'bg-green-50 text-green-600 hover:bg-green-100'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {s.active ? 'Hoạt động' : 'Đã khóa'}
                      </button>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openReset(s.id)}
                          title="Đặt lại mật khẩu"
                          className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition"
                        >
                          <KeyRound size={14} />
                        </button>
                        <button
                          onClick={() => openEdit(s)}
                          title="Sửa tên"
                          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          title="Xóa"
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
