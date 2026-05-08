'use client';

import { useCallback, useRef } from 'react';
import { useUIPrefs } from '@/store/userStore';

const SOUND_FILES: Record<string, string> = {
  move: '/sounds/move.mp3',
  capture: '/sounds/capture.mp3',
  check: '/sounds/check.mp3',
  checkmate: '/sounds/checkmate.mp3',
  castle: '/sounds/castle.mp3',
  start: '/sounds/start.mp3',
  end: '/sounds/end.mp3',
  notify: '/sounds/notify.mp3',
};

type SoundKey = keyof typeof SOUND_FILES;

export function useSound() {
  const enabled = useUIPrefs((s) => s.soundEnabled);
  const cache = useRef<Map<string, HTMLAudioElement>>(new Map());

  return useCallback(
    (key: SoundKey | string) => {
      if (!enabled) return;
      if (typeof window === 'undefined') return;
      const src = SOUND_FILES[key as SoundKey] ?? `/sounds/${key}.mp3`;
      let audio = cache.current.get(src);
      if (!audio) {
        audio = new Audio(src);
        audio.volume = 0.45;
        cache.current.set(src, audio);
      }
      // Allow rapid replays without waiting for the previous to finish.
      audio.currentTime = 0;
      audio.play().catch(() => {
        // Browsers block autoplay until first user interaction — ignore.
      });
    },
    [enabled],
  );
}
