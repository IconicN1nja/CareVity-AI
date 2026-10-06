import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pedometer } from 'expo-sensors';
import { useScore } from '../../../context/ScoreContext';
import { apiGet, apiPost } from '../../../lib/api';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../../../context/ThemeContext';
import { useToast } from '../../../context/ToastContext';

export default function CoreTasksScreen() {
  const { refreshScores } = useScore();
  const { colors, isDarkMode } = useTheme();
  const toast = useToast();

  // Tasks State
  const [sleepChecked, setSleepChecked] = useState(false);
  const [hydrationLevel, setHydrationLevel] = useState(0);
  
  // Pedometer State
  const [isPedometerAvailable, setIsPedometerAvailable] = useState('checking');
  const [currentStepCount, setCurrentStepCount] = useState(0);
  const STEP_GOAL = 5000;
  const stepsCompletedRef = useRef(false);

  useEffect(() => {
    let subscription: { remove: () => void } | undefined;
    const loadTasks = async () => {
      const result = await apiGet<{ tasks: { taskId: string; status: string; progress: number }[] }>(
        '/api/v1/tasks/today'
      );
      const sleep = result.tasks.find((task) => task.taskId === 'SLEEP_CURFEW');
      const hydration = result.tasks.find((task) => task.taskId === 'HYDRATION_FLOW');
      const steps = result.tasks.find((task) => task.taskId === 'STEP_QUEST');
      setSleepChecked(sleep?.status === 'COMPLETED');
      setHydrationLevel(Math.min(Math.round((hydration?.progress || 0) / 400), 10));
      setCurrentStepCount(steps?.progress || 0);
      stepsCompletedRef.current = steps?.status === 'COMPLETED';
    };
    loadTasks().catch((error) => toast.show('Unable to load tasks', error.message, 'error'));

    const subscribeToPedometer = async () => {
      const isAvailable = await Pedometer.isAvailableAsync();
      setIsPedometerAvailable(String(isAvailable));
      if (isAvailable) {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const historical = await Pedometer.getStepCountAsync(start, new Date());
        setCurrentStepCount(historical.steps);
        await apiPost('/api/v1/tasks/step-quest/progress', { steps: historical.steps });
        subscription = Pedometer.watchStepCount(async (result) => {
          const total = historical.steps + result.steps;
          setCurrentStepCount(total);
          if (total >= STEP_GOAL && !stepsCompletedRef.current) {
            await apiPost('/api/v1/tasks/step-quest/progress', { steps: total });
            stepsCompletedRef.current = true;
            await refreshScores();
          }
        });
      }
    };
    subscribeToPedometer().catch((error) => toast.show('Step tracking unavailable', error.message, 'error'));
    return () => {
      if (subscription) subscription.remove();
    };
  }, [refreshScores, toast]);

  const handleSleepToggle = async () => {
    if (sleepChecked) return;
    try {
      await apiPost('/api/v1/tasks/sleep-curfew/result', {
        screenUsedAfterCurfew: false,
        idleUntilMorning: true,
      });
      setSleepChecked(true);
      await refreshScores();
    } catch (error) {
      toast.show('Unable to verify sleep', error instanceof Error ? error.message : 'Please try again.', 'error');
    }
  };

  const handleHydrationTap = async () => {
    if (hydrationLevel < 10) {
      try {
        const result = await apiPost<{ currentTotalMl: number }>(
          '/api/v1/tasks/hydration',
          { amountMl: 400 }
        );
        setHydrationLevel(Math.min(Math.round(result.currentTotalMl / 400), 10));
        await refreshScores();
      } catch (error) {
        toast.show('Unable to log hydration', error instanceof Error ? error.message : 'Please try again.', 'error');
      }
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 40 }}>
      <Animated.View entering={FadeInUp.delay(100).springify()}>
        <View style={styles.header}>
          
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your 3 foundational pillars ({isPedometerAvailable === 'true' ? 'step tracking on' : 'step tracking unavailable'})</Text>
        </View>
      </Animated.View>

      {/* Sleep Curfew */}
      <Animated.View entering={FadeInUp.delay(200).springify()}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
          <View style={styles.cardHeader}>
            <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.iconCircle}>
              <Ionicons name="moon" size={24} color="#fff" />
            </LinearGradient>
            <View style={styles.cardTextContainer}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Sleep Curfew</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>In bed by 10:30 PM</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.inputBackground, borderColor: colors.border }, sleepChecked ? styles.actionButtonActive : null]} 
            onPress={handleSleepToggle}
          >
            <Text style={[styles.actionButtonText, { color: colors.textSecondary }, sleepChecked ? styles.actionButtonTextActive : null]}>
              {sleepChecked ? 'Verified' : 'Verify Curfew'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Hydration Flow */}
      <Animated.View entering={FadeInUp.delay(300).springify()}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
          <View style={styles.cardHeader}>
            <LinearGradient colors={['#0EA5E9', '#0284C7']} style={styles.iconCircle}>
              <Ionicons name="water" size={24} color="#fff" />
            </LinearGradient>
            <View style={styles.cardTextContainer}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Hydration Flow</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>4 Liters Daily ({hydrationLevel}/10)</Text>
            </View>
          </View>
          <TouchableOpacity style={[styles.hydrationWidget, { backgroundColor: colors.inputBackground, borderColor: colors.border }]} onPress={handleHydrationTap} activeOpacity={0.7}>
            <LinearGradient 
              colors={['#38BDF8', '#0284C7']} 
              style={[styles.hydrationFill, { width: `${(hydrationLevel / 10) * 100}%` }]} 
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            />
            <Text style={[styles.hydrationWidgetText, { color: isDarkMode ? (hydrationLevel > 5 ? '#000' : '#fff') : '#0F172A' }]}>Tap to log 400ml</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Step Quest */}
      <Animated.View entering={FadeInUp.delay(400).springify()}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }]}>
          <View style={styles.cardHeader}>
            <LinearGradient colors={['#10B981', '#059669']} style={styles.iconCircle}>
              <Ionicons name="walk" size={24} color="#fff" />
            </LinearGradient>
            <View style={styles.cardTextContainer}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Step Quest</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>5,000 Steps Daily</Text>
            </View>
          </View>
          <View style={styles.stepContainer}>
            <Text style={[styles.stepCount, { color: colors.text }]}>{currentStepCount}</Text>
            <Text style={[styles.stepGoal, { color: colors.textSecondary }]}>/ {STEP_GOAL} steps</Text>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: colors.inputBackground }]}>
            <LinearGradient 
              colors={['#34D399', '#059669']} 
              style={[styles.progressBarFill, { width: `${Math.min((currentStepCount / STEP_GOAL) * 100, 100)}%` }]} 
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            />
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  cardTextContainer: { marginLeft: 16 },
  cardTitle: { fontSize: 20, fontFamily: 'Outfit_600SemiBold' },
  cardSubtitle: { fontSize: 14, fontFamily: 'Outfit_400Regular', marginTop: 2 },
  actionButton: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1 },
  actionButtonActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  actionButtonText: { fontSize: 16, fontFamily: 'Outfit_600SemiBold' },
  actionButtonTextActive: { color: '#fff' },
  hydrationWidget: { height: 60, borderRadius: 16, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  hydrationFill: { position: 'absolute', left: 0, top: 0, bottom: 0, opacity: 0.9 },
  hydrationWidgetText: { fontFamily: 'Outfit_600SemiBold', fontSize: 16, zIndex: 10 },
  stepContainer: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 15 },
  stepCount: { fontSize: 48, fontFamily: 'Outfit_700Bold' },
  stepGoal: { fontSize: 16, fontFamily: 'Outfit_400Regular', marginLeft: 8 },
  progressBarBg: { height: 12, borderRadius: 6, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 6 },
});
