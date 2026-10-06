import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Image, Modal, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useScore } from '../../../context/ScoreContext';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../../../context/ThemeContext';
import { useRouter } from 'expo-router';
import { signOut, fetchUserAttributes } from 'aws-amplify/auth';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { lifetimePoints } = useScore();
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const router = useRouter();
  
  const [name, setName] = useState('User');
  const [bmi, setBmi] = useState('--');
  const [bmiLabel, setBmiLabel] = useState('Normal');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [isLogoutVisible, setLogoutVisible] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const storedName = await AsyncStorage.getItem('userName');
        const storedBmi = await AsyncStorage.getItem('userBMI');
        const storedLabel = await AsyncStorage.getItem('userBMILabel');
        const storedImage = await AsyncStorage.getItem('profileImage');

        let userAttributes: any = {};
        try {
          userAttributes = await fetchUserAttributes();
        } catch (e) {
          console.warn('Could not fetch user attributes from AWS:', e);
        }

        let resolvedName = 'User';

        if (storedName) {
          resolvedName = storedName;
        } else if (userAttributes.name) {
          resolvedName = userAttributes.name;
          await AsyncStorage.setItem('userName', userAttributes.name);
        } else if (userAttributes.email) {
          resolvedName = userAttributes.email.split('@')[0];
        }

        if (resolvedName.includes('@')) {
          resolvedName = resolvedName.split('@')[0];
        }
        
        resolvedName = resolvedName.charAt(0).toUpperCase() + resolvedName.slice(1);
        setName(resolvedName);
        
        if (userAttributes.email) {
          setEmail(userAttributes.email);
        }
        
        if (storedBmi) setBmi(storedBmi);
        if (storedLabel) setBmiLabel(storedLabel);
        if (storedImage) setProfileImage(storedImage);
      } catch (e) {
        console.warn('Failed to load profile', e);
      }
    };
    loadProfile();
  }, []);

  const getBmiColors = () => {
    if (bmiLabel === 'Underweight') return ['#F59E0B', '#D97706']; // Orange
    if (bmiLabel === 'Normal') return ['#10B981', '#059669']; // Green
    if (bmiLabel === 'Overweight') return ['#F59E0B', '#D97706']; // Orange
    if (bmiLabel === 'Obese') return ['#EF4444', '#B91C1C']; // Red
    return ['#64748B', '#475569']; // Gray fallback
  };

  const pickImage = async () => {
    setMenuVisible(false);
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setProfileImage(uri);
      await AsyncStorage.setItem('profileImage', uri);
    }
  };

  const removeImage = async () => {
    setMenuVisible(false);
    setProfileImage(null);
    await AsyncStorage.removeItem('profileImage');
  };

  const handleAvatarPress = () => {
    setMenuVisible(true);
  };

  const handleLogout = async () => {
    setLogoutVisible(false);
    try {
      await signOut();
      await AsyncStorage.removeItem('userOnboarded');
      if (router.canDismiss()) router.dismissAll();
      router.replace('/entry');
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 40 }}>
      
      <Animated.View entering={FadeInUp.delay(100).springify()}>
        <View style={styles.header}>
          
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(200).springify()}>
        <View style={styles.profileCard}>
          <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.8}>
            <LinearGradient colors={colors.primaryGradient} style={[styles.avatarPlaceholder, { shadowColor: colors.primary }]}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
          {email ? <Text style={[styles.email, { color: colors.textSecondary }]}>{email}</Text> : null}
          <View style={[styles.pointsBadge, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <Text style={[styles.pointsLabel, { color: colors.textSecondary }]}>Lifetime Points: </Text>
            <Text style={[styles.pointsValue, { color: colors.primary }]}>{lifetimePoints}</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(300).springify()}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Body Mass Index (BMI)</Text>
          <View style={styles.bmiRow}>
            <Text style={[styles.bmiValue, { color: colors.text }]}>{bmi}</Text>
            <LinearGradient colors={getBmiColors() as [string, string]} style={styles.badge}>
              <Text style={styles.badgeText}>{bmiLabel}</Text>
            </LinearGradient>
          </View>
          <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
            Your BMI was calculated during onboarding. A healthy target range for your body structure is between 18.5 and 24.9.
          </Text>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(400).springify()}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>App Settings</Text>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={'#fff'}
            />
          </View>
          
          <View style={[styles.settingRow, { marginTop: 20 }]}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>Password</Text>
            <TouchableOpacity onPress={() => router.push('/(root)/change-password')}>
              <Text style={{ color: colors.primary, fontFamily: 'Outfit_600SemiBold' }}>
                Change
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(500).springify()}>
        <TouchableOpacity style={styles.logoutButton} onPress={() => setLogoutVisible(true)}>
          <Text style={[styles.logoutText, { color: colors.red }]}>Log Out</Text>
        </TouchableOpacity>
      </Animated.View>

      <Modal visible={isMenuVisible} transparent={true} animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalDragIndicator} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Profile Picture</Text>
            
            <TouchableOpacity style={styles.modalOption} onPress={pickImage}>
              <View style={[styles.iconBox, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="image-outline" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.modalOptionText, { color: colors.text }]}>Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={removeImage}>
              <View style={[styles.iconBox, { backgroundColor: colors.red + '20' }]}>
                <Ionicons name="trash-outline" size={24} color={colors.red} />
              </View>
              <Text style={[styles.modalOptionText, { color: colors.red }]}>Remove Picture</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setMenuVisible(false)}>
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={isLogoutVisible} transparent={true} animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setLogoutVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalDragIndicator} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Log Out</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Are you sure you want to log out of your account?</Text>

            <TouchableOpacity style={styles.modalOption} onPress={handleLogout}>
              <View style={[styles.iconBox, { backgroundColor: colors.red + '20' }]}>
                <Ionicons name="log-out-outline" size={24} color={colors.red} />
              </View>
              <Text style={[styles.modalOptionText, { color: colors.red }]}>Yes, Log Out</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setLogoutVisible(false)}>
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 10 },
  title: { fontSize: 32, fontFamily: 'Outfit_700Bold' },
  profileCard: { alignItems: 'center', marginBottom: 30, marginTop: 20 },
  avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 15, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10, overflow: 'hidden' },
  avatarInitial: { fontSize: 48, fontFamily: 'Outfit_700Bold', color: '#fff' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 60 },
  name: { fontSize: 32, fontFamily: 'Outfit_700Bold', marginTop: 10 },
  email: { fontSize: 16, fontFamily: 'Outfit_600SemiBold', marginTop: 4 },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginTop: 15, borderWidth: 1 },
  pointsLabel: { fontSize: 16, fontFamily: 'Outfit_400Regular' },
  pointsValue: { fontSize: 16, fontFamily: 'Outfit_700Bold' },
  card: { marginHorizontal: 20, padding: 24, borderRadius: 24, borderWidth: 1, marginBottom: 20, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  cardTitle: { fontSize: 18, fontFamily: 'Outfit_600SemiBold', marginBottom: 15 },
  bmiRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  bmiValue: { fontSize: 56, fontFamily: 'Outfit_700Bold', marginRight: 15 },
  badge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  badgeText: { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 16 },
  descriptionText: { fontFamily: 'Outfit_400Regular', fontSize: 14, lineHeight: 22 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  settingLabel: { fontSize: 16, fontFamily: 'Outfit_600SemiBold' },
  logoutButton: { marginHorizontal: 20, marginTop: 10, padding: 20, borderRadius: 24, alignItems: 'center' },
  logoutText: { fontSize: 18, fontFamily: 'Outfit_700Bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, borderWidth: 1, borderBottomWidth: 0 },
  modalDragIndicator: { width: 40, height: 5, backgroundColor: 'rgba(150,150,150,0.3)', borderRadius: 5, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontFamily: 'Outfit_700Bold', marginBottom: 15, textAlign: 'center' },
  modalSubtitle: { fontSize: 16, fontFamily: 'Outfit_400Regular', textAlign: 'center', marginBottom: 25, paddingHorizontal: 20 },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, marginBottom: 12, borderRadius: 16 },
  iconBox: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  modalOptionText: { fontSize: 18, fontFamily: 'Outfit_600SemiBold', marginLeft: 16 },
  cancelBtn: { marginTop: 10, paddingVertical: 16, alignItems: 'center' },
  cancelBtnText: { fontSize: 18, fontFamily: 'Outfit_600SemiBold' }
});
