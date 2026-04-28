'use client';

import React from 'react';

interface CustomSliderProps {
  value?: number; // Nhận giá trị từ 0 đến 1
  onChange: (value: number) => void;
}

const CustomSlider: React.FC<CustomSliderProps> = ({ value = 0.5, onChange }) => {
  // Map giá trị 0-1 thành phần trăm cho giao diện slider
  const safeValue = Math.min(Math.max(value * 100, 0), 100);

  return (
    // Wrapper chính: Bo góc tròn, độ dày 24px, màu nền hồng nhạt
    <div className="relative w-full h-[24px] flex items-center rounded-full bg-[#F38096]/30">
      
      {/* Thanh Fill (Phần đã kéo): Màu hồng đậm, chiều rộng chạy theo % */}
      <div
        className="absolute left-0 h-full bg-[#F38096] rounded-full pointer-events-none"
        style={{ width: `${safeValue}%` }}
      />

      {/* Vùng giới hạn an toàn: Ép cục Thumb không bao giờ bị trôi ra khỏi mép ngoài */}
      <div className="absolute left-[2px] right-[2px] h-[20px] pointer-events-none">
        
        {/* Cục Thumb trắng */}
        <div
          className="absolute top-0 h-full w-[20px] bg-white rounded-full shadow-md flex items-center justify-center"
          style={{
            // Công thức ma thuật: Đẩy thumb ra đúng vị trí % nhưng lùi lại chính xác kích thước của nó 
            // để thumb luôn nằm lọt thỏm bên trong thanh slider
            left: `${safeValue}%`,
            transform: `translateX(-${safeValue}%)`,
          }}
        >
          {/* Biểu tượng Pause "II" màu hồng bên trong cục Thumb */}
          <div className="flex gap-[3px]">
            <div className="w-[3px] h-[10px] bg-[#F38096] rounded-full" />
            <div className="w-[3px] h-[10px] bg-[#F38096] rounded-full" />
          </div>
        </div>
      </div>

      {/* Input Range Tàng Hình: Hứng toàn bộ sự kiện chạm vuốt của người dùng */}
      <input
        type="range"
        min="0"
        max="100"
        value={safeValue}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 m-0"
        aria-label="Điều chỉnh âm lượng"
      />
    </div>
  );
};

export default CustomSlider;