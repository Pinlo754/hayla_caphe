'use client';

import { useEffect, useState } from 'react';
import { getPosSettings, updatePosSettings } from '@/app/lib/firebaseSettings';
import { getFacebookConfig, saveFacebookConfig } from '@/app/lib/firebaseFacebookNotify';
import {
  Download, Loader2, Check, Facebook, Bell, BellOff,
  TestTube, Eye, EyeOff, Save, AlertCircle, Plus, X, UserCircle2,
} from 'lucide-react';

export default function AdminSettingsPage() {
  // ── Receipt auto-download ──────────────────────────────────────────────
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

  // ── Facebook Messenger notification ───────────────────────────────────
  const [fbLoading, setFbLoading] = useState(true);
  const [fbEnabled, setFbEnabled] = useState(false);
  const [pageToken, setPageToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [psids, setPsids] = useState<string[]>([]);
  const [newPsid, setNewPsid] = useState('');
  const [fbSaving, setFbSaving] = useState(false);
  const [fbSaved, setFbSaved] = useState(false);
  const [fbError, setFbError] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    getFacebookConfig()
      .then((cfg) => {
        if (cfg) {
          setFbEnabled(cfg.enabled ?? false);
          setHasToken(!!cfg.pageAccessToken);
          setPsids(cfg.recipientPsids ?? []);
        }
      })
      .finally(() => setFbLoading(false));
  }, []);

  const addPsid = () => {
    const v = newPsid.trim().replace(/\D/g, '');
    if (!v) return;
    if (psids.includes(v)) { setNewPsid(''); return; }
    setPsids([...psids, v]);
    setNewPsid('');
  };

  const removePsid = (p: string) => setPsids(psids.filter((x) => x !== p));

  const handleFbSave = async () => {
    setFbError('');
    if (!pageToken.trim() && !hasToken) { setFbError('Vui lòng nhập Page Access Token'); return; }
    if (psids.length === 0) { setFbError('Thêm ít nhất 1 PSID nhân viên'); return; }
    setFbSaving(true);
    setFbSaved(false);
    try {
      const patch: Parameters<typeof saveFacebookConfig>[0] = {
        enabled: fbEnabled,
        recipientPsids: psids,
      };
      if (pageToken.trim()) {
        patch.pageAccessToken = pageToken.trim();
        patch.pageId = ''; // pageId not needed for /me/messages
      }
      await saveFacebookConfig(patch);
      if (pageToken.trim()) setHasToken(true);
      setPageToken('');
      setFbSaved(true);
      setTimeout(() => setFbSaved(false), 2500);
    } catch {
      setFbError('Lưu thất bại, vui lòng thử lại');
    } finally {
      setFbSaving(false);
    }
  };

  const handleFbTest = async () => {
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
          customerNote: 'Đây là tin nhắn thử nghiệm.',
          items: [{ name: 'Cà phê sữa đá', quantity: 2, price: 35000, size: 'M' }],
          total: 70000,
          paymentMethod: 'cash',
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestResult({
          ok: true,
          msg: data.skipped
            ? 'Thông báo đang tắt. Hãy bật và lưu trước.'
            : `Đã gửi thành công đến ${data.sent}/${psids.length} nhân viên.`,
        });
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
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 disabled:opacity-60 ${autoDownload ? 'bg-orange-500' : 'bg-gray-200'}`}
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
              {posLoading ? '...' : autoDownload ? 'Đang bật' : 'Đã tắt'}
            </span>
          </p>
        </div>
      </div>

      {/* ── Facebook Messenger section ──────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#1877F2]/10 rounded-xl flex items-center justify-center">
              <Facebook size={16} className="text-[#1877F2]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-700">Thông báo qua Messenger</h2>
              <p className="text-xs text-gray-400">Nhắn tin trực tiếp đến nhân viên khi có đơn online</p>
            </div>
          </div>
          {!fbLoading && (
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${fbEnabled ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
              {fbEnabled ? 'Đang bật' : 'Đã tắt'}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="px-5 py-4 bg-[#1877F2]/5">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={15} className="text-[#1877F2] mt-0.5 shrink-0" />
            <div className="text-xs text-[#1877F2]/80 space-y-2 leading-relaxed">
              <div>
                <p className="font-semibold text-[#1877F2] mb-1">Yêu cầu setup:</p>
                <ol className="list-decimal ml-4 space-y-0.5">
                  <li>Tạo Facebook App (loại Business) → thêm sản phẩm <strong>Messenger</strong></li>
                  <li>Cấp quyền <code className="bg-white/60 px-1 rounded">pages_messaging</code> cho App</li>
                  <li>Lấy <strong>Long-lived Page Access Token</strong> từ Graph API Explorer</li>
                  <li>Mỗi nhân viên nhắn 1 tin vào Page → lấy PSID của họ (xem hướng dẫn bên dưới)</li>
                </ol>
              </div>
              <div className="bg-white/50 rounded-lg p-2.5 border border-[#1877F2]/15">
                <p className="font-semibold text-[#1877F2] mb-1">Cách lấy PSID của nhân viên:</p>
                <p>Sau khi nhân viên nhắn tin vào Page, vào <strong>Graph API Explorer</strong> và gọi:</p>
                <code className="block mt-1 bg-white/70 rounded px-2 py-1 text-[#1877F2] font-mono text-[11px] break-all">
                  GET /me/conversations?fields=participants&access_token=&#123;PAGE_TOKEN&#125;
                </code>
                <p className="mt-1">Tìm tên nhân viên trong kết quả → copy trường <strong>"id"</strong> — đó là PSID.</p>
              </div>
            </div>
          </div>
        </div>

        {fbLoading ? (
          <div className="px-5 py-8 flex justify-center">
            <Loader2 size={20} className="text-gray-300 animate-spin" />
          </div>
        ) : (
          <div className="px-5 py-5 space-y-5">
            {/* Enable toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {fbEnabled ? <Bell size={15} className="text-green-500" /> : <BellOff size={15} className="text-gray-400" />}
                <span className="text-sm font-semibold text-gray-800">Gửi thông báo khi có đơn online</span>
              </div>
              <button
                onClick={() => setFbEnabled(!fbEnabled)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${fbEnabled ? 'bg-[#1877F2]' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${fbEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Page Access Token */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                Page Access Token
                {hasToken && !pageToken && (
                  <span className="ml-2 text-green-600 font-normal normal-case">✓ Đã có token</span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={pageToken}
                  onChange={(e) => setPageToken(e.target.value)}
                  placeholder={hasToken ? 'Để trống nếu không đổi token' : 'Dán Long-lived Page Access Token...'}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 pr-10 outline-none focus:border-[#1877F2]/60 bg-gray-50 text-gray-800 placeholder-gray-300 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* PSID list */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                Danh sách PSID nhân viên
                <span className="ml-2 text-gray-400 font-normal normal-case">({psids.length} người)</span>
              </label>

              {psids.length > 0 && (
                <div className="space-y-2 mb-2">
                  {psids.map((p) => (
                    <div key={p} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                      <UserCircle2 size={15} className="text-[#1877F2] shrink-0" />
                      <span className="flex-1 text-sm font-mono text-gray-700">{p}</span>
                      <button
                        onClick={() => removePsid(p)}
                        className="text-gray-300 hover:text-red-400 transition p-0.5"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add PSID input */}
              <div className="flex gap-2">
                <input
                  value={newPsid}
                  onChange={(e) => setNewPsid(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => e.key === 'Enter' && addPsid()}
                  placeholder="Nhập PSID (chỉ số)..."
                  inputMode="numeric"
                  className="flex-1 text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#1877F2]/60 bg-gray-50 text-gray-800 placeholder-gray-300 font-mono"
                />
                <button
                  onClick={addPsid}
                  disabled={!newPsid.trim()}
                  className="flex items-center gap-1.5 bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] text-sm font-bold px-3.5 py-2.5 rounded-xl transition disabled:opacity-40"
                >
                  <Plus size={15} />
                  Thêm
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5 ml-1">
                PSID là dãy số dài ~15 chữ số. Nhấn Enter hoặc nút Thêm để thêm vào danh sách.
              </p>
            </div>

            {fbError && (
              <p className="text-xs text-red-500 font-medium flex items-center gap-1.5">
                <AlertCircle size={12} /> {fbError}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleFbSave}
                disabled={fbSaving}
                className="flex items-center gap-2 bg-[#1877F2] hover:bg-[#1877F2]/90 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition disabled:opacity-60"
              >
                {fbSaving ? <Loader2 size={14} className="animate-spin" /> : fbSaved ? <Check size={14} /> : <Save size={14} />}
                {fbSaved ? 'Đã lưu!' : 'Lưu cấu hình'}
              </button>

              <button
                onClick={handleFbTest}
                disabled={testing}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold px-4 py-2.5 rounded-xl transition disabled:opacity-60"
              >
                {testing ? <Loader2 size={14} className="animate-spin" /> : <TestTube size={14} />}
                Gửi thử
              </button>
            </div>

            {testResult && (
              <div className={`text-xs font-medium px-3 py-2.5 rounded-xl flex items-start gap-2 ${testResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                <span className="shrink-0 mt-px">{testResult.ok ? '✓' : '✗'}</span>
                <span>{testResult.msg}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
