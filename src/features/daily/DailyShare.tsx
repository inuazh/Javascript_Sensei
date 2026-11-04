import { useState } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { dailyShareText, type DailyResults } from '../../domain/daily';
import type { DayKey } from '../../domain/dates';
import { shareText, type ShareResult } from '../../services/share';
import { Button, Colors, Fonts, Spacing } from '../../ui';

const STATUS: Partial<Record<ShareResult, string>> = {
  copied: 'скопировано, вставь в чат',
  failed: 'не получилось поделиться',
};

/** «Поделиться» for a finished daily challenge, with a note when text was copied. */
export function DailyShareButton({
  results,
  day,
  variant = 'primary',
  style,
}: {
  results: DailyResults;
  day: DayKey;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
}) {
  const [status, setStatus] = useState<ShareResult | null>(null);
  const [busy, setBusy] = useState(false);

  const share = async () => {
    setBusy(true);
    setStatus(await shareText(dailyShareText(results, day)));
    setBusy(false);
  };

  const note = status ? STATUS[status] : undefined;
  return (
    <View style={[styles.wrap, style]}>
      <Button
        title="поделиться"
        icon="share"
        variant={variant}
        loading={busy}
        onPress={share}
        accessibilityHint="отправить результат задачи дня без ответа"
      />
      {note ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.note, status === 'failed' && { color: Colors.warning }]}
        >
          {note}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  note: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
});
