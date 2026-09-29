// EzTalk Vibrant Theme & Density Engine

export interface ThemeOption {
  id: string;
  name: string;
  color: string;
  glow: string;
  sentColor: string;
  badge?: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'neon',
    name: 'Neon Green',
    color: '#10B981',
    glow: '#00FF66',
    sentColor: '#0D3B2E',
  },
  {
    id: 'cyan',
    name: 'Cyber Blue',
    color: '#38BDF8',
    glow: '#0EA5E9',
    sentColor: '#0C3B5E',
  },
  {
    id: 'purple',
    name: 'Purple Night',
    color: '#C084FC',
    glow: '#A855F7',
    sentColor: '#381E54',
  },
  {
    id: 'amber',
    name: 'Sunset Amber',
    color: '#FBBF24',
    glow: '#F59E0B',
    sentColor: '#4D380D',
  },
  {
    id: 'rose',
    name: 'Ruby Glow',
    color: '#FB7185',
    glow: '#F43F5E',
    sentColor: '#4D1224',
  },
  {
    id: 'slate',
    name: 'Deep Gray',
    color: '#94A3B8',
    glow: '#CBD5E1',
    sentColor: '#272D37',
  },
];

export const THEME_NAMES: Record<string, { en: string; ru: string; uz: string }> = {
  neon: { en: 'Neon Green', ru: 'Изумрудный', uz: 'Yashil' },
  cyan: { en: 'Cyber Blue', ru: 'Кибер Синий', uz: 'Moviy' },
  purple: { en: 'Purple Night', ru: 'Фиолетовый', uz: 'Binafsha' },
  amber: { en: 'Sunset Amber', ru: 'Янтарный', uz: 'Qahrabo' },
  rose: { en: 'Ruby Glow', ru: 'Рубиновый', uz: 'Yoqut' },
  slate: { en: 'Deep Gray', ru: 'Глубокий серый', uz: 'To‘q kulrang' },
};

export function applyTheme(themeId: string = 'neon') {
  if (typeof document === 'undefined') return;
  const theme = THEME_OPTIONS.find((t) => t.id === themeId) || THEME_OPTIONS[0];

  const root = document.documentElement;
  root.setAttribute('data-theme', theme.id);
  root.style.setProperty('--ez-accent', theme.color);
  root.style.setProperty('--ez-glow', theme.glow);
  root.style.setProperty('--ez-sent', theme.sentColor);
  root.style.setProperty('--ez-accent-glow', `${theme.glow}40`);

  try {
    localStorage.setItem('eztalk_theme', theme.id);
  } catch {
    // ignore quota/privacy errors
  }
}

