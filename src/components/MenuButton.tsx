'use client';

import Image from 'next/image';
import React from 'react';

interface MenuButtonProps {
  onPress?: () => void;
}

const MenuButton: React.FC<MenuButtonProps> = ({ onPress }) => {
  return (
    <button
      onClick={onPress}
      className="hover:opacity-80 transition-opacity"
      aria-label="Menu"
    >
      <Image
        src="/assets/menu-button.png"
        alt="Menu"
        width={48}
        height={48}
        className="w-12 h-12"
      />
    </button>
  );
};

export default MenuButton;
