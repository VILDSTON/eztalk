// EzTalk Vibrant Theme & Density Engine

export interface ThemeOption {
  id: string;
  name: string;
  color: string;
  glow: string;
  sentColor: string;
  badge: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'neon',
    name: 'Neon Green',
    color: '#10B981',
    glow: '#00FF66',
    sentColor: '#0D3B2E',
    badge: 'shadow-[0_0_12px_rgba(16,185,129,0.45)]',
  },
  {
    id: 'cyan',
    name: 'Cyber Blue',
    color: '#38BDF8',
    glow: '#0EA5E9',
    sentColor: '#0C3B5E',
    badge: 'shadow-[0_0_12px_rgba(56,189,248,0.45)]',
  },
  {
    id: 'purple',
    name: 'Purple Night',
    color: '#C084FC',
    glow: '#A855F7',
    sentColor: '#381E54',
    badge: 'shadow-[0_0_12px_rgba(192,132,252,0.45)]',
  },
  {
    id: 'amber',
    name: 'Sunset Amber',
    color: '#FBBF24',
    glow: '#F59E0B',
    sentColor: '#4D380D',
    badge: 'shadow-[0_0_12px_rgba(251,191,36,0.45)]',
  },
  {
    id: 'rose',
    name: 'Ruby Glow',
    color: '#FB7185',
    glow: '#F43F5E',
    sentColor: '#4D1224',
    badge: 'shadow-[0_0_12px_rgba(251,113,133,0.45)]',
  },
];

export function applyTheme(themeId: string = 'neon') {
  if (typeof document === 'undefined') return;
  const theme = THEME_OPTIONS.find((t) => t.id === themeId) || THEME_OPTIONS[0];

  document.documentElement.setAttribute('data-theme', theme.id);
  document.documentElement.style.setProperty('--ez-accent', theme.color);
  document.documentElement.style.setProperty('--ez-glow', theme.glow);
  document.documentElement.style.setProperty('--ez-sent', theme.sentColor);
  document.documentElement.style.setProperty('--ez-accent-glow', `${theme.color}66`);

  try {
    localStorage.setItem('eztalk_theme', theme.id);
  } catch {
    // ignore
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
