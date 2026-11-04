import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts, Radius, Spacing } from './theme';
import { pad2 } from '../utils/format';

const STEP_MINUTES = 30;

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
  return (
    <View style={styles.row}>
      <Pressable
        style={styles.btn}
        onPress={() => shift(-STEP_MINUTES)}
        accessibilityRole="button"
        accessibilityLabel="Раньше"
      >
        <Text style={styles.btnText}>−</Text>
      </Pressable>
      <Text style={styles.time} accessibilityLabel={`Время ${label}`}>
        {label}
      </Text>
      <Pressable
        style={styles.btn}
        onPress={() => shift(STEP_MINUTES)}
        accessibilityRole="button"
        accessibilityLabel="Позже"
      >
        <Text style={styles.btnText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xl },
  btn: {
    width: 48,
    height: 48,
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
    fontSize: 54,
    lineHeight: 60,
    color: Colors.textPrimary,
    minWidth: 120,
    textAlign: 'center',
  },
});
