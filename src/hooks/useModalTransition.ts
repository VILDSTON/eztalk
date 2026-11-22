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
 * Provides smooth 60fps exit transitions without unmounting flickers, double-closing,
 * or hanging states.
 */
export function useModalTransition({
  isOpen,
  onClose,
  durationMs = 170,
}: UseModalTransitionOptions): UseModalTransitionResult {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isClosingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsClosing(true);
    clearTimer();

    timerRef.current = setTimeout(() => {
      setShouldRender(false);
      clearTimer();
      if (onCloseRef.current) {
        onCloseRef.current();
      }
    }, durationMs);
  }, [clearTimer, durationMs]);

  // Handle external isOpen changes (e.g. parent toggles isOpen)
  useEffect(() => {
    if (isOpen) {
      // Opening or already open
      clearTimer();
      isClosingRef.current = false;
      setIsClosing(false);
      setShouldRender(true);
    } else {
      // Parent changed isOpen to false
      // If handleClose already initiated the exit animation, do not trigger a second animation or hang!
      if (isClosingRef.current) {
        return;
      }
      // If it wasn't rendered anyway, do nothing
      if (!shouldRender) {
        return;
      }
      // External close (parent dismissed modal without handleClose)
      isClosingRef.current = true;
      setIsClosing(true);
      clearTimer();

      timerRef.current = setTimeout(() => {
        setShouldRender(false);
        clearTimer();
      }, durationMs);
    }
  }, [isOpen, shouldRender, clearTimer, durationMs]);

  // Cleanup timer on unmount
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
