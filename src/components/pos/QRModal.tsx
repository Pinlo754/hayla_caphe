'use client';

import { X } from 'lucide-react';

interface Props {
  amount: number;
  tableId: number;
  onClose: () => void;
}

export default function QRModal({ amount, tableId, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative bg-white p-4 rounded-[40px] w-full max-w-sm animate-in zoom-in duration-300 flex flex-col items-center">
        <button
          onClick={onClose}
          className="absolute -top-14 right-0 bg-white/20 text-white p-3 rounded-full backdrop-blur-md"
        >
          <X size={24} />
        </button>

        <div className="w-full text-center mb-4 pt-2">
          <h3 className="text-black text-xl">Quét mã thanh toán</h3>
          <p className="text-orange-600 font-bold text-lg">{amount.toLocaleString()}đ</p>
        </div>

        <img
          src={`https://img.vietqr.io/image/VCB-1021950952-compact2.jpg?amount=${amount}&addInfo=Ban%20${tableId}`}
          alt="QR thanh toán"
          className="w-full aspect-square object-contain rounded-2xl mb-4"
        />

        <div className="w-full bg-gray-50 p-4 rounded-3xl text-center mb-2">
          <p className="text-sm text-gray-500 font-medium">Nội dung chuyển khoản:</p>
          <p className="text-lg text-black">BAN {tableId}</p>
        </div>

        <button onClick={onClose} className="w-full py-4 text-gray-400 font-bold text-sm">
          Đóng mã QR
        </button>
      </div>
    </div>
  );
}
