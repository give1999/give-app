import { themes, ThemeTokens, Theme } from '@/constants/theme';

export function useTheme(): ThemeTokens & { currentTheme: Theme } {
  return {
    ...themes.dark,
    currentTheme: 'dark',
  };
}
