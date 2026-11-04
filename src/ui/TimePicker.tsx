import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts, Radius, Spacing } from './theme';

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
  const label = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
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
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontSize: 24, color: Colors.textPrimary, fontWeight: '700' },
  time: {
    fontFamily: Fonts.mono,
    fontSize: 36,
    fontWeight: '800',
    color: Colors.yellow,
    minWidth: 120,
    textAlign: 'center',
  },
});
