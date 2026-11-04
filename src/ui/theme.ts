/**
 * Design tokens. The look is a code editor: dark neutral surfaces, one accent
 * (JavaScript yellow), monospace headings, colour only where it means something
 * (success, error, info). Screens use these tokens, never literal values.
 */

export const Colors = {
  background: '#0B0E14',
  surface: '#11151C',
  surfaceRaised: '#171C24',
  codeBackground: '#0D1117',
  border: '#1F2630',
  borderStrong: '#2D3644',
  overlay: 'rgba(0,0,0,0.7)',

  accent: '#F7DF1E',
  textOnAccent: '#0B0E14',

  success: '#3FB950',
  danger: '#F85149',
  info: '#58A6FF',
  warning: '#D29922',

  textPrimary: '#E6EDF3',
  textSecondary: '#9DA7B3',
  textMuted: '#636E7B',
  textDisabled: '#3B4450',

  syntax: {
    text: '#E6EDF3',
    keyword: '#FF7B72',
    string: '#A5D6FF',
    number: '#79C0FF',
    comment: '#6E7681',
    function: '#D2A8FF',
    punctuation: '#C9D1D9',
    lineNumber: '#3B4450',
  },
} as const;

/** `#RRGGBB` + opacity 0..1 → `rgba(...)`. */
export function alpha(hex: string, opacity: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${opacity})`;
}

/** Sections share the accent; they are told apart by number, not colour. */
export function getSectionColor(_section: { id: string }): string {
  return Colors.accent;
}

export const Fonts = {
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
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  pill: 999,
} as const;

export const Type = {
  h1: {
    fontFamily: Fonts.monoBold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.8,
    color: Colors.textPrimary,
  },
  h2: {
    fontFamily: Fonts.monoBold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.5,
    color: Colors.textPrimary,
  },
  h3: { fontFamily: Fonts.sansSemiBold, fontSize: 16, lineHeight: 22, color: Colors.textPrimary },
  body: { fontFamily: Fonts.sans, fontSize: 15, lineHeight: 23, color: Colors.textPrimary },
  small: { fontFamily: Fonts.sans, fontSize: 13, lineHeight: 19, color: Colors.textSecondary },
  mono: { fontFamily: Fonts.mono, fontSize: 13, color: Colors.textSecondary },
  /** Section label rendered as a code comment, see <Label>. */
  caption: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.textMuted },
} as const;
