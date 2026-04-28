'use client';

import Image from 'next/image';
import React from 'react';

interface SettingButtonProps {
  onPress?: () => void;
}

const SettingButton: React.FC<SettingButtonProps> = ({ onPress }) => {
  return (
    <button
      onClick={onPress}
      className="hover:opacity-80 transition-opacity"
      aria-label="Settings"
    >
      <Image
        src="/assets/setting-button.png"
        alt="Settings"
        width={48}
        height={48}
        className="w-12 h-12"
      />
    </button>
  );
};

export default SettingButton;
