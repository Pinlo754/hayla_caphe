'use client';

import { useEffect, useRef, useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';

interface Props {
  onScan: (text: string) => void;
  onClose: () => void;
}

const ELEMENT_ID = 'hayla-qr-reader';

// Force-kill every MediaStreamTrack inside the scanner div + any lingering streams
function killAllTracks() {
  try {
    const el = document.getElementById(ELEMENT_ID);
    el?.querySelectorAll('video').forEach((video) => {
      (video.srcObject as MediaStream | null)?.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    });
  } catch { /* ignore */ }
}

export default function QRScanner({ onScan, onClose }: Props) {
  const [error, setError] = useState('');
  const [scanned, setScanned] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);
  const doneRef = useRef(false);

  // Fully stop scanner + release camera
  const shutdown = async () => {
    const s = scannerRef.current;
    if (!s) return;
    scannerRef.current = null;
    try {
      if (s.isScanning) await s.stop();
    } catch { /* already stopped */ }
    try { s.clear(); } catch { /* ignore */ }
    killAllTracks();
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        // Unmounted before the dynamic import finished → never touch the camera
        if (!mounted) return;

        const scanner = new Html5Qrcode(ELEMENT_ID);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 12, qrbox: { width: 240, height: 240 } },
          async (text) => {
            if (doneRef.current || !mounted) return;
            doneRef.current = true;
            setScanned(true);
            await shutdown();           // camera off before calling parent
            if (mounted) onScan(text);
          },
          undefined
        );

        // Unmounted while start() was still resolving → kill the camera it just opened
        if (!mounted) await shutdown();
      } catch (e) {
        if (!mounted) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(
          msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')
            ? 'Không có quyền camera. Hãy cho phép trong cài đặt trình duyệt.'
            : 'Không thể mở camera. Hãy dùng Chrome trên Android.'
        );
      }
    };

    init();

    // Release camera if the user switches tab / minimises the app mid-scan
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') shutdown();
    };
    document.addEventListener('visibilitychange', onVisibility);
    // Release camera when navigating away / closing the tab
    window.addEventListener('pagehide', shutdown);

    // Cleanup on unmount (close button, success, parent route change, etc.)
    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', shutdown);
      shutdown();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = async () => {
    await shutdown();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center px-6">
      <p className="text-white/70 text-sm mb-5">Hướng camera vào mã QR trên thẻ tích điểm</p>

      {/* Scanner box */}
      <div className="relative w-72 h-72 bg-black rounded-2xl overflow-hidden">
        <div id={ELEMENT_ID} className="w-full h-full" />

        {/* Success overlay */}
        {scanned && (
          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 size={64} className="text-green-400" />
          </div>
        )}

        {/* Corner guides */}
        {!error && !scanned && (
          <>
            <div className="absolute top-3 left-3 w-7 h-7 border-t-[3px] border-l-[3px] border-orange-400 rounded-tl-lg pointer-events-none" />
            <div className="absolute top-3 right-3 w-7 h-7 border-t-[3px] border-r-[3px] border-orange-400 rounded-tr-lg pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-7 h-7 border-b-[3px] border-l-[3px] border-orange-400 rounded-bl-lg pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-7 h-7 border-b-[3px] border-r-[3px] border-orange-400 rounded-br-lg pointer-events-none" />
            <div className="absolute left-3 right-3 h-0.5 bg-orange-400/70 animate-[scan_2s_ease-in-out_infinite] pointer-events-none" />
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 bg-red-500/20 border border-red-500/40 text-red-300 px-4 py-3 rounded-2xl text-sm text-center max-w-xs">
          {error}
        </div>
      )}

      {!scanned && (
        <button
          onClick={handleClose}
          className="mt-8 flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white px-6 py-3 rounded-full font-bold transition"
        >
          <X size={18} />
          Hủy quét
        </button>
      )}

      <style jsx>{`
        @keyframes scan {
          0%, 100% { top: 12px; }
          50% { top: calc(100% - 12px); }
        }
      `}</style>
    </div>
  );
}
