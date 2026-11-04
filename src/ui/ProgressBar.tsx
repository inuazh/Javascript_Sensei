import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, type ViewStyle } from 'react-native';
import { Colors, Radius } from './theme';

interface ProgressBarProps {
  /** 0..1 */
  value: number;
  color?: string;
  height?: number;
  style?: ViewStyle;
}

export function ProgressBar({ value, color = Colors.accent, height = 6, style }: ProgressBarProps) {
  const anim = useRef(new Animated.Value(0)).current;
  const clamped = Math.max(0, Math.min(1, value));
  useEffect(() => {
    Animated.timing(anim, { toValue: clamped, duration: 450, useNativeDriver: false }).start();
  }, [anim, clamped]);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { height }, style]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: color,
            width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: Colors.border, borderRadius: Radius.sm, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.sm },
});
