'use client';

import { create } from 'zustand';

interface UIPrefs {
  soundEnabled: boolean;
  showCoordinates: boolean;
  pieceSet: 'classic' | 'neo';
  boardTheme: 'midnight' | 'emerald' | 'cyber';
  setSoundEnabled: (v: boolean) => void;
  setShowCoordinates: (v: boolean) => void;
  setPieceSet: (v: UIPrefs['pieceSet']) => void;
  setBoardTheme: (v: UIPrefs['boardTheme']) => void;
}

export const useUIPrefs = create<UIPrefs>((set) => ({
  soundEnabled: true,
  showCoordinates: true,
  pieceSet: 'classic',
  boardTheme: 'midnight',
  setSoundEnabled: (v) => set({ soundEnabled: v }),
  setShowCoordinates: (v) => set({ showCoordinates: v }),
  setPieceSet: (v) => set({ pieceSet: v }),
  setBoardTheme: (v) => set({ boardTheme: v }),
}));
