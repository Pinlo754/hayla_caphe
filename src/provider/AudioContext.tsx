'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AudioSettings {
  music: number;
  sound: number;
  mic: number;
  setMusic: (v: number) => void;
  setSound: (v: number) => void;
  setMic: (v: number) => void;
}

const AudioContext = createContext<AudioSettings | null>(null);

export const AudioProvider = ({ children }: { children: React.ReactNode }) => {
  const [music, setMusicState] = useState(0.5);
  const [sound, setSoundState] = useState(0.5);
  const [mic, setMicState] = useState(0.5);

  const clampVolume = (val: number) => Math.min(Math.max(val, 0), 1);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedMusic = localStorage.getItem('audio-music');
    const savedSound = localStorage.getItem('audio-sound');
    const savedMic = localStorage.getItem('audio-mic');

    if (savedMusic !== null) {
      const parsed = parseFloat(savedMusic);
      if (!Number.isNaN(parsed)) setMusicState(clampVolume(parsed));
    }
    if (savedSound !== null) {
      const parsed = parseFloat(savedSound);
      if (!Number.isNaN(parsed)) setSoundState(clampVolume(parsed));
    }
    if (savedMic !== null) {
      const parsed = parseFloat(savedMic);
      if (!Number.isNaN(parsed)) setMicState(clampVolume(parsed));
    }
  }, []);
  // Save to localStorage whenever settings change
  useEffect(() => {
    localStorage.setItem('audio-music', music.toString());
  }, [music]);

  useEffect(() => {
    localStorage.setItem('audio-sound', sound.toString());
  }, [sound]);

  useEffect(() => {
    localStorage.setItem('audio-mic', mic.toString());
  }, [mic]);

  return (
    <AudioContext.Provider 
      value={{ 
        music, 
        sound, 
        mic, 
        setMusic: (v) => setMusicState(clampVolume(v)),
        setSound: (v) => setSoundState(clampVolume(v)),
        setMic: (v) => setMicState(clampVolume(v))
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('useAudio must be used inside AudioProvider');
  return ctx;
};
