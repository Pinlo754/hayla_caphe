'use client';

import { useState } from 'react';
import { Camera, LogIn } from 'lucide-react';
import { useShiftStore } from '@/store/useShiftStore';
import CameraPortal from './CameraPortal';

/**
 * Blocks the POS until the current device identifies which staff member is
 * using it today. Mirrors the shift check-in used for task tracking, but
 * gates the whole app instead of just the checklist tab.
 */
export default function ShiftGate() {
  const doCheckIn = useShiftStore((s) => s.doCheckIn);

  const [staffName, setStaffName] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCheckIn = async (photoBlob?: Blob) => {
    if (!staffName.trim()) return;
    setLoading(true);
    setError('');
    try {
      await doCheckIn(staffName.trim(), photoBlob);
    } catch {
      setError('Không thể check-in, vui lòng thử lại.');
    } finally {
      setLoading(false);
      setShowCamera(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {showCamera && (
        <CameraPortal
          title="Chụp ảnh check-in"
          onCapture={(blob) => { setShowCamera(false); handleCheckIn(blob); }}
          onClose={() => setShowCamera(false)}
        />
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="text-6xl mb-4">☕</div>
        <h1 className="font-bold text-orange-600 text-2xl italic mb-1">Hay là cà phê</h1>
        <p className="text-sm text-gray-500 mb-8 text-center">Nhập tên để bắt đầu ca làm việc hôm nay</p>

        <div className="w-full max-w-xs space-y-3">
          <input
            type="text"
            placeholder="Tên nhân viên"
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
            className="w-full border rounded-2xl px-4 py-3 text-gray-800 text-sm outline-none focus:border-orange-400"
            autoFocus
          />

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}

          <button
            disabled={!staffName.trim() || loading}
            onClick={() => setShowCamera(true)}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-3.5 rounded-2xl font-bold text-sm disabled:bg-gray-200 disabled:text-gray-400 shadow-lg shadow-orange-200 transition"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Camera size={18} />
                Check-in với ảnh
              </>
            )}
          </button>

          <button
            disabled={!staffName.trim() || loading}
            onClick={() => handleCheckIn()}
            className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-600 py-3 rounded-2xl font-bold text-sm disabled:opacity-40 transition"
          >
            <LogIn size={16} />
            Check-in không ảnh
          </button>
        </div>
      </div>
    </div>
  );
}
