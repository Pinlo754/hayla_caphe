'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, X, CheckCircle2, ImageUp } from 'lucide-react';

interface Props {
  file: File | null;
  onChange: (file: File | null) => void;
}

export default function ReceiptCapture({ file, onChange }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Build / revoke object URL for preview
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onChange(f);
    e.target.value = ''; // allow re-selecting same file
  };

  return (
    <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-3xl">
      <div className="flex items-center justify-between mb-3">
        <p className="font-bold text-amber-800 text-sm flex items-center gap-1.5">
          <Camera size={15} />
          Ảnh biên lai chuyển khoản
          <span className="text-red-500">*</span>
        </p>
        {file && (
          <span className="flex items-center gap-1 text-green-600 text-[11px] font-bold">
            <CheckCircle2 size={13} /> Đã có ảnh
          </span>
        )}
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleSelect}
        className="hidden"
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        onChange={handleSelect}
        className="hidden"
      />

      {preview ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Biên lai"
            className="w-full max-h-64 object-contain rounded-2xl bg-white border border-amber-200"
          />
          <button
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full backdrop-blur-sm"
          >
            <X size={16} />
          </button>
          <button
            onClick={() => cameraRef.current?.click()}
            className="mt-2 w-full py-2 text-xs font-bold text-amber-700 bg-amber-100 rounded-xl hover:bg-amber-200 transition"
          >
            Chụp / chọn lại
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1.5 py-5 bg-white border-2 border-dashed border-amber-300 rounded-2xl text-amber-700 hover:bg-amber-100 transition active:scale-95"
          >
            <Camera size={24} />
            <span className="text-xs font-bold">Chụp ảnh</span>
          </button>
          <button
            onClick={() => galleryRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1.5 py-5 bg-white border-2 border-dashed border-amber-300 rounded-2xl text-amber-700 hover:bg-amber-100 transition active:scale-95"
          >
            <ImageUp size={24} />
            <span className="text-xs font-bold">Chọn từ máy</span>
          </button>
        </div>
      )}
    </div>
  );
}
