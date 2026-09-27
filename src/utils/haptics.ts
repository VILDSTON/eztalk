/**
 * Native Mobile Haptic Feedback Engine
 * Safely triggers vibration on supported touch devices (Android, iOS PWA / webview where supported).
 */

export const triggerHaptic = (pattern: number | number[] = 40): boolean => {
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
      return navigator.vibrate(pattern);
    }
  } catch {
    // Vibration may be restricted or unsupported; fail silently without console noise
  }
  return false;
};

export const haptic = {
  /** Light 25ms tap for buttons, reactions, tab switches */
  light: () => triggerHaptic(25),
  /** Standard 40ms tap for key actions (copy link, toggle) */
  medium: () => triggerHaptic(40),
  /** Heavy 60ms tap for critical actions (delete, burn, leave) */
  heavy: () => triggerHaptic(60),
  /** Success pattern [30ms, 40ms, 50ms] on message sent or completed */
  success: () => triggerHaptic([30, 40, 50]),
  /** Double vibration pattern [50ms, 50ms, 50ms] on errors or warnings */
  error: () => triggerHaptic([50, 50, 50]),
};
