'use client';

import { useEffect, useState } from 'react';
import { getPosSettings, updatePosSettings } from '@/app/lib/firebaseSettings';
import { Download, Loader2, Check } from 'lucide-react';

export default function AdminSettingsPage() {
  const [autoDownload, setAutoDownload] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getPosSettings()
      .then((s) => setAutoDownload(s.autoDownloadReceipt))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async () => {
    const next = !autoDownload;
    setAutoDownload(next);
    setSaving(true);
    setSaved(false);
    try {
      await updatePosSettings({ autoDownloadReceipt: next });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Cài đặt</h1>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">

        {/* Section header */}
        <div className="px-5 py-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Thanh toán</h2>
        </div>

        {/* Auto download toggle */}
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
              <Download size={18} className="text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Tự động lưu ảnh biên lai về máy</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Khi đơn chuyển khoản thanh toán thành công, tự động tải ảnh biên lai xuống thiết bị.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {saving && <Loader2 size={14} className="text-gray-400 animate-spin" />}
            {saved && !saving && <Check size={14} className="text-green-500" />}
            {loading ? (
              <div className="w-11 h-6 bg-gray-200 rounded-full animate-pulse" />
            ) : (
              <button
                onClick={handleToggle}
                disabled={saving}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 disabled:opacity-60 ${
                  autoDownload ? 'bg-orange-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    autoDownload ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            )}
          </div>
        </div>

        {/* Status hint */}
        <div className="px-5 py-3 bg-gray-50">
          <p className="text-xs text-gray-400">
            Trạng thái hiện tại:{' '}
            <span className={`font-bold ${autoDownload ? 'text-green-600' : 'text-gray-500'}`}>
              {loading ? '...' : autoDownload ? 'Đang bật — ảnh sẽ tự tải về máy' : 'Đã tắt — ảnh chỉ lưu trên Firebase'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
