'use client';

import { create } from 'zustand';
import type { GameStateSnapshot, ChatMessage, MoveRecord, PieceColor } from '@/types/chess';

interface GameStore {
  game: GameStateSnapshot | null;
  orientation: 'white' | 'black';
  selectedSquare: string | null;
  drawOffer: PieceColor | null;
  chat: ChatMessage[];
  setGame: (g: GameStateSnapshot | null) => void;
  patchGame: (p: Partial<GameStateSnapshot>) => void;
  flip: () => void;
  setOrientation: (o: 'white' | 'black') => void;
  pushMove: (m: MoveRecord) => void;
  pushChat: (m: ChatMessage) => void;
  setDrawOffer: (c: PieceColor | null) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  game: null,
  orientation: 'white',
  selectedSquare: null,
  drawOffer: null,
  chat: [],
  setGame: (game) =>
    set({
      game,
      chat: game?.chat ?? [],
      drawOffer: game?.drawOffer ?? null,
    }),
  patchGame: (p) =>
    set((s) => ({
      game: s.game ? { ...s.game, ...p } : s.game,
    })),
  flip: () => set((s) => ({ orientation: s.orientation === 'white' ? 'black' : 'white' })),
  setOrientation: (orientation) => set({ orientation }),
  pushMove: (m) =>
    set((s) => ({
      game: s.game ? { ...s.game, moves: [...s.game.moves, m], fen: m.fen } : s.game,
    })),
  pushChat: (m) => set((s) => ({ chat: [...s.chat, m] })),
  setDrawOffer: (drawOffer) => set({ drawOffer }),
  reset: () =>
    set({ game: null, orientation: 'white', selectedSquare: null, drawOffer: null, chat: [] }),
}));
