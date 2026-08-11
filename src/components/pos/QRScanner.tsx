'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2 } from 'lucide-react';

interface Props {
  onScan: (text: string) => void;
  onClose: () => void;
}

const ELEMENT_ID = 'hayla-qr-reader';

// Kill camera tracks BEFORE clear() so the <video> element is still in DOM
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
  // Phase 1: mount a placeholder so document.body is available
  // Phase 2: portal is rendered → #hayla-qr-reader is in DOM → camera can init
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [scanned, setScanned] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);
  const doneRef = useRef(false);
  // Always-current ref so the scan callback never captures a stale onScan
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shutdown = async (target?: any) => {
    const s = target ?? scannerRef.current;
    if (!s) return;
    if (s === scannerRef.current) scannerRef.current = null;
    try {
      if (s.isScanning) await s.stop();
    } catch { /* already stopped or not yet started */ }
    killAllTracks(); // before clear() — video must still be in DOM
    try { s.clear(); } catch { /* ignore */ }
  };

  // Phase 1: mark as ready so the portal renders and puts #hayla-qr-reader in DOM
  useEffect(() => {
    setReady(true);
  }, []);

  // Phase 2: init camera only after the portal is in the DOM
  useEffect(() => {
    if (!ready) return;

    let mounted = true;

    const init = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!mounted) return;

        const scanner = new Html5Qrcode(ELEMENT_ID);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 12, qrbox: { width: 220, height: 220 } },
          async (text: string) => {
            if (doneRef.current || !mounted) return;
            doneRef.current = true;
            setScanned(true);
            await shutdown();
            if (mounted) onScanRef.current(text);
          },
          undefined
        );

        // Component unmounted while start() was still in-flight — shut down the
        // camera that just opened (scannerRef may already be null from an external
        // shutdown() call, so pass the local reference directly)
        if (!mounted) await shutdown(scanner);
      } catch (e) {
        if (!mounted) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(
          msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')
            ? 'Không có quyền camera. Hãy cho phép trong cài đặt trình duyệt.'
            : `Không thể mở camera: ${msg}. Hãy dùng Chrome trên Android hoặc Safari iOS.`
        );
      }
    };

    init();

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') shutdown();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', onVisibility);
      shutdown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const handleClose = async () => {
    await shutdown();
    onClose();
  };

  // Don't render anything until client-side mount (avoids SSR hydration issues)
  if (!ready) return null;

  // Render via portal so the overlay is at document.body level,
  // completely outside CartDrawer's stacking context / backdrop-filter / transforms.
  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center px-6"
           style={{ zIndex: 9999 }}>
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

          {/* Corner guides + scan line */}
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
      </div>

      {/* Global styles injected at portal level — not scoped by styled-jsx */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes hayla-qr-scan {
          0%, 100% { top: 12px; }
          50%       { top: calc(100% - 12px); }
        }
        .hayla-scan-line { animation: hayla-qr-scan 2s ease-in-out infinite; }
        #hayla-qr-reader video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
        #hayla-qr-reader { position: relative !important; }
      `}} />
    </>,
    document.body
  );
}
