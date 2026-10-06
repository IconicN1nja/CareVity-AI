import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useScore } from '../../../context/ScoreContext';
import { useVoice } from '../../../context/VoiceContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../../../context/ThemeContext';
import LiquidTwin from '../../../components/ui/LiquidTwin';

export default function DashboardScreen() {
  const { monthlyTasksCompleted, lifetimePoints, dailyTasksCompleted } = useScore();
  const { simulateWakeWord, isListening } = useVoice();
  const { colors, isDarkMode } = useTheme();
  const [mockSpeech, setMockSpeech] = useState('');
  
  // Fake calculation for MVP view
  const taskAchievement = monthlyTasksCompleted / 180;
  const improvementScore = Math.min(Math.round(taskAchievement * 100), 100);

  const handleSimulateVoice = () => {
    if (mockSpeech.trim()) {
      simulateWakeWord(mockSpeech);
      setMockSpeech('');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 40 }}>
      
      <Animated.View entering={FadeInUp.delay(100).springify()}>
        <View style={styles.header}>
          
         
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(200).springify()}>
        <LinearGradient
          colors={isDarkMode ? [colors.card, colors.background] : ['#FFFFFF', '#F1F5F9']}
          style={[styles.scoreCard, { borderColor: colors.border, shadowColor: colors.shadow }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>Biological Optimization</Text>
          <View style={[styles.scoreCircle, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <LinearGradient
              colors={colors.primaryGradient}
              style={styles.scoreCircleInner}
            >
              <Text style={styles.scoreText}>{improvementScore}</Text>
              <Text style={styles.scoreLabel}>/ 100</Text>
            </LinearGradient>
          </View>
          <View style={styles.scoreDetails}>
            <Text style={[styles.scoreDetailText, { color: colors.textSecondary }]}>Monthly Tasks: {monthlyTasksCompleted}/180</Text>
            <Text style={[styles.scoreDetailText, { color: colors.textSecondary }]}>Level {Math.floor(lifetimePoints / 100) + 1}</Text>
          </View>
        </LinearGradient>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(300).springify()}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
          <Text style={[styles.cardTitleLight, { color: colors.text }]}>Neural Link (AI Voice Coach)</Text>
          <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
            Because background wake words require native compilation, tap below to simulate speaking to CareVity.
          </Text>
          <View style={{ flexDirection: 'row', marginTop: 15 }}>
            <TextInput 
              style={[styles.inputBox, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              placeholder="Try: 'I ate two samosas'"
              placeholderTextColor={colors.textSecondary}
              value={mockSpeech}
              onChangeText={setMockSpeech}
            />
            <TouchableOpacity 
              onPress={handleSimulateVoice}
              disabled={isListening}
            >
              <LinearGradient
                colors={colors.primaryGradient}
                style={styles.sendButton}
              >
                {isListening ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={20} color="#fff" />}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(400).springify()}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
          <Text style={[styles.cardTitleLight, { color: colors.text }]}>Physical Avatar</Text>
          <View style={styles.twinContainer}>
            <LiquidTwin 
              percentage={improvementScore} 
              color={colors.primary} 
            />
            <Text style={[styles.twinText, { color: colors.textSecondary }]}>
              {dailyTasksCompleted > 0 ? "Consistent habits are strengthening your body!" : "Start checking tasks to fill your digital twin."}
            </Text>
          </View>
        </View>
      </Animated.View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 10 },
  title: { fontSize: 32, fontFamily: 'Outfit_700Bold' },
  subtitle: { fontSize: 16, fontFamily: 'Outfit_400Regular', marginTop: 5 },
  card: { marginHorizontal: 20, marginBottom: 20, padding: 24, borderRadius: 24, borderWidth: 1, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  scoreCard: { marginHorizontal: 20, marginBottom: 20, padding: 24, borderRadius: 24, alignItems: 'center', borderWidth: 1, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  cardTitle: { fontSize: 18, fontFamily: 'Outfit_600SemiBold', marginBottom: 15 },
  cardTitleLight: { fontSize: 18, fontFamily: 'Outfit_600SemiBold', marginBottom: 15 },
  descriptionText: { fontFamily: 'Outfit_400Regular', fontSize: 14, lineHeight: 20 },
  scoreCircle: { width: 180, height: 180, borderRadius: 90, justifyContent: 'center', alignItems: 'center', marginBottom: 20, padding: 10, borderWidth: 1 },
  scoreCircleInner: { width: '100%', height: '100%', borderRadius: 80, justifyContent: 'center', alignItems: 'center' },
  scoreText: { fontSize: 64, fontFamily: 'Outfit_700Bold', color: '#fff' },
  scoreLabel: { fontSize: 16, fontFamily: 'Outfit_600SemiBold', color: 'rgba(255,255,255,0.9)', marginTop: -5 },
  scoreDetails: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 10 },
  scoreDetailText: { fontSize: 14, fontFamily: 'Outfit_600SemiBold' },
  twinContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 10 },
  twinOutline: { width: 90, height: 160, borderWidth: 2, borderRadius: 45, overflow: 'hidden', justifyContent: 'flex-end', marginBottom: 20 },
  twinFill: { width: '100%', opacity: 0.9 },
  twinText: { textAlign: 'center', fontFamily: 'Outfit_400Regular', paddingHorizontal: 10 },
  inputBox: { flex: 1, padding: 14, borderRadius: 16, borderWidth: 1, fontFamily: 'Outfit_400Regular', fontSize: 15 },
  sendButton: { padding: 15, borderRadius: 16, marginLeft: 12, justifyContent: 'center', alignItems: 'center', width: 54, height: 54 }
});
