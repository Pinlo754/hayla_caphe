'use client';

import { useEffect, useState } from 'react';
import { getPosSettings, updatePosSettings } from '@/app/lib/firebaseSettings';
import { getZaloConfig, saveZaloConfig } from '@/app/lib/firebaseZaloTokens';
import { Download, Loader2, Check, MessageCircle, Bell, BellOff, TestTube, Eye, EyeOff, RefreshCw } from 'lucide-react';

export default function AdminSettingsPage() {
  // ── Receipt auto-download ─────────────────────────────────────────────
  const [autoDownload, setAutoDownload] = useState(true);
  const [posLoading, setPosLoading] = useState(true);
  const [posSaving, setPosSaving] = useState(false);
  const [posSaved, setPosSaved] = useState(false);

  useEffect(() => {
    getPosSettings()
      .then((s) => setAutoDownload(s.autoDownloadReceipt))
      .finally(() => setPosLoading(false));
  }, []);

  const handleToggle = async () => {
    const next = !autoDownload;
    setAutoDownload(next);
    setPosSaving(true);
    setPosSaved(false);
    try {
      await updatePosSettings({ autoDownloadReceipt: next });
      setPosSaved(true);
      setTimeout(() => setPosSaved(false), 2000);
    } finally {
      setPosSaving(false);
    }
  };

  // ── Zalo Integration ──────────────────────────────────────────────────
  const [zaloLoading, setZaloLoading] = useState(true);
  const [zaloEnabled, setZaloEnabled] = useState(false);
  const [groupId, setGroupId] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [zaloSaving, setZaloSaving] = useState(false);
  const [zaloSaved, setZaloSaved] = useState(false);
  const [zaloError, setZaloError] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    getZaloConfig()
      .then((cfg) => {
        if (cfg) {
          setZaloEnabled(cfg.enabled ?? false);
          setGroupId(cfg.groupId ?? '');
          // Don't pre-fill refresh token — show placeholder instead for security
        }
      })
      .finally(() => setZaloLoading(false));
  }, []);

  const handleZaloSave = async () => {
    setZaloError('');
    if (!groupId.trim()) { setZaloError('Vui lòng nhập Group ID'); return; }
    if (!refreshToken.trim() && zaloEnabled) { setZaloError('Vui lòng nhập Refresh Token để bật thông báo'); return; }
    setZaloSaving(true);
    setZaloSaved(false);
    try {
      const patch: Record<string, unknown> = {
        enabled: zaloEnabled,
        groupId: groupId.trim(),
      };
      if (refreshToken.trim()) {
        // Reset the stored access token so next send triggers a fresh refresh
        patch.refreshToken = refreshToken.trim();
        patch.accessToken = '';
        patch.expiresAt = 0;
      }
      await saveZaloConfig(patch as Parameters<typeof saveZaloConfig>[0]);
      setRefreshToken(''); // clear field after save
      setZaloSaved(true);
      setTimeout(() => setZaloSaved(false), 2500);
    } catch {
      setZaloError('Lưu thất bại, vui lòng thử lại');
    } finally {
      setZaloSaving(false);
    }
  };

  const handleZaloTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/notify-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: 'TEST-' + Date.now(),
          customerName: 'Khách test',
          customerPhone: '0900000000',
          customerAddress: '123 Đường Test, TP.HCM',
          customerNote: 'Đây là tin nhắn thử từ admin Hay là cà phê.',
          items: [{ name: 'Cà phê sữa', quantity: 1, price: 35000, size: 'M' }],
          total: 35000,
          paymentMethod: 'cash',
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestResult({ ok: true, msg: data.skipped ? 'Thông báo đang tắt (skipped).' : 'Gửi thử thành công! Kiểm tra group Zalo.' });
      } else {
        setTestResult({ ok: false, msg: data.error ?? 'Lỗi không xác định' });
      }
    } catch (e) {
      setTestResult({ ok: false, msg: e instanceof Error ? e.message : 'Lỗi kết nối' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Cài đặt</h1>

      {/* ── Payment section ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        <div className="px-5 py-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Thanh toán</h2>
        </div>

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
            {posSaving && <Loader2 size={14} className="text-gray-400 animate-spin" />}
            {posSaved && !posSaving && <Check size={14} className="text-green-500" />}
            {posLoading ? (
              <div className="w-11 h-6 bg-gray-200 rounded-full animate-pulse" />
            ) : (
              <button
                onClick={handleToggle}
                disabled={posSaving}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 disabled:opacity-60 ${
                  autoDownload ? 'bg-orange-500' : 'bg-gray-200'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${autoDownload ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            )}
          </div>
        </div>

        <div className="px-5 py-3 bg-gray-50">
          <p className="text-xs text-gray-400">
            Trạng thái:{' '}
            <span className={`font-bold ${autoDownload ? 'text-green-600' : 'text-gray-500'}`}>
              {posLoading ? '...' : autoDownload ? 'Đang bật — ảnh sẽ tự tải về máy' : 'Đã tắt — ảnh chỉ lưu trên Firebase'}
            </span>
          </p>
        </div>
      </div>

      {/* ── Zalo Integration section ───────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        <div className="px-5 py-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Thông báo Zalo</h2>
          {!zaloLoading && (
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${zaloEnabled ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
              {zaloEnabled ? 'Đang bật' : 'Đã tắt'}
            </span>
          )}
        </div>

        {/* Info banner */}
        <div className="px-5 py-4 bg-blue-50 border-b border-blue-100">
          <div className="flex items-start gap-3">
            <MessageCircle size={18} className="text-blue-500 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-700 space-y-1 leading-relaxed">
              <p className="font-semibold">Yêu cầu: Zalo Official Account + GMF Group</p>
              <p>Để nhận thông báo vào group Zalo, bạn cần:</p>
              <ol className="list-decimal ml-4 space-y-0.5">
                <li>Tạo <strong>Zalo Official Account (OA)</strong> tại oa.zalo.me</li>
                <li>Tạo App trong <strong>Zalo Developers</strong> → lấy App ID & Secret</li>
                <li>Thêm vào <code className="bg-blue-100 px-1 rounded">.env.local</code>: <code className="bg-blue-100 px-1 rounded">ZALO_APP_ID</code> và <code className="bg-blue-100 px-1 rounded">ZALO_APP_SECRET</code></li>
                <li>Tạo nhóm <strong>GMF Group</strong> qua Zalo OA → lấy Group ID</li>
                <li>Thực hiện OAuth2 1 lần → copy <strong>Refresh Token</strong> → dán vào đây</li>
              </ol>
            </div>
          </div>
        </div>

        {zaloLoading ? (
          <div className="px-5 py-8 flex justify-center">
            <Loader2 size={20} className="text-gray-300 animate-spin" />
          </div>
        ) : (
          <div className="px-5 py-5 space-y-4">
            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {zaloEnabled
                  ? <Bell size={16} className="text-green-500" />
                  : <BellOff size={16} className="text-gray-400" />
                }
                <span className="text-sm font-semibold text-gray-800">Bật thông báo khi có đơn online</span>
              </div>
              <button
                onClick={() => setZaloEnabled(!zaloEnabled)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${zaloEnabled ? 'bg-green-500' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${zaloEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Group ID */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Group ID (GMF Group)</label>
              <input
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                placeholder="Ví dụ: g8xxxxxxxxxxxxxxxx"
                className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-400 bg-gray-50 text-gray-800 placeholder-gray-300 font-mono"
              />
              <p className="text-xs text-gray-400 mt-1 ml-1">Lấy Group ID trong Zalo OA Manager → nhóm GMF đã tạo.</p>
            </div>

            {/* Refresh token */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Refresh Token (nhập khi cần cập nhật)</label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={refreshToken}
                  onChange={(e) => setRefreshToken(e.target.value)}
                  placeholder="Dán refresh_token vào đây..."
                  className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 pr-10 outline-none focus:border-blue-400 bg-gray-50 text-gray-800 placeholder-gray-300 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1 ml-1">
                Bỏ trống nếu không muốn thay đổi token hiện tại. Refresh token Zalo có hiệu lực 90 ngày và tự gia hạn.
              </p>
            </div>

            {zaloError && (
              <p className="text-xs text-red-500 font-medium">{zaloError}</p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleZaloSave}
                disabled={zaloSaving}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition disabled:opacity-60"
              >
                {zaloSaving ? <Loader2 size={14} className="animate-spin" /> : zaloSaved ? <Check size={14} /> : <RefreshCw size={14} />}
                {zaloSaved ? 'Đã lưu!' : 'Lưu cấu hình'}
              </button>

              <button
                onClick={handleZaloTest}
                disabled={testing}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold px-4 py-2.5 rounded-xl transition disabled:opacity-60"
              >
                {testing ? <Loader2 size={14} className="animate-spin" /> : <TestTube size={14} />}
                Gửi thử
              </button>
            </div>

            {testResult && (
              <div className={`text-xs font-medium px-3 py-2 rounded-xl ${testResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {testResult.ok ? '✓ ' : '✗ '}{testResult.msg}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
