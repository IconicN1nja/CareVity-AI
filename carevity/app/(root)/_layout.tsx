import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
      <Stack.Screen name="assessment" options={{ headerShown: false }} />
      <Stack.Screen name="change-password" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
  );
}