import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Defs, ClipPath, Rect } from 'react-native-svg';
import Animated, { 
  useSharedValue, 
  useAnimatedProps, 
  withSpring, 
  withTiming 
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface LiquidTwinProps {
  percentage: number; // 0 to 100
  color: string;
}

export default function LiquidTwin({ percentage, color }: LiquidTwinProps) {
  const fillHeight = useSharedValue(0);

  useEffect(() => {
    // 200 is the full height of the SVG viewport
    const targetHeight = (Math.max(0, Math.min(percentage, 100)) / 100) * 200;
    fillHeight.value = withSpring(targetHeight, { damping: 15, stiffness: 90 });
  }, [percentage]);

  const animatedProps = useAnimatedProps(() => {
    return {
      // The Y coordinate starts from the top. To fill from bottom up:
      y: 200 - fillHeight.value,
      height: fillHeight.value,
    };
  });

  // Abstract humanoid silhouette path
  const humanPath = "M50 15 C60 15 68 23 68 33 C68 43 60 51 50 51 C40 51 32 43 32 33 C32 23 40 15 50 15 Z M25 60 C15 60 12 68 15 75 L28 135 C29 140 36 138 35 133 L30 85 L35 85 L35 185 C35 195 48 195 48 185 L48 120 L52 120 L52 185 C52 195 65 195 65 185 L65 85 L70 85 L65 133 C64 138 71 140 72 135 L85 75 C88 68 85 60 75 60 L25 60 Z";

  return (
    <View style={styles.container}>
      <Svg height="200" width="100" viewBox="0 0 100 200">
        <Defs>
          <ClipPath id="humanClip">
            <Path d={humanPath} />
          </ClipPath>
        </Defs>

        {/* The outline stroke of the human figure */}
        <Path 
          d={humanPath} 
          fill="rgba(0,0,0,0.05)" 
          stroke={color} 
          strokeWidth="2" 
        />

        {/* The liquid fill, clipped to the human outline */}
        <AnimatedRect
          x="0"
          width="100"
          fill={color}
          clipPath="url(#humanClip)"
          animatedProps={animatedProps}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  }
});
