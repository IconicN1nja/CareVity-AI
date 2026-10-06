import React, { createContext, useContext, useState, useEffect } from 'react';
import { useCallback } from 'react';
import { apiGet } from '../lib/api';

type ScoreContextType = {
  lifetimePoints: number;
  monthlyTasksCompleted: number;
  dailyTasksCompleted: number;
  refreshScores: () => Promise<void>;
};

const ScoreContext = createContext<ScoreContextType | undefined>(undefined);

export const ScoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [lifetimePoints, setLifetimePoints] = useState(0);
  const [monthlyTasksCompleted, setMonthlyTasksCompleted] = useState(0);
  const [dailyTasksCompleted, setDailyTasksCompleted] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshScores = useCallback(async () => {
    const [summary, monthly] = await Promise.all([
      apiGet<{ lifetimePoints: number }>('/api/v1/points/summary'),
      apiGet<{ completedTasks: number; progressPercentage: number }>(
        '/api/v1/digital-twin/monthly'
      ),
    ]);
    setLifetimePoints(summary.lifetimePoints);
    setMonthlyTasksCompleted(monthly.completedTasks);
    setDailyTasksCompleted(monthly.completedTasks % 6);
  }, []);

  useEffect(() => {
    refreshScores()
      .catch((error) => console.warn('Failed to load scores', error))
      .finally(() => setIsLoaded(true));
  }, [refreshScores]);

  if (!isLoaded) return null;

  return (
    <ScoreContext.Provider value={{ 
      lifetimePoints, 
      monthlyTasksCompleted, 
      dailyTasksCompleted,
      refreshScores
    }}>
      {children}
    </ScoreContext.Provider>
  );
};

export const useScore = () => {
  const context = useContext(ScoreContext);
  if (context === undefined) {
    throw new Error('useScore must be used within a ScoreProvider');
  }
  return context;
};
