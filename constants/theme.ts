// Re-export from the new design system
export { themes, Colors } from '@/src/design/theme';
import type { Theme as ThemeObj, ThemeMode } from '@/src/design/theme';
export type Theme = ThemeMode;
export type ThemeTokens = ThemeObj;
