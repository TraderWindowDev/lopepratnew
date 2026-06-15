export const Colors = {
  background: '#0B0E1C',
  surface: '#121727',
  card: '#1A2133',
  cardElevated: '#202A3D',
  border: '#263044',

  primary: '#E84B1A',
  primaryLight: '#FF6B3D',
  primaryDark: '#C43515',
  primaryFade: 'rgba(232, 75, 26, 0.15)',

  gold: '#FBBF24',
  goldFade: 'rgba(251, 191, 36, 0.15)',
  teal: '#2DD4BF',
  tealFade: 'rgba(45, 212, 191, 0.15)',
  purple: '#818CF8',
  purpleFade: 'rgba(129, 140, 248, 0.15)',

  easy: '#34D399',
  easyfade: 'rgba(52, 211, 153, 0.15)',
  tempo: '#FBBF24',
  tempoFade: 'rgba(251, 191, 36, 0.15)',
  interval: '#E84B1A',
  intervalFade: 'rgba(232, 75, 26, 0.15)',
  long: '#818CF8',
  longFade: 'rgba(129, 140, 248, 0.15)',
  rest: '#6B7280',
  restFade: 'rgba(107, 114, 128, 0.15)',
  race: '#F472B6',
  raceFade: 'rgba(244, 114, 182, 0.15)',

  success: '#34D399',
  successFade: 'rgba(52, 211, 153, 0.15)',
  warning: '#FBBF24',
  warningFade: 'rgba(251, 191, 36, 0.15)',
  error: '#F87171',
  errorFade: 'rgba(248, 113, 113, 0.15)',

  text: '#FFFFFF',
  textSecondary: '#8896AB',
  textMuted: '#4A5568',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Font = {
  display: { fontSize: 52, fontWeight: '700' as const, letterSpacing: -2 },
  h1: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 20, fontWeight: '600' as const },
  h4: { fontSize: 17, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  small: { fontSize: 13, fontWeight: '400' as const },
  tiny: { fontSize: 11, fontWeight: '500' as const },
  label: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.8 },
};
