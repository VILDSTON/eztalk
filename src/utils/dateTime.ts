/**
 * EzTalk Date & Time Formatting Utilities
 * Automatically handles 12-hour (AM/PM) vs 24-hour display based on user system preferences
 * and localizes month names, 'Today', 'Yesterday' into Russian, Uzbek, and English.
 */

export function isSystem12Hour(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const opts = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions() as any;
    if (opts.hour12 !== undefined) return Boolean(opts.hour12);
    if (opts.hourCycle === 'h11' || opts.hourCycle === 'h12') return true;
    if (opts.hourCycle === 'h23' || opts.hourCycle === 'h24') return false;
  } catch { }
  try {
    const testDate = new Date(2026, 0, 1, 15, 0, 0);
    return /am|pm/i.test(testDate.toLocaleTimeString());
  } catch {
    return false;
  }
}

export function getLocaleTag(lang?: string): string {
  if (lang === 'ru') return 'ru-RU';
  if (lang === 'uz') return 'uz-UZ';
  return 'en-US';
}

/**
 * Formats time for message bubbles and chat headers
 * If user system uses 12-hour clock (AM/PM), formats like '7:26 PM'.
 * Otherwise formats like '19:26'.
 */
export function formatMessageTime(dateInput?: string | number | Date, lang?: string): string {
  if (!dateInput) return '';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const hour12 = isSystem12Hour();
  const localeTag = getLocaleTag(lang);

  try {
    return d.toLocaleTimeString(localeTag, {
      hour: hour12 ? 'numeric' : '2-digit',
      minute: '2-digit',
      hour12,
    });
  } catch {
    const hours = d.getHours();
    const mins = d.getMinutes().toString().padStart(2, '0');
    if (hour12) {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;
      return `${h12}:${mins} ${ampm}`;
    }
    return `${hours.toString().padStart(2, '0')}:${mins}`;
  }
}

/**
 * Formats last message timestamp in sidebar chat list
 */
export function formatChatListTime(dateStr?: string, lang?: string, t?: any): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return formatMessageTime(d, lang);
  }

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return t?.chat?.yesterday || (lang === 'ru' ? 'Вчера' : lang === 'uz' ? 'Kecha' : 'Yesterday');
  }

  const localeTag = getLocaleTag(lang);
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString(localeTag, { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString(localeTag, { month: 'numeric', day: 'numeric', year: '2-digit' });
}

/**
 * Formats chat divider banner (e.g. "Сегодня", "Вчера", "21 сентября", "September 21")
 */
export function formatMessageDateDivider(
  createdAt?: string,
  timestamp?: string,
  t?: any,
  lang?: string
): string {
  let date: Date | null = null;
  if (createdAt) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) date = d;
  }
  if (!date && timestamp) {
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) date = d;
  }
  if (!date) date = new Date();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - targetDay.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return t?.chat?.today || (lang === 'ru' ? 'Сегодня' : lang === 'uz' ? 'Bugun' : 'Today');
  }
  if (diffDays === 1) {
    return t?.chat?.yesterday || (lang === 'ru' ? 'Вчера' : lang === 'uz' ? 'Kecha' : 'Yesterday');
  }

  const localeTag = getLocaleTag(lang);
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(localeTag, { month: 'long', day: 'numeric' });
  }
  return date.toLocaleDateString(localeTag, { month: 'long', day: 'numeric', year: 'numeric' });
}
