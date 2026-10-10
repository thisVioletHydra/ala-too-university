import { useEffect, useState } from 'react';
import { subscribeInputMethod } from './input.method.ts';

export function useKeyboardHints(pointerDelay = 800): boolean {
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeInputMethod((method) => {
      clearTimeout(timer);
      if (method === 'keyboard') setKeyboard(true);
      else timer = setTimeout(() => setKeyboard(false), pointerDelay);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [pointerDelay]);
  return keyboard;
}
