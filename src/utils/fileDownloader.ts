/**
 * Utility to download or open non-image files directly on the user's computer.
 * Attempts a blob-based download to preserve original file name,
 * and falls back to opening in a new tab/window.
 */
export async function downloadOrOpenFile(fileUrl: string, fileName?: string): Promise<void> {
  if (!fileUrl) return;

  try {
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
  } catch {
    // Fallback: direct anchor trigger (useful for cross-origin or local storage)
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || 'download';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Checks whether an attachment is an image based on type or extension
 */
export function isImageMedia(url?: string, name?: string, type?: string): boolean {
  if (type === 'image') return true;
  if (!url && !name) return false;
  if (url?.startsWith('data:image/')) return true;
  const target = (name || url || '').toLowerCase();
  return /\.(png|jpe?g|gif|webp|svg|bmp|ico|heic)$/i.test(target);
}

/**
 * Checks whether an attachment is a playable video based on type or extension
 */
export function isVideoMedia(url?: string, name?: string, type?: string): boolean {
  if (type === 'video') return true;
  if (!url && !name) return false;
  if (url?.startsWith('data:video/')) return true;
  const target = (name || url || '').toLowerCase();
  return /\.(mp4|webm|ogg|mov|m4v)$/i.test(target);
}
