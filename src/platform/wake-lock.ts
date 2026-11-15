// Screen Wake Lock. The browser drops the lock when the page is hidden, so it is asked for again
// when the page becomes visible, for as long as a caller still wants it.

interface Sentinel {
  released?: boolean;
  release(): Promise<void>;
}

let sentinel: Sentinel | null = null;
let wanted = false;
let listening = false;

export function wakeLockSupported(): boolean {
  try {
    return typeof navigator !== 'undefined' && 'wakeLock' in navigator && !!navigator.wakeLock;
  } catch {
    return false;
  }
}

async function acquire(): Promise<boolean> {
  try {
    if (!wakeLockSupported()) return false;
    sentinel = (await navigator.wakeLock.request('screen')) as Sentinel;
    return true;
  } catch {
    sentinel = null;
    return false;
  }
}

function onVisible(): void {
  if (document.visibilityState === 'visible' && wanted && (sentinel === null || sentinel.released === true)) {
    void acquire();
  }
}

/** Ask for the lock. Resolves false when the browser refuses or has no wake lock. */
export async function request(): Promise<boolean> {
  wanted = true;
  if (!listening) {
    listening = true;
    try {
      document.addEventListener('visibilitychange', onVisible);
    } catch {
      // Without the listener the lock is simply not renewed.
    }
  }
  const ok = await acquire();
  if (!ok) wanted = false;
  return ok;
}

export async function release(): Promise<void> {
  wanted = false;
  const s = sentinel;
  sentinel = null;
  try {
    await s?.release();
  } catch {
    // Already released.
  }
}
