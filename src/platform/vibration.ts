/** Vibrate where the browser supports it. Quietly does nothing elsewhere (for example iPhone Safari). */
export function vibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // Vibration is optional.
  }
}
