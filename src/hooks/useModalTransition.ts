import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseModalTransitionOptions {
  isOpen: boolean;
  onClose?: () => void;
  durationMs?: number;
}

export interface UseModalTransitionResult {
  shouldRender: boolean;
  isClosing: boolean;
  handleClose: () => void;
}

/**
 * useModalTransition
 * Provides smooth Telegram/iOS-grade exit animations without unmounting flickers.
 * Intercepts closing actions and holds the DOM element mounted during the exit transition duration.
 */
export function useModalTransition({
  isOpen,
  onClose,
  durationMs = 220,
}: UseModalTransitionOptions): UseModalTransitionResult {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  const prevIsOpenRef = useRef(isOpen);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Internal trigger to start exit animation then notify parent
  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    clearTimer();

    timerRef.current = setTimeout(() => {
      setIsClosing(false);
      setShouldRender(false);
      if (onCloseRef.current) {
        onCloseRef.current();
      }
    }, durationMs);
  }, [isClosing, clearTimer, durationMs]);

  // Sync with external isOpen prop changes
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    if (isOpen) {
      // Opening
      clearTimer();
      setShouldRender(true);
      setIsClosing(false);
    } else if (wasOpen && !isOpen) {
      // External close triggered by parent
      setIsClosing(true);
      setShouldRender(true);
      clearTimer();

      timerRef.current = setTimeout(() => {
        setIsClosing(false);
        setShouldRender(false);
      }, durationMs);
    }
  }, [isOpen, clearTimer, durationMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    shouldRender,
    isClosing,
    handleClose,
  };
}
