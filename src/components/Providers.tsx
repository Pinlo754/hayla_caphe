'use client'; // Chiếc bùa chú siêu quan trọng để biến đây thành hộp đồ chơi của Client!

import React from 'react';
import { ConversationProvider } from "@elevenlabs/react";
import { AudioProvider } from '@/provider/AudioContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConversationProvider>
      <AudioProvider>
        {children}
      </AudioProvider>
    </ConversationProvider>
  );
}