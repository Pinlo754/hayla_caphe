'use client';

import React from 'react';

// Icon Micro - Đổi từ react-native-svg sang thẻ <svg> chuẩn của HTML
export const MicroIcon = ({ size = 24 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
      fill="white"
    />
    <path
      d="M19 10v2a7 7 0 0 1-14 0v-2"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 19v4M8 23h8"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface MicrophoneProps {
  isActive: boolean;
  size?: number;
  color?: string;
}

const Microphone: React.FC<MicrophoneProps> = ({
  isActive,
  size = 100,
  color = '#FFEFA0',
}) => {
  const iconSize = size * 0.4;

  return (
    <div
      className="relative flex justify-center items-center"
      style={{ width: size * 2.5, height: size * 2.5 }}
    >
      {/* Sử dụng thẻ <style> để inject CSS Keyframes động dựa trên prop `size`
        Điều này thay thế hoàn toàn logic Animated.loop của React Native.
      */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes ripple-0 {
            0% { transform: scale(1); opacity: 0.6; }
            100% { transform: scale(1.8); opacity: 0; }
          }
          @keyframes ripple-1 {
            0% { transform: scale(1); opacity: 0.6; }
            100% { transform: scale(2.1); opacity: 0; }
          }
          @keyframes ripple-2 {
            0% { transform: scale(1); opacity: 0.6; }
            100% { transform: scale(2.4); opacity: 0; }
          }
          .animate-ripple-0 { animation: ripple-0 1.5s ease-out infinite; }
          .animate-ripple-1 { animation: ripple-1 1.5s ease-out infinite; }
          .animate-ripple-2 { animation: ripple-2 1.5s ease-out infinite; }
        `
      }} />

      {isActive && (
        <>
          <div
            className="absolute rounded-full animate-ripple-0"
            style={{ width: size, height: size, backgroundColor: color }}
          />
          <div
            className="absolute rounded-full animate-ripple-1"
            style={{ width: size, height: size, backgroundColor: color }}
          />
          <div
            className="absolute rounded-full animate-ripple-2"
            style={{ width: size, height: size, backgroundColor: color }}
          />
        </>
      )}

      {/* Micro chính */}
      <div
        className="relative z-10 flex justify-center items-center rounded-full shadow-md"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
        }}
      >
        <MicroIcon size={iconSize} />
      </div>
    </div>
  );
};

export default Microphone;