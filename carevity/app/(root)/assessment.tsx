import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPost } from '../../lib/api';

export default function AssessmentScreen() {
  const router = useRouter();
  const { colors, isDarkMode } = useTheme();
  
  const [name, setName] = useState('');

  useEffect(() => {
    const loadName = async () => {
      try {
        const storedName = await AsyncStorage.getItem('userName');
        if (storedName) setName(storedName);
      } catch (e) {
        console.warn('Failed to load name', e);
      }
    };
    loadName();
  }, []);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [heightCM, setHeightCM] = useState('');
  const [weightKG, setWeightKG] = useState('');
  const [activityLevel, setActivityLevel] = useState('Sedentary');
  const [locality, setLocality] = useState('');

  const handleComplete = async () => {
    const ageValue = Number(age);
    const heightValue = Number(heightCM);
    const weightValue = Number(weightKG);
    if (!name.trim() || !locality.trim() || !Number.isFinite(ageValue) ||
      !Number.isFinite(heightValue) || !Number.isFinite(weightValue)) {
      Alert.alert('Incomplete', 'Please enter your name, locality, age, height, and weight.');
      return;
    }

    try {
      const result = await apiPost<{ user: { bmi: number; bmiLabel: string } }>(
        '/api/v1/users/me/onboarding',
        {
          name: name.trim(),
          age: ageValue,
          heightCm: heightValue,
          weightKg: weightValue,
          locality: locality.trim(),
        }
      );
      const bmiVal = String(result.user.bmi);
      const bmiLabel = result.user.bmiLabel;
      await AsyncStorage.setItem('userName', name);
      await AsyncStorage.setItem('userBMI', bmiVal);
      await AsyncStorage.setItem('userBMILabel', bmiLabel);
      await AsyncStorage.setItem('userOnboarded', 'true');
      
      if (router.canDismiss()) router.dismissAll();
      router.replace('/(root)/(drawer)/dashboard');
    } catch (e) {
      Alert.alert('Unable to save assessment', e instanceof Error ? e.message : 'Please try again.');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Biological Assessment</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Let&apos;s calibrate your Digital Twin</Text>
      </View>

      <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
        <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
        <TextInput 
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]} 
          placeholder="e.g. Alex" 
          placeholderTextColor={colors.textSecondary}
          value={name} onChangeText={setName} 
        />

        <Text style={[styles.label, { color: colors.text }]}>Locality</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
          placeholder="e.g. Rajgangpur"
          placeholderTextColor={colors.textSecondary}
          value={locality}
          onChangeText={setLocality}
        />

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={[styles.label, { color: colors.text }]}>Age</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]} 
              placeholder="Years" 
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              value={age} onChangeText={setAge} 
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1.5 }]}>
            <Text style={[styles.label, { color: colors.text }]}>Gender</Text>
            <View style={[styles.pickerContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <Picker
                selectedValue={gender}
                onValueChange={(v) => setGender(v)}
                style={[styles.picker, { color: colors.text }]}
                dropdownIconColor={colors.text}
              >
                <Picker.Item label="Male" value="Male" color={isDarkMode ? "#fff" : "#000"} />
                <Picker.Item label="Female" value="Female" color={isDarkMode ? "#fff" : "#000"} />
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={[styles.label, { color: colors.text }]}>Height (cm)</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]} 
              placeholder="175" 
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              value={heightCM} onChangeText={setHeightCM} 
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={[styles.label, { color: colors.text }]}>Weight (kg)</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]} 
              placeholder="70" 
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              value={weightKG} onChangeText={setWeightKG} 
            />
          </View>
        </View>

        <Text style={[styles.label, { color: colors.text }]}>Activity Level</Text>
        <View style={[styles.pickerContainer, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <Picker
            selectedValue={activityLevel}
            onValueChange={(v) => setActivityLevel(v)}
            style={[styles.picker, { color: colors.text }]}
            dropdownIconColor={colors.text}
          >
            <Picker.Item label="Sedentary (Office Job)" value="Sedentary" color={isDarkMode ? "#fff" : "#000"} />
            <Picker.Item label="Lightly Active (1-3 days)" value="Lightly Active" color={isDarkMode ? "#fff" : "#000"} />
            <Picker.Item label="Moderately Active (3-5 days)" value="Moderately Active" color={isDarkMode ? "#fff" : "#000"} />
            <Picker.Item label="Very Active (6-7 days)" value="Very Active" color={isDarkMode ? "#fff" : "#000"} />
          </Picker>
        </View>

      </View>

      <TouchableOpacity onPress={handleComplete} style={styles.submitBtn}>
        <LinearGradient colors={colors.primaryGradient} style={styles.submitGradient}>
          <Text style={styles.submitBtnText}>Continue</Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { marginBottom: 30, marginTop: 40 },
  title: { fontSize: 32, fontFamily: 'Outfit_700Bold' },
  subtitle: { fontSize: 16, fontFamily: 'Outfit_400Regular', marginTop: 5 },
  formCard: { padding: 24, borderRadius: 24, borderWidth: 1, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3, marginBottom: 30 },
  label: { fontSize: 14, fontFamily: 'Outfit_600SemiBold', marginBottom: 8 },
  input: { borderRadius: 16, padding: 16, fontSize: 16, fontFamily: 'Outfit_400Regular', borderWidth: 1, marginBottom: 20 },
  row: { flexDirection: 'row' },
  inputGroup: {},
  pickerContainer: { borderRadius: 16, borderWidth: 1, marginBottom: 20, overflow: 'hidden', height: 55, justifyContent: 'center' },
  picker: { fontFamily: 'Outfit_400Regular' },
  submitBtn: { borderRadius: 16, overflow: 'hidden' },
  submitGradient: { paddingVertical: 18, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 18, fontFamily: 'Outfit_700Bold' },
});