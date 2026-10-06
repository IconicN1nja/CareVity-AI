import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { confirmSignUp, resendSignUpCode, signOut } from 'aws-amplify/auth';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const loadEmail = async () => {
      const savedEmail = await AsyncStorage.getItem('signupEmail');
      if (savedEmail) setEmail(savedEmail);
    };
    loadEmail();
  }, []);

  const handleVerify = async () => {
    if (!code) {
      toast.show('Missing Code', 'Please enter the verification code sent to your email.', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const { isSignUpComplete } = await confirmSignUp({
        username: email,
        confirmationCode: code
      });
      
      if (isSignUpComplete) {
        toast.show('Verified!', 'Your email has been verified successfully.', 'success');
        if (router.canDismiss()) router.dismissAll();
        router.replace('/(root)/assessment');
      }
    } catch (error: any) {
      toast.show('Error', error.message || 'Invalid code', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await resendSignUpCode({ username: email });
      toast.show('Sent!', 'A new verification code has been sent to your inbox.', 'success');
    } catch (error: any) {
      toast.show('Error', error.message, 'error');
    } finally {
      setResendLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/entry');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-unread-outline" size={80} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Check your email</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          We&apos;ve sent a 6-digit verification code to {email}. Please enter it below.
        </Text>
        
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          placeholder="000000"
          placeholderTextColor={colors.textSecondary}
          maxLength={6}
          textAlign="center"
        />

        <TouchableOpacity style={{ width: '100%', marginTop: 20 }} onPress={handleVerify} disabled={loading}>
          <LinearGradient colors={colors.primaryGradient} style={styles.primaryButton}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Verify Account</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleResend} disabled={resendLoading}>
          {resendLoading ? <ActivityIndicator color={colors.primary} /> : <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Resend Code</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={[styles.logoutText, { color: colors.textSecondary }]}>Use a different account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 30, justifyContent: 'center', alignItems: 'center' },
  iconContainer: { marginBottom: 30, backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: 30, borderRadius: 100 },
  title: { fontSize: 32, fontFamily: 'Outfit_700Bold', marginBottom: 15, textAlign: 'center' },
  subtitle: { fontSize: 16, fontFamily: 'Outfit_400Regular', textAlign: 'center', lineHeight: 24, marginBottom: 30 },
  input: { width: '100%', borderRadius: 16, padding: 20, fontSize: 32, fontFamily: 'Outfit_700Bold', borderWidth: 1, marginBottom: 20, letterSpacing: 10 },
  primaryButton: { width: '100%', padding: 20, borderRadius: 16, alignItems: 'center', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  primaryButtonText: { color: '#fff', fontSize: 18, fontFamily: 'Outfit_700Bold' },
  secondaryButton: { marginTop: 25, padding: 10 },
  secondaryButtonText: { fontSize: 16, fontFamily: 'Outfit_600SemiBold' },
  logoutButton: { marginTop: 40 },
  logoutText: { fontSize: 14, fontFamily: 'Outfit_400Regular' }
});
