import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { BackHandler, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { useSandboxInit } from '@/src/hooks/useSandboxInit';
import SandboxLoadingScreen from '@/src/screens/SandboxLoadingScreen';
import SandboxErrorScreen from '@/src/screens/SandboxErrorScreen';

const DarkNavTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: '#000000',
    card: '#000000',
    text: '#FFFFFF',
    border: '#38383A',
    primary: '#FFFFFF',
  },
};

export default function RootLayout() {
  const { status, progress, error, skip, retry } = useSandboxInit();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync('#000000');
  }, []);

  // Предотвращаем GO_BACK на корневом экране — закрываем приложение вместо краша
  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      BackHandler.exitApp();
      return true;
    });
    return () => handler.remove();
  }, []);

  if (status === 'loading' || status === 'downloading') {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: '#000000' }}>
          <SandboxLoadingScreen progress={progress} />
        </View>
        <StatusBar style="light" />
      </GestureHandlerRootView>
    );
  }

  if (status === 'error') {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: '#000000' }}>
          <SandboxErrorScreen error={error} onRetry={retry} onSkip={skip} />
        </View>
        <StatusBar style="light" />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={DarkNavTheme}>
        <View style={{ flex: 1, backgroundColor: '#000000' }}>
          <Stack screenOptions={{ headerShown: false, animation: 'none', contentStyle: { backgroundColor: '#000000' } }}>
            <Stack.Screen name="index" />
          </Stack>
        </View>
        <StatusBar style="light" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
