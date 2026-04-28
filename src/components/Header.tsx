'use client';

import React, { useState } from 'react';
import SettingButton from './SettingButton';
import MenuButton from './MenuButton';
import SettingModal from './SettingModal';
import MenuModal from './MenuModal';
import RatingModal from './RatingModal';

const Header = () => {
  const [isSettingVisible, setSettingVisible] = useState(false);
  const [isRatingVisible, setRatingVisible] = useState(false);
  const [isMenuVisible, setMenuVisible] = useState(false);

  const openSettings = () => setSettingVisible(true);
  const closeSettings = () => setSettingVisible(false);
  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  return (
    <>
      <div className="w-full flex justify-between px-10 mt-10">
        <SettingButton onPress={openSettings} />
        <MenuButton onPress={openMenu} />
      </div>

      <MenuModal visible={isMenuVisible} onClose={closeMenu} />
      <SettingModal visible={isSettingVisible} onClose={closeSettings} />
      <RatingModal visible={isRatingVisible} onClose={() => setRatingVisible(false)} />
    </>
  );
};

export default Header;
