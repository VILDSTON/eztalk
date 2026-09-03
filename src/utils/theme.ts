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
];

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

// Вызывай один раз в index.html или App.tsx для мгновенного применения сохраненных настроек без мигания экрана
export function initThemeEngine() {
  if (typeof window === 'undefined') return;

  try {
    const savedTheme = localStorage.getItem('eztalk_theme') || 'neon';
    applyTheme(savedTheme);

    const savedCompact = localStorage.getItem('eztalk_compact_mode') === 'true';
    applyCompactMode(savedCompact);
  } catch {
    applyTheme('neon');
  }
}
