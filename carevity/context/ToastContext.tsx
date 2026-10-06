import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextType {
  show: (title: string, message: string, type: ToastType, onHide?: () => void) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toastConfig, setToastConfig] = useState<{ title: string; message: string; type: ToastType } | null>(null);
  const slideAnim = useRef(new Animated.Value(-150)).current;
  const insets = useSafeAreaInsets();
  const onHideCallback = useRef<(() => void) | null>(null);

  const show = (title: string, message: string, type: ToastType, onHide?: () => void) => {
    // Stop any ongoing animation
    slideAnim.stopAnimation();
    
    setToastConfig({ title, message, type });
    if (onHide) onHideCallback.current = onHide;

    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue: insets.top > 0 ? insets.top + 10 : (Platform.OS === 'android' ? 40 : 50),
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.delay(3500),
      Animated.timing(slideAnim, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start((result) => {
      if (result.finished) {
        setToastConfig(null);
        if (onHideCallback.current) {
          onHideCallback.current();
          onHideCallback.current = null;
        }
      }
    });
  };

  const getBackgroundColor = (type: ToastType) => {
    switch (type) {
      case 'success': return '#10B981'; // Green
      case 'error': return '#EF4444'; // Red
      case 'info': return '#3B82F6'; // Blue
      default: return '#333';
    }
  };

  const getIconName = (type: ToastType) => {
    switch (type) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'alert-circle';
      case 'info': return 'information-circle';
      default: return 'ellipse';
    }
  };

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toastConfig && (
        <Animated.View style={[styles.toastContainer, { transform: [{ translateY: slideAnim }] }]} pointerEvents="none">
          <View style={[styles.toastBox, { borderLeftColor: getBackgroundColor(toastConfig.type) }]}>
            <Ionicons name={getIconName(toastConfig.type) as any} size={28} color={getBackgroundColor(toastConfig.type)} />
            <View style={styles.textContainer}>
              <Text style={styles.title}>{toastConfig.title}</Text>
              <Text style={styles.message}>{toastConfig.message}</Text>
            </View>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 99999, // Ensure it sits above all other modals and drawers
    alignItems: 'center',
  },
  toastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 18,
    borderRadius: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    borderLeftWidth: 6,
  },
  textContainer: {
    marginLeft: 15,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Outfit_700Bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    fontFamily: 'Outfit_400Regular',
    color: '#4B5563',
    lineHeight: 20,
  },
});
