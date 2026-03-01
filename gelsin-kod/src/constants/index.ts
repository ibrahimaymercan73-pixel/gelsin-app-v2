// ── RENKLER ──
export const Colors = {
  blue:     '#1D4ED8',
  blue2:    '#3B82F6',
  blueLt:   '#EFF6FF',
  blueMid:  '#DBEAFE',
  navy:     '#0F1F4E',

  orange:   '#F97316',
  orangeLt: '#FFF7ED',

  red:      '#EF4444',
  redLt:    '#FEF2F2',

  green:    '#10B981',
  greenLt:  '#ECFDF5',

  amber:    '#F59E0B',

  white:    '#FFFFFF',
  off:      '#F8FAFF',
  bg:       '#F0F4FF',
  surface:  '#FFFFFF',
  surface2: '#F7F9FF',

  border:   '#E2E8F7',
  border2:  '#CBD5EE',

  ink:      '#0C1A3D',
  ink2:     '#1E3A6E',
  ink3:     '#4B6A9B',
  ink4:     '#8BA3CC',
} as const;

// ── TİPOGRAFİ ──
export const Fonts = {
  regular:  'PlusJakartaSans_400Regular',
  medium:   'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold:     'PlusJakartaSans_700Bold',
  extrabold:'PlusJakartaSans_800ExtraBold',
  black:    'PlusJakartaSans_900Black',
  mono:     'JetBrainsMono_400Regular',
  monoBold: 'JetBrainsMono_600SemiBold',
} as const;

// ── SPACING ──
export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 28,
  xxxl:40,
} as const;

// ── BORDER RADIUS ──
export const Radius = {
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  full:100,
} as const;

// ── SHADOW ──
export const Shadow = {
  sm: {
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

// ── RADAR MESAFE ──
export const RADAR_RADIUS_METERS = 2000; // 2km
export const URGENT_NOTIFY_DELAY_MS = 0;
export const NORMAL_NOTIFY_DELAY_MS = 120_000; // 2 dk

// ── KOMİSYON ──
export const PLATFORM_COMMISSION = 0.10; // %10
