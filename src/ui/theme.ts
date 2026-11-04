import { Platform } from 'react-native';

/** Design tokens. Screens and components use these instead of literal colours. */
export const Colors = {
  background: '#0A0A0A',
  surface: '#111113',
  card: '#18181B',
  codeBackground: '#0D1117',
  border: 'rgba(255,255,255,0.06)',
  borderLight: 'rgba(255,255,255,0.10)',
  overlay: 'rgba(0,0,0,0.7)',

  // Brand
  yellow: '#FACC15',
  yellowDim: '#F59E0B',

  // Semantic
  green: '#34D399',
  blue: '#60A5FA',
  pink: '#F472B6',
  orange: '#FB923C',
  red: '#F87171',
  purple: '#A78BFA',

  success: '#34D399',
  danger: '#F87171',
  warning: '#FB923C',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.6)',
  textMuted: 'rgba(255,255,255,0.4)',
  textDisabled: 'rgba(255,255,255,0.2)',
  textOnAccent: '#0A0A0A',

  // Code syntax
  syntax: {
    text: '#E6EDF3',
    keyword: '#FF7B72',
    string: '#A5D6FF',
    number: '#79C0FF',
    comment: '#8B949E',
    function: '#D2A8FF',
    punctuation: '#C9D1D9',
  },
} as const;

/** `#RRGGBB` + opacity 0..1 → `rgba(...)`. */
export function alpha(hex: string, opacity: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${opacity})`;
}

export const SectionColors: Record<string, string> = {
  basics: Colors.green,
  control: Colors.blue,
  collections: Colors.yellow,
  async: Colors.pink,
  dom: Colors.orange,
  advanced: Colors.purple,
};

/** Theme colour for a section, falling back to the colour set in content/sections.json. */
export function getSectionColor(section: { id: string; color: string }): string {
  return SectionColors[section.id] ?? section.color;
}

export const Fonts = {
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;

export const Type = {
  h1: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6, color: Colors.textPrimary },
  h2: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4, color: Colors.textPrimary },
  h3: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2, color: Colors.textPrimary },
  body: { fontSize: 15, lineHeight: 22, color: Colors.textPrimary },
  small: { fontSize: 13, lineHeight: 18, color: Colors.textSecondary },
  caption: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
} as const;
