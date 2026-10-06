import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useScore } from '../../../context/ScoreContext';
import { apiGet, apiPost } from '../../../lib/api';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../../../context/ThemeContext';

export default function ChallengesScreen() {
  const [dailyChallenges, setDailyChallenges] = useState<{
    challengeId: string;
    title: string;
    description?: string;
    status: string;
  }[]>([]);
  const { refreshScores } = useScore();
  const { colors, isDarkMode } = useTheme();

  useEffect(() => {
    apiGet<{ challenges: typeof dailyChallenges }>('/api/v1/challenges/today')
      .then((result) => setDailyChallenges(result.challenges))
      .catch((error) => {
        console.warn('Failed to load challenges', error);
      });
  }, []);

  const toggleChallenge = async (index: number) => {
    const challenge = dailyChallenges[index];
    if (!challenge || challenge.status === 'COMPLETED') return;
    try {
      const result = await apiPost<{ challenge: typeof challenge }>(
        `/api/v1/challenges/${challenge.challengeId}/complete`,
        {}
      );
      setDailyChallenges((current) =>
        current.map((item, itemIndex) => itemIndex === index ? result.challenge : item)
      );
      await refreshScores();
    } catch (error) {
      console.warn('Failed to complete challenge', error);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 40 }}>
      <Animated.View entering={FadeInUp.delay(100).springify()}>
        <View style={styles.header}>
       
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Complete these for bonus points</Text>
        </View>
      </Animated.View>

      {dailyChallenges.map((challenge, index) => (
        <Animated.View key={index} entering={FadeInUp.delay((index + 2) * 100).springify()}>
          <LinearGradient
            colors={challenge.status === 'COMPLETED' ? (isDarkMode ? ['#064E3B', '#065F46'] : ['#F0FDF4', '#DCFCE7']) : (isDarkMode ? [colors.card, colors.background] : ['#FFFFFF', '#F8FAFC'])}
            style={[styles.card, { borderColor: colors.border, shadowColor: colors.shadow }, challenge.status === 'COMPLETED' && styles.cardCompleted]}
          >
            <View style={styles.cardContent}>
              <LinearGradient colors={challenge.status === 'COMPLETED' ? ['#10B981', '#059669'] : colors.primaryGradient} style={styles.iconCircle}>
                <Ionicons name={challenge.status === 'COMPLETED' ? "checkmark-circle" : "flame"} size={24} color="#fff" />
              </LinearGradient>
              <Text style={[styles.challengeText, { color: colors.text }, challenge.status === 'COMPLETED' && styles.challengeTextCompleted]}>
                {challenge.title}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }, challenge.status === 'COMPLETED' && styles.actionButtonDisabled]}
              onPress={() => toggleChallenge(index)}
              disabled={challenge.status === 'COMPLETED'}
            >
              <Text style={[styles.actionButtonText, { color: colors.primary }, challenge.status === 'COMPLETED' && styles.actionButtonTextDisabled]}>
                {challenge.status === 'COMPLETED' ? '+10 Points Earned' : 'Complete Task'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 10, marginBottom: 10 },
  title: { fontSize: 32, fontFamily: 'Outfit_700Bold' },
  subtitle: { fontSize: 16, fontFamily: 'Outfit_400Regular', marginTop: 5 },
  card: { marginHorizontal: 20, marginBottom: 20, padding: 24, borderRadius: 24, borderWidth: 1, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  cardCompleted: { borderColor: '#10B981' },
  cardContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  iconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  challengeText: { flex: 1, fontSize: 18, fontFamily: 'Outfit_600SemiBold', lineHeight: 24 },
  challengeTextCompleted: { color: '#10B981', textDecorationLine: 'line-through', opacity: 0.8 },
  actionButton: { paddingVertical: 14, borderRadius: 16, alignItems: 'center', borderWidth: 1 },
  actionButtonDisabled: { backgroundColor: 'transparent', borderColor: 'transparent', elevation: 0 },
  actionButtonText: { fontSize: 16, fontFamily: 'Outfit_600SemiBold' },
  actionButtonTextDisabled: { color: '#10B981' }
});
