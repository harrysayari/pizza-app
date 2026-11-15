// Browser notifications. Each function returns a safe value when the API is missing, so the app
// works the same with notifications unavailable (spec FR-015). Nothing here asks for permission
// except request(), which the caller must run from inside a tap.

export type Support = 'ok' | 'needs-home-screen' | 'none';
export type Permission = 'default' | 'granted' | 'denied';

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

function isIOS(): boolean {
  try {
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  } catch {
    return false;
  }
}

function isStandalone(): boolean {
  try {
    return (
      (navigator as NavigatorWithStandalone).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches
    );
  } catch {
    return false;
  }
}

/** Whether notifications can work here at all. iPhone allows them only for a Home Screen web app. */
export function support(): Support {
  try {
    if (typeof Notification === 'undefined') return isIOS() && !isStandalone() ? 'needs-home-screen' : 'none';
    if (isIOS() && !isStandalone()) return 'needs-home-screen';
    return 'ok';
  } catch {
    return 'none';
  }
}

/** The browser's permission, read live. `default` means not asked yet. */
export function permission(): Permission {
  try {
    if (typeof Notification === 'undefined') return 'default';
    const p = Notification.permission;
    return p === 'granted' || p === 'denied' ? p : 'default';
  } catch {
    return 'default';
  }
}

/** Ask the browser. Call only from a tap handler (spec FR-007). Never throws. */
export async function request(): Promise<Permission> {
  try {
    if (typeof Notification === 'undefined') return 'default';
    const result = await Notification.requestPermission();
    return result === 'granted' || result === 'denied' ? result : 'default';
  } catch {
    return permission();
  }
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  try {
    if (!('serviceWorker' in navigator)) return null;
    return (await navigator.serviceWorker.getRegistration()) ?? null;
  } catch {
    return null;
  }
}

export interface ShowOptions {
  body: string;
  /** Same tag replaces an earlier notification, so a repeat never stacks (spec FR-012). */
  tag: string;
  silent: boolean;
  /** Alert again even though the tag already exists (the single repeat, spec FR-009). */
  renotify?: boolean;
  /** Carried to the click handler in the service worker. */
  data?: unknown;
}

/** Show a notification through the service worker when there is one (needed on Android). */
export async function show(title: string, options: ShowOptions): Promise<boolean> {
  if (permission() !== 'granted') return false;
  try {
    const reg = await registration();
    const init = {
      body: options.body,
      tag: options.tag,
      silent: options.silent,
      renotify: options.renotify === true && !options.silent,
      data: options.data,
    } as NotificationOptions;
    if (reg) {
      await reg.showNotification(title, init);
    } else {
      new Notification(title, init);
    }
    return true;
  } catch {
    return false;
  }
}

/** Remove shown notifications, all of them or the one with `tag`. */
export async function close(tag?: string): Promise<void> {
  try {
    const reg = await registration();
    if (!reg) return;
    const list = await reg.getNotifications(tag === undefined ? undefined : { tag });
    for (const n of list) n.close();
  } catch {
    // Nothing to close.
  }
}
