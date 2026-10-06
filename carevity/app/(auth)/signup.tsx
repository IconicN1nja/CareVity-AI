import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { signUp } from 'aws-amplify/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SignupScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const toast = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setLoading(true);
    if (!name || !email || !password) {
      toast.show('Missing Information', 'Please fill in your name, email, and password.', 'error');
      setLoading(false);
      return;
    }
    
    try {
      const { isSignUpComplete, nextStep } = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            name: name
          },
          autoSignIn: true
        }
      });
      
      await AsyncStorage.setItem('userName', name);
      await AsyncStorage.setItem('signupEmail', email); // to carry over to verify screen
      
      if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        router.replace('/verify-email');
      } else if (isSignUpComplete) {
        router.replace('/(root)/(drawer)/dashboard');
      }
    } catch (error: any) {
      toast.show('Signup Failed', error.message || 'An error occurred during signup', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Begin your health optimization journey</Text>
          </View>

          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
            <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              placeholder="e.g. Alex Health"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.label, { color: colors.text }]}>Email Address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="e.g. alex@health.com"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
            <View style={[styles.passwordContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0, borderWidth: 0, backgroundColor: 'transparent', color: colors.text }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="Create a strong password"
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ paddingHorizontal: 15 }}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.submitBtn, { marginTop: 20 }]} onPress={handleSignup} disabled={loading}>
              <LinearGradient colors={colors.primaryGradient} style={styles.submitGradient}>
                <Text style={styles.submitBtnText}>{loading ? 'Creating...' : 'Create Account'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={[styles.footerLink, { color: colors.primary }]}> Sign In</Text>
            </TouchableOpacity>
          </View>
          
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 20, paddingTop: 60, paddingBottom: 40 },
  backButton: { position: 'absolute', top: 20, left: 20, zIndex: 10, width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 22, borderWidth: 1 },
  header: { marginBottom: 40, marginTop: 40 },
  title: { fontSize: 32, fontFamily: 'Outfit_700Bold' },
  subtitle: { fontSize: 16, fontFamily: 'Outfit_400Regular', marginTop: 5 },
  formCard: { padding: 24, borderRadius: 24, borderWidth: 1, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  label: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', marginBottom: 8 },
  input: { borderRadius: 16, padding: 16, fontSize: 16, fontFamily: 'Outfit_400Regular', borderWidth: 1, marginBottom: 20 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, marginBottom: 15 },
  submitBtn: { borderRadius: 16, overflow: 'hidden' },
  submitGradient: { paddingVertical: 18, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 18, fontFamily: 'Outfit_700Bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40 },
  footerText: { fontFamily: 'Outfit_400Regular', fontSize: 15 },
  footerLink: { fontFamily: 'Outfit_700Bold', fontSize: 15 }
});
