import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { Colors, Fonts, Radius, Spacing } from './theme';
import { pad2 } from '../utils/format';

const STEP_MINUTES = 30;
const TIME_SIZE = 54;
const BUTTON_SIZE = 48;
/** Advance width of a Doto character as a share of the font size. */
const CHAR_WIDTH = 0.62;

/** Simple stepper for a time of day in 30-minute steps. */
export function TimePicker({
  hour,
  minute,
  onChange,
}: {
  hour: number;
  minute: number;
  onChange: (t: { hour: number; minute: number }) => void;
}) {
  const shift = (delta: number) => {
    const total = (hour * 60 + minute + delta + 24 * 60) % (24 * 60);
    onChange({ hour: Math.floor(total / 60), minute: total % 60 });
  };
  const label = `${pad2(hour)}:${pad2(minute)}`;
  // «19:00» at full size is wider than a card on a 360px screen and broke onto two
  // lines; the size is fitted to the space between the buttons.
  const { fontScale } = useWindowDimensions();
  const [rowWidth, setRowWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setRowWidth(e.nativeEvent.layout.width);
  const room = rowWidth - 2 * BUTTON_SIZE - 2 * Spacing.xl;
  const size =
    rowWidth > 0
      ? Math.max(
          16,
          Math.min(TIME_SIZE, Math.floor(room / (label.length * CHAR_WIDTH * fontScale))),
        )
      : TIME_SIZE;
  return (
    <View style={styles.row} onLayout={onLayout}>
      <Pressable
        style={styles.btn}
        onPress={() => shift(-STEP_MINUTES)}
        accessibilityRole="button"
        accessibilityLabel="раньше"
      >
        <Text style={styles.btnText}>−</Text>
      </Pressable>
      <Text
        style={[styles.time, { fontSize: size, lineHeight: Math.round(size * 1.1) }]}
        numberOfLines={1}
        accessibilityLabel={`время ${label}`}
      >
        {label}
      </Text>
      <Pressable
        style={styles.btn}
        onPress={() => shift(STEP_MINUTES)}
        accessibilityRole="button"
        accessibilityLabel="позже"
      >
        <Text style={styles.btnText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xl },
  btn: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontFamily: Fonts.monoBold, fontSize: 22, color: Colors.textPrimary },
  time: {
    fontFamily: Fonts.display,
    fontSize: TIME_SIZE,
    lineHeight: 60,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
});
