import React, { createContext, useContext, useState, ReactNode } from 'react';
import * as Speech from 'expo-speech';
import { generateAIResponse } from '../lib/aiService';
import { useScore } from './ScoreContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface VoiceContextType {
  isListening: boolean;
  simulateWakeWord: (mockInput: string) => Promise<void>;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [isListening, setIsListening] = useState(false);
  const { refreshScores } = useScore();

  // In production, Picovoice Porcupine would trigger here automatically
  // For Expo Go MVP, we simulate the wake word detection and speech input
  const simulateWakeWord = async (mockInput: string) => {
    setIsListening(true);
    try {
      Speech.stop();
      const name = await AsyncStorage.getItem('userName') || 'User';
      const bmi = await AsyncStorage.getItem('userBMI') || '22.0';
      const bmiLabel = await AsyncStorage.getItem('userBMILabel') || 'Normal';
      const aiResponse = await generateAIResponse(mockInput, { name, bmi, bmiLabel });
      await refreshScores();
      Speech.speak(aiResponse.text, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.9,
      });
    } finally {
      setIsListening(false);
    }
  };

  return (
    <VoiceContext.Provider value={{ isListening, simulateWakeWord }}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (context === undefined) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
}
