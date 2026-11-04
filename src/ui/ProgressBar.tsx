import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import { Colors } from './theme';

interface ProgressBarProps {
  /** 0..1 */
  value: number;
  color?: string;
  /** Dot diameter. */
  height?: number;
  style?: ViewStyle;
}

/** Dotted progress: a row of dots filling left to right. */
export function ProgressBar({
  value,
  color = Colors.textPrimary,
  height = 6,
  style,
}: ProgressBarProps) {
  const [width, setWidth] = useState(0);
  const clamped = Math.max(0, Math.min(1, value));
  const gap = Math.max(3, Math.round(height * 0.6));
  const count = width > 0 ? Math.max(1, Math.floor((width + gap) / (height + gap))) : 0;
  const filled = Math.round(clamped * count);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  return (
    <View
      onLayout={onLayout}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.row, { height, gap }, style]}
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            width: height,
            height,
            borderRadius: height / 2,
            backgroundColor: i < filled ? color : Colors.dotOff,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', overflow: 'hidden' } });
