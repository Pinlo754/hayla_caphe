'use client';

import { useEffect, useRef, useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';

interface Props {
  onScan: (text: string) => void;
  onClose: () => void;
}

const ELEMENT_ID = 'hayla-qr-reader';

// Stop all MediaStreamTracks inside the scanner div (must be called BEFORE clear())
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
  // Always-current callback ref — avoids stale closure in the scanner callback
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  /**
   * Stop and clean up the scanner.
   * `target` lets callers pass the scanner instance directly to handle the
   * race where shutdown() was already called (nulled scannerRef) but start()
   * hadn't completed yet, leaving the camera running.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shutdown = async (target?: any) => {
    const s = target ?? scannerRef.current;
    if (!s) return;
    // Clear the ref only when using the ref's value (not an external target)
    if (!target) scannerRef.current = null;
    else if (s === scannerRef.current) scannerRef.current = null;

    try {
      if (s.isScanning) await s.stop();
    } catch { /* already stopped or not yet started */ }

    // Kill tracks BEFORE clear() so the <video> element still exists in DOM
    killAllTracks();
    try { s.clear(); } catch { /* ignore */ }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!mounted) return;

        const scanner = new Html5Qrcode(ELEMENT_ID);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 12, qrbox: { width: 240, height: 240 } },
          async (text: string) => {
            if (doneRef.current || !mounted) return;
            doneRef.current = true;
            setScanned(true);
            await shutdown();
            if (mounted) onScanRef.current(text);
          },
          undefined
        );

        // If component unmounted while start() was still resolving, stop it now.
        // Pass `scanner` directly because shutdown() may have already nulled scannerRef.
        if (!mounted) await shutdown(scanner);
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

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') shutdown();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', () => shutdown());

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', onVisibility);
      shutdown();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = async () => {
    await shutdown();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-200 bg-black/95 flex flex-col items-center justify-center px-6">
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

        {/* Corner guides + animated scan line */}
        {!error && !scanned && (
          <>
            <div className="absolute top-3 left-3 w-7 h-7 border-t-[3px] border-l-[3px] border-orange-400 rounded-tl-lg pointer-events-none" />
            <div className="absolute top-3 right-3 w-7 h-7 border-t-[3px] border-r-[3px] border-orange-400 rounded-tr-lg pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-7 h-7 border-b-[3px] border-l-[3px] border-orange-400 rounded-bl-lg pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-7 h-7 border-b-[3px] border-r-[3px] border-orange-400 rounded-br-lg pointer-events-none" />
            <div className="absolute left-3 right-3 h-0.5 bg-orange-400/70 pointer-events-none hayla-scan-line" />
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

      {/*
        Use dangerouslySetInnerHTML instead of <style jsx> so:
        1. Keyframes are global (not scoped by styled-jsx), matching the CSS class below.
        2. Works correctly with Turbopack (Next.js 15/16).
        3. Video fill CSS ensures html5-qrcode's <video> fills the container.
      */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes hayla-qr-scan {
          0%, 100% { top: 12px; }
          50% { top: calc(100% - 12px); }
        }
        .hayla-scan-line {
          animation: hayla-qr-scan 2s ease-in-out infinite;
        }
        #${ELEMENT_ID} video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
      `}} />
    </div>
  );
}
