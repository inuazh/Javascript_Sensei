export const Colors = {
  background: '#0A0A0A',
  surface: '#111113',
  card: '#18181B',
  border: 'rgba(255,255,255,0.06)',
  borderLight: 'rgba(255,255,255,0.10)',

  // Brand
  yellow: '#FACC15',
  yellowDim: '#F59E0B',
  yellowBg: 'rgba(250,204,21,0.08)',
  yellowBorder: 'rgba(250,204,21,0.15)',

  // Semantic
  green: '#34D399',
  greenBg: 'rgba(52,211,153,0.08)',
  blue: '#60A5FA',
  blueBg: 'rgba(96,165,250,0.08)',
  pink: '#F472B6',
  pinkBg: 'rgba(244,114,182,0.08)',
  orange: '#FB923C',
  orangeBg: 'rgba(251,146,60,0.08)',
  red: '#F87171',
  redBg: 'rgba(248,113,113,0.08)',
  purple: '#A78BFA',
  purpleBg: 'rgba(167,139,250,0.08)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.5)',
  textMuted: 'rgba(255,255,255,0.3)',
  textDisabled: 'rgba(255,255,255,0.2)',
};

export const SectionColors: Record<string, string> = {
  basics: Colors.green,
  control: Colors.blue,
  collections: Colors.yellow,
  async: Colors.pink,
  dom: Colors.orange,
  advanced: Colors.purple,
};

export const Fonts = {
  mono: 'JetBrainsMono',
  sans: 'SpaceGrotesk',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};
