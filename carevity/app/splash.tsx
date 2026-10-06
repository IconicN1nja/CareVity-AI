import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function SplashScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    setTimeout(() => {
      router.replace('/entry');
    }, 2000);
  }, []);

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
