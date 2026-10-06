import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

export default function EntryScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <LinearGradient colors={colors.primaryGradient} style={[styles.iconCircle, { shadowColor: colors.primary }]}>
            <Ionicons name="pulse" size={64} color="#fff" />
          </LinearGradient>
          <Text style={[styles.title, { color: colors.text }]}>CareVity</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your Digital Biological Twin</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, { shadowColor: colors.primary }]} onPress={() => router.push('/(auth)/signup')}>
            <LinearGradient colors={colors.primaryGradient} style={styles.buttonGradient}>
              <Text style={styles.buttonText}>Get Started</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/(auth)/login')}>
            <Text style={[styles.loginText, { color: colors.primary }]}>Already have an account? Log In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, justifyContent: 'space-between', padding: 24, paddingTop: 80, paddingBottom: 40 },
  logoContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  iconCircle: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 24, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  title: { fontSize: 48, fontFamily: 'Outfit_900Black', letterSpacing: -1, marginBottom: 8 },
  subtitle: { fontSize: 18, fontFamily: 'Outfit_400Regular', textAlign: 'center' },
  buttonContainer: { width: '100%' },
  button: { width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 16, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  buttonGradient: { paddingVertical: 18, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontFamily: 'Outfit_700Bold' },
  loginButton: { paddingVertical: 16, alignItems: 'center' },
  loginText: { fontSize: 16, fontFamily: 'Outfit_600SemiBold' },
});
