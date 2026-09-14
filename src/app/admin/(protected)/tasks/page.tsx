'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Sparkles } from 'lucide-react';
import { getTasks, createTask, updateTask, deleteTask } from '@/app/lib/firebaseTasks';
import { DEFAULT_TASKS } from '@/data/defaultTasks';
import type { Task, TaskPriority, TaskDay, TaskGroup, TaskRecurrence } from '@/types/pos.types';

const DAYS: { key: TaskDay; label: string }[] = [
  { key: 'mon', label: 'T2' },
  { key: 'tue', label: 'T3' },
  { key: 'wed', label: 'T4' },
  { key: 'thu', label: 'T5' },
  { key: 'fri', label: 'T6' },
  { key: 'sat', label: 'T7' },
  { key: 'sun', label: 'CN' },
];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  high:   'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low:    'bg-green-100 text-green-700 border-green-200',
};
const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'Cao', medium: 'Trung bình', low: 'Thấp',
};

const GROUP_LABELS: Record<TaskGroup, string> = {
  shift:    '🔄 Lặp mỗi ca',
  hourly:   '🕐 Giờ cố định',
  periodic: '🗓️ Định kỳ',
};
const GROUP_COLORS: Record<TaskGroup, string> = {
  shift:    'bg-purple-50 text-purple-600 border-purple-200',
  hourly:   'bg-blue-50 text-blue-600 border-blue-200',
  periodic: 'bg-teal-50 text-teal-600 border-teal-200',
};

const RECURRENCE_LABELS: Record<TaskRecurrence, string> = {
  daily:    'Hằng ngày',
  weekly:   'Theo tuần',
  monthly:  'Theo tháng',
  interval: 'Theo chu kỳ N ngày',
};

