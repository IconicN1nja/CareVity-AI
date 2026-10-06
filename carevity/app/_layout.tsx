import { DefaultTheme, DarkTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useFonts, Outfit_400Regular, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';

import { ScoreProvider } from '../context/ScoreContext';
import { VoiceProvider } from '../context/VoiceContext';
import { ThemeProvider as CustomThemeProvider, useTheme } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';
import { ActivityIndicator, View } from 'react-native';

import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';

Amplify.configure(outputs);

export const unstable_settings = {
  initialRouteName: 'splash',
};

function RootLayoutNav() {
  const { isDarkMode } = useTheme();
  
  return (
    <NavThemeProvider value={isDarkMode ? DarkTheme : DefaultTheme}>
      <ScoreProvider>
        <VoiceProvider>
          <Stack>
            <Stack.Screen name="splash" options={{ headerShown: false }} />
            <Stack.Screen name="entry" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(root)" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style={isDarkMode ? "light" : "dark"} />
        </VoiceProvider>
      </ScoreProvider>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  return (
    <CustomThemeProvider>
      <ToastProvider>
        <RootLayoutNav />
      </ToastProvider>
    </CustomThemeProvider>
  );
}
