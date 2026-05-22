import { Stack } from 'expo-router';

export default function SandboxSettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#000000' },
        animationDuration: 200,
      }}
    >
      <Stack.Screen name="environments" />
      <Stack.Screen name="packages" />
    </Stack>
  );
}