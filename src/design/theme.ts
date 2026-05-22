import { Platform } from 'react-native';

// ============================================
// Star App Design Tokens
// Based on Chat AI Mobile App UI Kit (Figma)
// ============================================

// Dark Theme (Default)
const dark = {
  bgPrimary: '#000000',
  bgSecondary: '#1C1C1E',
  bgTertiary: '#2C2C2E',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#38383A',
  accent: '#007AFF',
  sendBtn: '#0a0a0a',
  sendBtnGlow: {
    purple: 'rgba(139, 92, 246, 0.8)',
    blue: 'rgba(59, 130, 246, 0.6)',
    cyan: 'rgba(34, 211, 238, 0.4)',
  },
  chipActive: '#2C2C2E',
  keyboard: '#1C1C1E',
  keyboardKey: '#2C2C2E',
  keyboardKeySpecial: '#3A3A3C',
  homeBar: '#FFFFFF',
};

// Light Theme
const light = {
  bgPrimary: '#FFFFFF',
  bgSecondary: '#F2F2F7',
  bgTertiary: '#E5E5EA',
  textPrimary: '#000000',
  textSecondary: '#8E8E93',
  border: '#E2E2E2',
  accent: '#007AFF',
  sendBtn: '#0a0a0a',
  sendBtnGlow: {
    purple: 'rgba(139, 92, 246, 0.6)',
    blue: 'rgba(59, 130, 246, 0.4)',
    cyan: 'rgba(34, 211, 238, 0.2)',
  },
  chipActive: '#E5E5EA',
  keyboard: '#d1d5db',
  keyboardKey: '#FFFFFF',
  keyboardKeySpecial: '#adb5be',
  homeBar: '#000000',
};

export type Theme = typeof dark;
export type ThemeMode = 'dark' | 'light';

export const themes: Record<ThemeMode, Theme> = { dark, light };

// Backward compatibility
export const Colors = {
  light: {
    text: light.textPrimary,
    background: light.bgPrimary,
    tint: light.accent,
    icon: light.textSecondary,
    tabIconDefault: light.textSecondary,
    tabIconSelected: light.textPrimary,
  },
  dark: {
    text: dark.textPrimary,
    background: dark.bgPrimary,
    tint: dark.accent,
    icon: dark.textSecondary,
    tabIconDefault: dark.textSecondary,
    tabIconSelected: dark.textPrimary,
  },
};

// ============================================
// Spacing Scale (4px base)
// ============================================
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  button: 48,
  nav: 56,
  statusBar: 48,
  dock: 114,
} as const;

// ============================================
// Border Radius Scale
// ============================================
export const radius = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 14,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;

// ============================================
// Typography Scale
// ============================================
export const typography = {
  xs: { fontSize: 10, lineHeight: 14 },
  sm: { fontSize: 13, lineHeight: 18 },
  base: { fontSize: 15, lineHeight: 22 },
  lg: { fontSize: 16, lineHeight: 24 },
  xl: { fontSize: 17, lineHeight: 22 },
  '2xl': { fontSize: 20, lineHeight: 28 },
  '3xl': { fontSize: 26, lineHeight: 32 },
  '4xl': { fontSize: 28, lineHeight: 34 },
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
});

// Sizes
export const sizes = {
  sendBtn: 48,
  btnCircle: 48,
  avatarSm: 32,
  avatarMd: 48,
  phone: { width: 375, height: 812 },
} as const;

// ============================================
// Tool Call Colors
// ============================================
export const toolCallColors = {
  bg: '#1C1C1E',
  border: '#38383A',
  headerBg: '#2C2C2E',
  iconRunning: '#FFD60A',
  iconDone: '#30D158',
  iconError: '#FF453A',
  iconPending: '#8E8E93',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  codeBg: '#000000',
  codeText: '#30D158',
} as const;

// ============================================
// Daemon Task Colors
// ============================================
export const daemonTaskColors = {
  bg: '#1C1C1E',
  border: '#38383A',
  progressBg: '#3A3A3C',
  progressFill: '#007AFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  buttonDanger: '#FF453A',
} as const;

// ============================================
// File Export Colors
// ============================================
export const fileExportColors = {
  bg: '#1C1C1E',
  border: '#38383A',
  iconBg: '#2C2C2E',
  buttonPrimary: '#007AFF',
  buttonSecondary: '#3A3A3C',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
} as const;

// ============================================
// Tool Category Icons (Ionicons names)
// ============================================
export const toolCategoryIcons: Record<string, string> = {
  sandbox: 'terminal-outline',
  web: 'search-outline',
  code: 'code-slash-outline',
  data: 'calculator-outline',
  text: 'text-outline',
  files: 'document-outline',
  docs: 'grid-outline',
  daemon: 'time-outline',
};
