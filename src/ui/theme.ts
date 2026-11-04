/**
 * Design tokens. Monochrome hardware look: true black, white type, a single
 * red accent used sparingly, dot-matrix numerals, dotted progress, pill
 * buttons and large rounded widgets. Screens use these tokens only.
 */

export const Colors = {
  background: '#000000',
  surface: '#111111',
  surfaceRaised: '#1C1C1C',
  codeBackground: '#0A0A0A',
  border: '#222222',
  borderStrong: '#333333',
  overlay: 'rgba(0,0,0,0.8)',

  /** The single accent. */
  accent: '#D71921',
  textOnAccent: '#FFFFFF',
  /** Primary buttons and "on" states are white on black. */
  inverse: '#FFFFFF',
  textOnInverse: '#000000',

  success: '#FFFFFF',
  danger: '#D71921',
  info: '#BFBFBF',
  warning: '#FF4D54',

  textPrimary: '#FFFFFF',
  textSecondary: '#A6A6A6',
  textMuted: '#666666',
  textDisabled: '#3A3A3A',

  dotOff: '#262626',

  syntax: {
    text: '#D4D4D4',
    keyword: '#FFFFFF',
    string: '#9E9E9E',
    number: '#FF5A5F',
    comment: '#555555',
    function: '#FFFFFF',
    punctuation: '#7A7A7A',
    lineNumber: '#3A3A3A',
  },
} as const;

/** `#RRGGBB` + opacity 0..1 → `rgba(...)`. */
export function alpha(hex: string, opacity: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${opacity})`;
}

/** Sections share one look; they are told apart by number. */
export function getSectionColor(_section: { id: string }): string {
  return Colors.textPrimary;
}

export const Fonts = {
  /** Dot-matrix display face. Latin and digits only: never use it for Russian text. */
  display: 'Doto_900Black',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
  monoBold: 'IBMPlexMono_700Bold',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
} as const;

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
  xl: 22,
  pill: 999,
} as const;

export const Type = {
  h1: {
    fontFamily: Fonts.sansBold,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -1,
    color: Colors.textPrimary,
  },
  h2: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: 22,
    lineHeight: 27,
    letterSpacing: -0.6,
    color: Colors.textPrimary,
  },
  h3: { fontFamily: Fonts.sansSemiBold, fontSize: 16, lineHeight: 22, color: Colors.textPrimary },
  body: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 23, color: Colors.textPrimary },
  small: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, color: Colors.textSecondary },
  mono: { fontFamily: Fonts.mono, fontSize: 13, color: Colors.textSecondary },
  /** Small lowercase label, see <Label>. */
  caption: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.textMuted,
  },
  /** Dot-matrix numerals. */
  display: { fontFamily: Fonts.display, color: Colors.textPrimary },
} as const;
