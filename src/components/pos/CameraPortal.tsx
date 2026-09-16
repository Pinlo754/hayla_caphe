'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SwitchCamera } from 'lucide-react';
import { compressImage } from '@/app/lib/firebaseStorage';

export type CameraFacing = 'user' | 'environment';

interface CameraPortalProps {
  title: string;
  onCapture: (blob: Blob) => void;
  onClose: () => void;
  /** Camera mở đầu tiên — 'user' (camera trước, selfie) hoặc 'environment' (camera sau). Mặc định 'user'. */
  defaultFacing?: CameraFacing;
}

/** Fullscreen camera capture portal — used for shift check-in/out and task proof photos */
export default function CameraPortal({ title, onCapture, onClose, defaultFacing = 'user' }: CameraPortalProps) {
  const [ready, setReady] = useState(false);
  const [facing, setFacing] = useState<CameraFacing>(defaultFacing);
  const [switching, setSwitching] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => { setReady(true); }, []);

  useEffect(() => {
    if (!ready) return;
    let mounted = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing }, audio: false })
      .then((stream) => {
        if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {})
      .finally(() => { if (mounted) setSwitching(false); });
    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [ready, facing]);

  const handleSwitchCamera = () => {
    setSwitching(true);
    setFacing((f) => (f === 'user' ? 'environment' : 'user'));
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const compressed = await compressImage(blob, 800, 0.8);
      onCapture(compressed);
    }, 'image/jpeg', 0.9);
  };

  if (!ready) return null;
  return createPortal(
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[9999]">
      <p className="text-white/80 text-sm mb-4">{title}</p>
      <div className="relative w-full max-w-sm" style={{ maxHeight: '60vh' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full rounded-2xl object-cover"
          style={{ maxHeight: '60vh' }}
        />
        <button
          onClick={handleSwitchCamera}
          disabled={switching}
          title="Đổi camera trước/sau"
          className="absolute top-3 right-3 bg-black/50 text-white p-2.5 rounded-full backdrop-blur-sm disabled:opacity-50"
        >
          <SwitchCamera size={18} className={switching ? 'animate-pulse' : ''} />
        </button>
      </div>
      <p className="text-white/40 text-[11px] mt-2">
        {facing === 'user' ? 'Camera trước' : 'Camera sau'}
      </p>
      <div className="flex gap-4 mt-4">
        <button
          onClick={onClose}
          className="px-6 py-3 bg-white/20 text-white rounded-full font-bold text-sm"
        >
          Hủy
        </button>
        <button
          onClick={capture}
          className="px-8 py-3 bg-orange-500 text-white rounded-full font-bold text-sm shadow-lg"
        >
          Chụp ảnh
        </button>
      </div>
    </div>,
    document.body
  );
}
