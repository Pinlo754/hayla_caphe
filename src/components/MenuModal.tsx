'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface MenuModalProps {
  visible: boolean;
  onClose: () => void;
}

const MenuModal: React.FC<MenuModalProps> = ({ visible, onClose }) => {
  const router = useRouter();

  const handleChangeCharacter = () => {
    onClose();
    router.push('/select-character');
  }

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Lớp phủ Overlay tối màu */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/20"
          />

          {/* Hộp thoại Modal chính */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            // Bo góc lớn hơn, bỏ viền, thêm shadow mềm giống thiết kế
            className="relative w-[85%] max-w-sm bg-white rounded-[32px] p-6 pb-8 flex flex-col items-center shadow-[0_8px_30px_rgb(0,0,0,0.1)]"
          >
            {/* Header: Chữ CÀI ĐẶT nổi lên trên */}
            <div className="absolute -top-6 bg-white px-8 py-2 rounded-[20px] border border-gray-100 shadow-sm flex items-center justify-center">
              <span
                className="text-[#F38096]" // Màu hồng nhạt chuẩn theo ảnh
                style={{ fontFamily: 'bungee', fontSize: 24, letterSpacing: '0.5px' }}
              >
                MENU
              </span>
            </div>

            {/* Khu vực chứa các Slider */}
            <div className="w-full mt-10 mb-6 flex flex-col gap-6">
              
            </div>

            {/* Nút THOÁT to ở dưới cùng */}
            <button
              className="bg-[#F38096] rounded-[26px] h-14 px-12 flex items-center justify-center hover:bg-[#e67389] active:scale-95 transition-all shadow-md"
              onClick={handleChangeCharacter}
            >
              <span style={{ fontFamily: 'bungee', fontSize: 20, color: '#FFFFFF', letterSpacing: '1px' }}>
                ĐỔI NHÂN VẬT
              </span>
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MenuModal;
