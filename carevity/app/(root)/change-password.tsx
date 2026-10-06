import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { updatePassword } from 'aws-amplify/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const toast = useToast();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.show('Missing Fields', 'Please fill in all fields', 'error');
      return;
    }
    if (newPassword.length < 6) {
      toast.show('Weak Password', 'New password must be at least 6 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.show('Mismatch', 'New passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      await updatePassword({
        oldPassword: currentPassword,
        newPassword: newPassword,
      });
      toast.show('Success', 'Your password has been securely updated.', 'success', () => router.back());
    } catch (error: any) {
      toast.show('Update Failed', error.message || 'An error occurred', 'error');
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
            <Text style={[styles.title, { color: colors.text }]}>Change Password</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Secure your account with a new password</Text>
          </View>

          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
            
            <Text style={[styles.label, { color: colors.text }]}>Current Password</Text>
            <View style={[styles.passwordContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0, borderWidth: 0, backgroundColor: 'transparent', color: colors.text }]}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)} style={{ paddingHorizontal: 15 }}>
                <Ionicons name={showCurrentPassword ? "eye-off" : "eye"} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.text }]}>New Password</Text>
            <View style={[styles.passwordContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0, borderWidth: 0, backgroundColor: 'transparent', color: colors.text }]}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                placeholder="Enter new password"
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)} style={{ paddingHorizontal: 15 }}>
                <Ionicons name={showNewPassword ? "eye-off" : "eye"} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.text }]}>Confirm New Password</Text>
            <View style={[styles.passwordContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0, borderWidth: 0, backgroundColor: 'transparent', color: colors.text }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={colors.textSecondary}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ paddingHorizontal: 15 }}>
                <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.submitBtn, { marginTop: 20 }]} onPress={handleSave} disabled={loading}>
              <LinearGradient colors={colors.primaryGradient} style={styles.submitGradient}>
                <Text style={styles.submitBtnText}>{loading ? 'Saving...' : 'Update Password'}</Text>
              </LinearGradient>
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
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  submitBtn: { borderRadius: 16, overflow: 'hidden' },
  submitGradient: { paddingVertical: 18, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 18, fontFamily: 'Outfit_700Bold' }
});