const EMPTY: Omit<Task, 'id' | 'createdAt'> = {
  title:         '',
  description:   '',
  priority:      'medium',
  group:         'hourly',
  scheduledTime: '08:00',
  recurrence:    'daily',
  days:          [],
  dayOfMonth:    undefined,
  intervalDays:  undefined,
  anchorDate:    undefined,
  requirePhoto:  true,
  active:        true,
  order:         0,
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function recurrenceSummary(task: Task): string {
  switch (task.recurrence) {
    case 'daily':
      return 'Mỗi ngày';
    case 'weekly':
      return task.days.length === 0
        ? 'Mỗi ngày'
        : task.days.map((d) => DAYS.find((x) => x.key === d)?.label).join(', ');
    case 'monthly':
      return `Ngày ${task.dayOfMonth ?? '?'} hàng tháng`;
    case 'interval':
      return `Mỗi ${task.intervalDays ?? '?'} ngày`;
    default:
      return '';
  }
}

export default function TasksAdminPage() {
  const [tasks, setTasks]     = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<Task | null>(null);
  const [form, setForm]         = useState<typeof EMPTY>({ ...EMPTY });
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [seeding, setSeeding]   = useState(false);
  const [groupFilter, setGroupFilter] = useState<TaskGroup | 'all'>('all');

  const load = async () => {
    setLoading(true);
    try { setTasks(await getTasks()); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY });
    setShowForm(true);
  };

  const openEdit = (task: Task) => {
    setEditing(task);
    setForm({
      title:         task.title,
      description:   task.description ?? '',
      priority:      task.priority,
      group:         task.group,
      scheduledTime: task.scheduledTime,
      recurrence:    task.recurrence,
      days:          [...task.days],
      dayOfMonth:    task.dayOfMonth,
      intervalDays:  task.intervalDays,
      anchorDate:    task.anchorDate,
      requirePhoto:  task.requirePhoto,
      active:        task.active,
      order:         task.order,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateTask(editing.id, form);
      } else {
        await createTask({ ...form, order: tasks.length });
      }
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa công việc này?')) return;
    setDeleting(id);
    try { await deleteTask(id); await load(); } finally { setDeleting(null); }
  };

  const toggleActive = async (task: Task) => {
    await updateTask(task.id, { active: !task.active });
    await load();
  };

  const toggleDay = (day: TaskDay) => {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }));
  };

  const taskKey = (t: { title: string; scheduledTime: string }) =>
    `${t.title.trim().toLowerCase()}|${t.scheduledTime}`;

  const handleSeed = async () => {
    const existingKeys = new Set(tasks.map(taskKey));
    const toCreate = DEFAULT_TASKS.filter((t) => !existingKeys.has(taskKey(t)));

    if (toCreate.length === 0) {
      alert('Tất cả công việc mẫu đã có trong danh sách rồi.');
      return;
    }
    if (!confirm(`Nhập ${toCreate.length} công việc mẫu (đầu/cuối ca, theo giờ, định kỳ) vào checklist? Bạn có thể chỉnh sửa/xóa từng việc sau khi nhập.`)) {
      return;
    }

    setSeeding(true);
    try {
      let order = tasks.length;
      for (const t of toCreate) {
        const anchorDate = t.recurrence === 'interval' ? todayStr() : undefined;
        await createTask({ ...t, anchorDate, order: order++ });
      }
      await load();
    } finally {
      setSeeding(false);
    }
  };

  const visibleTasks = groupFilter === 'all' ? tasks : tasks.filter((t) => t.group === groupFilter);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Công việc</h1>
          <p className="text-sm text-gray-500 mt-1">Danh sách checklist theo lịch trình</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSeed}
            disabled={seeding}
            title="Nhập bộ checklist mẫu đầy đủ (đầu/cuối ca, theo giờ, vệ sinh định kỳ...)"
            className="flex items-center gap-2 bg-teal-50 text-teal-700 border border-teal-200 px-4 py-2 rounded-xl text-sm font-bold hover:bg-teal-100 transition disabled:opacity-50"
          >
            <Sparkles size={16} /> {seeding ? 'Đang nhập...' : 'Nhập checklist mẫu'}
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow hover:bg-orange-600 transition"
          >
            <Plus size={16} /> Thêm công việc
          </button>
        </div>
      </div>

      {/* Group filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setGroupFilter('all')}
          className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
            groupFilter === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200'
          }`}
        >
          Tất cả ({tasks.length})
        </button>
        {(Object.keys(GROUP_LABELS) as TaskGroup[]).map((g) => (
          <button
            key={g}
            onClick={() => setGroupFilter(g)}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
              groupFilter === g ? GROUP_COLORS[g].replace('50', '100') + ' border-current' : 'bg-white text-gray-500 border-gray-200'
            }`}
          >
            {GROUP_LABELS[g]} ({tasks.filter((t) => t.group === g).length})
          </button>
        ))}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900">{editing ? 'Chỉnh sửa' : 'Thêm công việc'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Tên công việc *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400"
                  placeholder="Vd: Vệ sinh máy pha cà phê"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Mô tả</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400 resize-none"
                  placeholder="Hướng dẫn thực hiện..."
                />
              </div>

              {/* Group */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Nhóm việc</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(GROUP_LABELS) as TaskGroup[]).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, group: g }))}
                      className={`px-2 py-2 rounded-xl text-xs font-bold border transition ${
                        form.group === g ? GROUP_COLORS[g] : 'bg-gray-50 text-gray-400 border-gray-200'
                      }`}
                    >
                      {GROUP_LABELS[g]}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  {form.group === 'shift' && 'Việc mọi nhân viên lặp lại ở mỗi ca (đầu ca/cuối ca) — tạo 1 dòng riêng cho từng ca (VD: 06:05, 14:05, 22:05).'}
                  {form.group === 'hourly' && 'Việc gắn với 1 mốc giờ cố định trong ngày.'}
                  {form.group === 'periodic' && 'Vệ sinh/bảo trì/kiểm kê theo chu kỳ ngày, tuần hoặc tháng.'}
                </p>
              </div>

              {/* Time + Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Giờ thực hiện</label>
                  <input
                    type="time"
                    value={form.scheduledTime}
                    onChange={(e) => setForm((f) => ({ ...f, scheduledTime: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Mức độ ưu tiên</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400"
                  >
                    <option value="high">Cao</option>
                    <option value="medium">Trung bình</option>
                    <option value="low">Thấp</option>
                  </select>
                </div>
              </div>

              {/* Recurrence */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Lặp lại</label>
                <select
                  value={form.recurrence}
                  onChange={(e) => setForm((f) => ({ ...f, recurrence: e.target.value as TaskRecurrence }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400"
                >
                  {(Object.keys(RECURRENCE_LABELS) as TaskRecurrence[]).map((r) => (
                    <option key={r} value={r}>{RECURRENCE_LABELS[r]}</option>
                  ))}
                </select>
              </div>

              {/* Recurrence-specific fields */}
              {form.recurrence === 'weekly' && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">
                    Ngày trong tuần <span className="text-gray-400 font-normal">(bỏ trống = mỗi ngày)</span>
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {DAYS.map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleDay(key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                          form.days.includes(key)
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-gray-50 text-gray-500 border-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {form.recurrence === 'monthly' && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Ngày trong tháng (1–31)</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={form.dayOfMonth ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, dayOfMonth: e.target.value ? Number(e.target.value) : undefined }))}
                    className="w-full border rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400"
                    placeholder="Vd: 1"
                  />
                </div>
              )}

              {form.recurrence === 'interval' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Số ngày lặp lại</label>
                    <input
                      type="number"
                      min={2}
                      value={form.intervalDays ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, intervalDays: e.target.value ? Number(e.target.value) : undefined }))}
                      className="w-full border rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400"
                      placeholder="Vd: 2 (cách 2 ngày)"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Bắt đầu tính từ ngày</label>
                    <input
                      type="date"
                      value={form.anchorDate ?? todayStr()}
                      onChange={(e) => setForm((f) => ({ ...f, anchorDate: e.target.value }))}
                      className="w-full border rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400"
                    />
                  </div>
                </div>
              )}

              {/* Options */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.requirePhoto}
                    onChange={(e) => setForm((f) => ({ ...f, requirePhoto: e.target.checked }))}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <span className="text-sm text-gray-700">Yêu cầu ảnh minh chứng</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <span className="text-sm text-gray-700">Đang hoạt động</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border text-sm font-bold text-gray-500 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.title.trim()}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 transition"
              >
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : visibleTasks.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-3">📋</p>
          <p>Chưa có công việc nào. Bấm <strong>Thêm công việc</strong> hoặc <strong>Nhập checklist mẫu</strong> để bắt đầu.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleTasks.map((task) => (
            <div
              key={task.id}
              className={`bg-white rounded-2xl border p-4 flex gap-4 items-start shadow-sm transition ${
                !task.active ? 'opacity-50' : ''
              }`}
            >
              {/* Time */}
              <div className="shrink-0 text-center">
                <p className="text-lg font-bold text-gray-800">{task.scheduledTime}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[task.priority]}`}>
                  {PRIORITY_LABELS[task.priority]}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm">{task.title}</p>
                {task.description && (
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${GROUP_COLORS[task.group]}`}>
                    {GROUP_LABELS[task.group]}
                  </span>
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                    {recurrenceSummary(task)}
                  </span>
                  {task.requirePhoto && (
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">📷 Ảnh</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => toggleActive(task)}
                  title={task.active ? 'Tắt' : 'Bật'}
                  className={`p-1.5 rounded-lg transition ${task.active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}
                >
                  <Check size={15} />
                </button>
                <button
                  onClick={() => openEdit(task)}
                  className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600 transition"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => handleDelete(task.id)}
                  disabled={deleting === task.id}
                  className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 transition"
                >
                  {deleting === task.id ? (
                    <span className="inline-block w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 size={15} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
