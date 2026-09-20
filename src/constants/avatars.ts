/**
 * Official EzTalk Avatars & Curated Presets
 */

export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

export function createEzTalkAvatarSvg(
  strokeColor: string,
  glowColor?: string,
  bgColor = '#0A0D14'
): string {
  const glow = glowColor || strokeColor;
  const safeId = strokeColor.replace(/[^a-zA-Z0-9]/g, '');
  return `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Фоновый темный круг -->
    <rect width="120" height="120" rx="60" fill="${bgColor}"/>
    
    <defs>
      <radialGradient id="glow_${safeId}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${glow}" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="${glow}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="60" cy="58" r="44" fill="url(#glow_${safeId})"/>

    <!-- Облачко сообщений с мятным свечением -->
    <path d="M50 34C36.7452 34 26 44.7452 26 58C26 71.2548 36.7452 82 50 82H52L46 96L64 86C82 86 94 76 94 58C94 44.7452 83.2548 34 70 34H50Z" 
          stroke="${strokeColor}" 
          stroke-width="8" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          fill="none"/>
          
    <!-- Три круглые точки -->
    <circle cx="48" cy="58" r="4.5" fill="${strokeColor}"/>
    <circle cx="60" cy="58" r="4.5" fill="${strokeColor}"/>
    <circle cx="72" cy="58" r="4.5" fill="${strokeColor}"/>
  </svg>`;
}

export function createEzTalkGroupAvatarSvg(
  primaryColor: string,
  secondaryColor = '#FFFFFF',
  bgColor = '#0A0D14'
): string {
  const safeId = primaryColor.replace(/[^a-zA-Z0-9]/g, '');
  return `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="120" rx="60" fill="${bgColor}"/>
    <defs>
      <radialGradient id="grp_glow_${safeId}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="60" cy="60" r="46" fill="url(#grp_glow_${safeId})"/>
    
    <!-- Заднее облачко -->
    <path d="M66 32 C56 32 48 39 48 49 C48 57 53 62 60 64 L57 73 L67 67 C78 67 86 61 86 49 C86 39 77 32 66 32 Z"
          stroke="${secondaryColor}"
          stroke-width="5"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-opacity="0.45"
          fill="none"/>
          
    <!-- Переднее облачко -->
    <path d="M46 45 C35 45 27 53 27 64 C27 74 34 81 44 83 L40 93 L54 86 C67 86 77 78 77 64 C77 53 66 45 46 45 Z"
          stroke="${primaryColor}"
          stroke-width="6.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"/>
          
    <!-- Точки переднего облачка -->
    <circle cx="43" cy="64" r="3.5" fill="${primaryColor}"/>
    <circle cx="52" cy="64" r="3.5" fill="${primaryColor}"/>
    <circle cx="61" cy="64" r="3.5" fill="${primaryColor}"/>
  </svg>`;
}

export const EZTALK_LOGO_AVATAR = {
  id: 'eztalk-official',
  name: 'EzTalk Mint',
  svg: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Фоновый темный круг -->
    <rect width="120" height="120" rx="60" fill="#0A0D14"/>
    
    <defs>
      <radialGradient id="mintGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#00E599" stop-opacity="0.28"/>
        <stop offset="100%" stop-color="#00E599" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="60" cy="58" r="44" fill="url(#mintGlow)"/>

    <!-- Облачко сообщений с мятным свечением -->
    <path d="M50 34C36.7452 34 26 44.7452 26 58C26 71.2548 36.7452 82 50 82H52L46 96L64 86C82 86 94 76 94 58C94 44.7452 83.2548 34 70 34H50Z" 
          stroke="#00E599" 
          stroke-width="8" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          fill="none"/>
          
    <!-- Три круглые точки -->
    <circle cx="48" cy="58" r="4.5" fill="#00E599"/>
    <circle cx="60" cy="58" r="4.5" fill="#00E599"/>
    <circle cx="72" cy="58" r="4.5" fill="#00E599"/>
  </svg>`,
  url: '',
};
EZTALK_LOGO_AVATAR.url = svgToDataUri(EZTALK_LOGO_AVATAR.svg);

export const DEFAULT_AVATAR = EZTALK_LOGO_AVATAR.url;

export interface CuratedAvatarItem {
  id: string;
  name: string;
  url: string;
  color: string;
}

export const EZTALK_AVATAR_PRESETS: CuratedAvatarItem[] = [
  {
    id: 'eztalk-mint',
    name: 'EzTalk Mint',
    color: '#00E599',
    url: EZTALK_LOGO_AVATAR.url,
  },
  {
    id: 'eztalk-violet',
    name: 'Cyber Violet',
    color: '#A855F7',
    url: svgToDataUri(createEzTalkAvatarSvg('#A855F7')),
  },
  {
    id: 'eztalk-cyan',
    name: 'Ocean Cyan',
    color: '#00D2FF',
    url: svgToDataUri(createEzTalkAvatarSvg('#00D2FF')),
  },
  {
    id: 'eztalk-amber',
    name: 'Sunset Amber',
    color: '#F59E0B',
    url: svgToDataUri(createEzTalkAvatarSvg('#F59E0B')),
  },
  {
    id: 'eztalk-crimson',
    name: 'Neon Crimson',
    color: '#FF3366',
    url: svgToDataUri(createEzTalkAvatarSvg('#FF3366')),
  },
  {
    id: 'eztalk-emerald',
    name: 'Emerald Matrix',
    color: '#10B981',
    url: svgToDataUri(createEzTalkAvatarSvg('#10B981')),
  },
  {
    id: 'eztalk-silver',
    name: 'Silver Stealth',
    color: '#E4E4E7',
    url: svgToDataUri(createEzTalkAvatarSvg('#E4E4E7')),
  },
  {
    id: 'eztalk-gold',
    name: 'Obsidian Gold',
    color: '#FBBF24',
    url: svgToDataUri(createEzTalkAvatarSvg('#FBBF24')),
  },
];

// Flat array of URLs for components expecting string[]
export const CURATED_AVATARS: string[] = EZTALK_AVATAR_PRESETS.map((a) => a.url);
export const PRESET_AVATARS: string[] = CURATED_AVATARS;

export const GROUP_AVATAR_PRESETS: string[] = [
  svgToDataUri(createEzTalkGroupAvatarSvg('#00E599', '#FFFFFF')),
  svgToDataUri(createEzTalkGroupAvatarSvg('#A855F7', '#00E599')),
  svgToDataUri(createEzTalkGroupAvatarSvg('#00D2FF', '#A855F7')),
  svgToDataUri(createEzTalkGroupAvatarSvg('#F59E0B', '#FFFFFF')),
  svgToDataUri(createEzTalkGroupAvatarSvg('#FF3366', '#00D2FF')),
];
