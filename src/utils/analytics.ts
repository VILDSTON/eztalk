/**
 * EzTalk Lightweight Privacy-Friendly Analytics Utility
 * Respects user privacy and 'Do Not Track' (DNT) header.
 * Zero cookies, zero tracking of sensitive personal messages.
 */

export const Analytics = {
  isDntEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    return (
      navigator.doNotTrack === '1' ||
      (window as any).doNotTrack === '1' ||
      navigator.maxTouchPoints === 0 && (navigator as any).msDoNotTrack === '1'
    );
  },

  trackPageView(page: string) {
    if (this.isDntEnabled()) return;
    if (import.meta.env.DEV) {
      console.debug(`[Analytics] PageView: ${page}`);
      return;
    }
    // Plug-and-play with Plausible / Umami / GA4:
    if (typeof (window as any).plausible === 'function') {
      (window as any).plausible('pageview', { props: { path: page } });
    }
  },

  trackEvent(eventName: string, props?: Record<string, string | number | boolean>) {
    if (this.isDntEnabled()) return;
    if (import.meta.env.DEV) {
      console.debug(`[Analytics] Event: ${eventName}`, props);
      return;
    }
    if (typeof (window as any).plausible === 'function') {
      (window as any).plausible(eventName, { props });
    }
  },
};
