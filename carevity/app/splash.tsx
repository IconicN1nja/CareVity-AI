import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { fetchAuthSession } from 'aws-amplify/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGet } from '../lib/api';

export default function SplashScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    let cancelled = false;

    const routeUser = async () => {
      try {
        const session = await fetchAuthSession();
        const accessToken = session.tokens?.accessToken;

        if (!accessToken) {
          if (!cancelled) router.replace('/entry');
          return;
        }

        const result = await apiGet<{ user: { onboarded?: boolean } }>('/api/v1/users/me');
        if (cancelled) return;

        if (result.user.onboarded) {
          await AsyncStorage.setItem('userOnboarded', 'true');
          router.replace('/(root)/(drawer)/dashboard');
        } else {
          router.replace('/(root)/assessment');
        }
      } catch {
        if (!cancelled) router.replace('/entry');
      }
    };

    const timer = setTimeout(routeUser, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <Text style={[styles.title, { color: '#ffffff' }]}>Carevity AI</Text>
      <ActivityIndicator size="large" color="#ffffff" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 48, fontWeight: 'bold', marginBottom: 20 },
});