export function applyCompactMode(compact: boolean) {
  if (typeof document === 'undefined') return;
  if (compact) {
    document.documentElement.classList.add('compact-mode');
  } else {
    document.documentElement.classList.remove('compact-mode');
  }

  try {
    localStorage.setItem('eztalk_compact_mode', compact ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export interface WallpaperPreset {
  id: string;
  name: { en: string; ru: string; uz: string };
  preview: string;
  cssBackground: string;
  bgSize?: string;
  bgPos?: string;
  bgRepeat?: string;
}

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: 'default',
    name: { en: 'Classic Dots', ru: 'Точки', uz: 'Nuqtalar' },
    preview: 'radial-gradient(rgba(255, 255, 255, 0.35) 1.5px, transparent 1.5px)',
    cssBackground: 'radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px)',
    bgSize: '20px 20px',
    bgPos: 'center',
    bgRepeat: 'repeat',
  },
  {
    id: 'matrix',
    name: { en: 'Cyber Grid', ru: 'Кибер Сетка', uz: 'Kiber Panjara' },
    preview: 'linear-gradient(rgba(16, 185, 129, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.4) 1px, transparent 1px)',
    cssBackground: 'linear-gradient(rgba(16, 185, 129, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.08) 1px, transparent 1px)',
    bgSize: '24px 24px',
    bgPos: 'center',
    bgRepeat: 'repeat',
  },
  {
    id: 'stars',
    name: { en: 'Starfield', ru: 'Звёздное небо', uz: 'Yulduzlar' },
    preview: 'radial-gradient(1.5px 1.5px at 15px 15px, #ffffff, rgba(0,0,0,0)), radial-gradient(1.5px 1.5px at 45px 35px, #38bdf8, rgba(0,0,0,0))',
    cssBackground: 'radial-gradient(1px 1px at 25px 25px, rgba(255,255,255,0.4), transparent), radial-gradient(1.5px 1.5px at 75px 65px, rgba(56,189,248,0.5), transparent), radial-gradient(1px 1px at 120px 110px, rgba(255,255,255,0.3), transparent)',
    bgSize: '140px 140px',
    bgPos: 'center',
    bgRepeat: 'repeat',
  },
  {
    id: 'aurora',
    name: { en: 'Aurora', ru: 'Сияние', uz: 'Yog‘du' },
    preview: 'linear-gradient(135deg, rgba(16,185,129,0.5) 0%, rgba(56,189,248,0.5) 50%, rgba(192,132,252,0.5) 100%)',
    cssBackground: 'radial-gradient(circle at 20% 20%, rgba(16,185,129,0.14) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(56,189,248,0.14) 0%, transparent 50%), radial-gradient(circle at 50% 50%, rgba(192,132,252,0.1) 0%, transparent 60%)',
    bgSize: '100% 100%',
    bgPos: 'center',
    bgRepeat: 'no-repeat',
  },
  {
    id: 'carbon',
    name: { en: 'Carbon', ru: 'Карбон', uz: 'Karbon' },
    preview: 'radial-gradient(rgba(255,255,255,0.2) 2px, transparent 2px)',
    cssBackground: 'radial-gradient(rgba(255, 255, 255, 0.08) 1.5px, transparent 1.5px), radial-gradient(rgba(255, 255, 255, 0.03) 1.5px, transparent 1.5px)',
    bgSize: '16px 16px',
    bgPos: 'center',
    bgRepeat: 'repeat',
  },
  {
    id: 'clean',
    name: { en: 'Pure Dark', ru: 'Чистый', uz: 'Toza' },
    preview: 'linear-gradient(to bottom, #111215, #111215)',
    cssBackground: 'none',
    bgSize: 'auto',
    bgPos: 'center',
    bgRepeat: 'no-repeat',
  },
];

export function applyChatWallpaper(wallpaperIdOrUrl: string = 'default') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  if (
    wallpaperIdOrUrl.startsWith('data:image/') ||
    wallpaperIdOrUrl.startsWith('http://') ||
    wallpaperIdOrUrl.startsWith('https://') ||
    wallpaperIdOrUrl.startsWith('blob:')
  ) {
    root.style.setProperty('--ez-chat-wallpaper', `url("${wallpaperIdOrUrl}")`);
    root.style.setProperty('--ez-chat-wallpaper-size', 'cover');
    root.style.setProperty('--ez-chat-wallpaper-pos', 'center');
    root.style.setProperty('--ez-chat-wallpaper-repeat', 'no-repeat');
  } else {
    const preset = WALLPAPER_PRESETS.find((p) => p.id === wallpaperIdOrUrl) || WALLPAPER_PRESETS[0];
    root.style.setProperty('--ez-chat-wallpaper', preset.cssBackground);
    root.style.setProperty('--ez-chat-wallpaper-size', preset.bgSize || '20px 20px');
    root.style.setProperty('--ez-chat-wallpaper-pos', preset.bgPos || 'center');
    root.style.setProperty('--ez-chat-wallpaper-repeat', preset.bgRepeat || 'repeat');
  }

  try {
    localStorage.setItem('eztalk_chat_wallpaper', wallpaperIdOrUrl);
  } catch {
    // ignore
  }
}

// Вызывай один раз в index.html или App.tsx для мгновенного применения сохраненных настроек без мигания экрана
export function initThemeEngine() {
  if (typeof window === 'undefined') return;

  try {
    const savedTheme = localStorage.getItem('eztalk_theme') || 'neon';
    applyTheme(savedTheme);

    const savedCompact = localStorage.getItem('eztalk_compact_mode') === 'true';
    applyCompactMode(savedCompact);

    const savedWallpaper = localStorage.getItem('eztalk_chat_wallpaper') || 'default';
    applyChatWallpaper(savedWallpaper);
  } catch {
    applyTheme('neon');
  }
}

