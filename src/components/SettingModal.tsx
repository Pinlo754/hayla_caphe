'use client';

import React from 'react';
import { Music, Volume2, Mic } from 'lucide-react';
import CustomSlider from './CustomSlider';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudio } from '@/provider/AudioContext';

interface SettingModalProps {
  visible: boolean;
  onClose: () => void;
}

const SettingModal: React.FC<SettingModalProps> = ({ visible, onClose }) => {
  // Lấy state từ Context
  const { music, sound, mic, setMusic, setSound, setMic } = useAudio();

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
                CÀI ĐẶT
              </span>
            </div>

            {/* Khu vực chứa các Slider */}
            <div className="w-full mt-10 mb-6 flex flex-col gap-6">
              {/* Music */}
              <div className="flex items-center gap-4 w-full">
                <Music color="#F38096" size={32} strokeWidth={2.5} className="flex-shrink-0" />
                <div className="flex-1">
                  <CustomSlider value={music} onChange={setMusic} />
                </div>
              </div>

              {/* Sound */}
              <div className="flex items-center gap-4 w-full">
                <Volume2 color="#F38096" size={32} strokeWidth={2.5} className="flex-shrink-0" />
                <div className="flex-1">
                  <CustomSlider value={sound} onChange={setSound} />
                </div>
              </div>

              {/* Mic */}
              <div className="flex items-center gap-4 w-full">
                <Mic color="#F38096" size={32} strokeWidth={2.5} className="flex-shrink-0" />
                <div className="flex-1">
                  <CustomSlider value={mic} onChange={setMic} />
                </div>
              </div>
            </div>

            {/* Nút THOÁT to ở dưới cùng */}
            <button
              className="bg-[#F38096] rounded-[26px] h-14 px-12 flex items-center justify-center hover:bg-[#e67389] active:scale-95 transition-all shadow-md"
              onClick={onClose}
            >
              <span style={{ fontFamily: 'bungee', fontSize: 20, color: '#FFFFFF', letterSpacing: '1px' }}>
                THOÁT
              </span>
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SettingModal;