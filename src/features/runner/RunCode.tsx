import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { runCode } from '../../services/codeRunner';
import {
  RUN_TIMEOUT_MS,
  describeError,
  runInContext,
  type RunResult,
} from '../../services/runnerHarness';
import { Colors, Fonts, Icon, Radius, Spacing } from '../../ui';

interface RunCodeProps {
  code: string;
  /** Earlier code blocks of the same theory card, in case this one builds on them. */
  earlier?: readonly string[];
}

/** «Запустить» button that runs `code` in the sandbox and shows its console output. */
export function RunCode({ code, earlier = [] }: RunCodeProps) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const run = async () => {
    setRunning(true);
    const next = await runInContext(runCode, code, earlier);
    if (!alive.current) return;
    setResult(next);
    setRunning(false);
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={run}
        disabled={running}
        accessibilityRole="button"
        accessibilityLabel="Запустить код"
        accessibilityState={{ busy: running, disabled: running }}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        {running ? (
          <ActivityIndicator size="small" color={Colors.textPrimary} />
        ) : (
          <Icon name="play" size={14} color={Colors.textPrimary} />
        )}
        <Text style={styles.buttonText}>{running ? 'Выполняется…' : 'Запустить'}</Text>
      </Pressable>
      {result ? <ConsoleOutput result={result} /> : null}
    </View>
  );
}

function ConsoleOutput({ result }: { result: RunResult }) {
  const { lines, error, timedOut, value } = result;
  const empty = lines.length === 0 && !error && !timedOut;
  return (
    <View style={styles.console} accessibilityLiveRegion="polite">
      <Text style={styles.header}>консоль</Text>
      {lines.map((line, i) => (
        <Text key={i} style={styles.line} selectable>
          <Text style={styles.prompt}>{'› '}</Text>
          {line}
        </Text>
      ))}
      {error ? (
        <Text style={[styles.line, styles.error]} selectable>
          {`› ${describeError(error)}`}
        </Text>
      ) : null}
      {timedOut ? (
        <Text style={styles.note}>
          {`Остановлено: код работал дольше ${RUN_TIMEOUT_MS / 1000} с`}
        </Text>
      ) : null}
      {empty && value !== undefined ? (
        <Text style={styles.line} selectable>
          <Text style={styles.prompt}>{'← '}</Text>
          {value}
        </Text>
      ) : null}
      {empty && value === undefined ? <Text style={styles.note}>Ничего не выведено</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm, alignItems: 'flex-start' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 36,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  pressed: { opacity: 0.7 },
  buttonText: { fontFamily: Fonts.sansSemiBold, fontSize: 14, color: Colors.textPrimary },
  console: {
    alignSelf: 'stretch',
    backgroundColor: Colors.codeBackground,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: 2,
  },
  header: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  line: { fontFamily: Fonts.mono, fontSize: 13, lineHeight: 20, color: Colors.syntax.text },
  prompt: { color: Colors.textMuted },
  error: { color: Colors.danger },
  note: { fontFamily: Fonts.mono, fontSize: 12, lineHeight: 20, color: Colors.textMuted },
});
