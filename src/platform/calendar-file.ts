// Hands a calendar file to the device. Every browser call is wrapped: failure is a result, never an error.

export type DeliverResult = 'downloaded' | 'shared' | 'failed';
export type CopyResult = 'copied' | 'manual';

const TYPE = 'text/calendar';

function download(text: string, filename: string): boolean {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: `${TYPE};charset=utf-8` }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // nothing to clean up
      }
    }, 10_000);
    return true;
  } catch {
    return false;
  }
}

/** Offer the file as a download; if the browser refuses, try the share sheet. Returns how it went. */
export async function deliver(text: string, filename: string): Promise<DeliverResult> {
  if (download(text, filename)) return 'downloaded';
  try {
    const file = new File([text], filename, { type: TYPE });
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (typeof navigator.share === 'function' && nav.canShare?.({ files: [file] }) === true) {
      await navigator.share({ files: [file], title: 'Pizza dough schedule' });
      return 'shared';
    }
  } catch {
    // cancelled or unsupported
  }
  return 'failed';
}

/** Copy the text. Returns 'manual' when the caller should show it as selectable text. */
export async function copy(text: string): Promise<CopyResult> {
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    // fall through
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    if (ok) return 'copied';
  } catch {
    // fall through
  }
  return 'manual';
}
