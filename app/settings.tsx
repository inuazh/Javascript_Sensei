import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { requestNotificationPermission, syncReminders } from '../src/services/notifications';
import { DAILY_GOALS, useUserStore, type ReminderSettings } from '../src/stores/useUserStore';
import { Card, Colors, OptionCard, Screen, Spacing, TimePicker, Type } from '../src/ui';

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggle}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: Colors.yellow, false: 'rgba(255,255,255,0.15)' }}
        thumbColor={Colors.textPrimary}
        accessibilityLabel={label}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const settings = useUserStore(s => s.settings);
  const updateSettings = useUserStore(s => s.updateSettings);
  const resetProgress = useUserStore(s => s.resetProgress);

  const setReminder = async (patch: Partial<ReminderSettings>) => {
    const reminder = { ...settings.reminder, ...patch };
    if (patch.enabled && !(await requestNotificationPermission())) {
      Alert.alert(
        'Уведомления выключены',
        'Разреши уведомления для JS Sensei в настройках телефона.',
      );
      return;
    }
    updateSettings({ reminder });
    syncReminders(reminder, useUserStore.getState().progress);
  };

  const leaveLeaderboard = () =>
    Alert.alert('Выйти из рейтинга?', 'Твой ник перестанет обновляться в рейтинге.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => updateSettings({ nickname: null }) },
    ]);

  const confirmReset = () =>
    Alert.alert(
      'Сбросить прогресс?',
      'Уроки, XP, стрик и достижения будут удалены. Это нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Сбросить', style: 'destructive', onPress: resetProgress },
      ],
    );

  return (
    <Screen edges={['top', 'bottom']}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Назад"
      >
        <Text style={styles.back}>←</Text>
      </Pressable>
      <Text style={Type.h1}>Настройки</Text>

      <Text style={Type.caption}>Цель дня</Text>
      {DAILY_GOALS.map(g => (
        <OptionCard
          key={g.xp}
          title={`${g.title} · ${g.xp} XP`}
          subtitle={g.subtitle}
          selected={settings.dailyGoalXp === g.xp}
          onPress={() => updateSettings({ dailyGoalXp: g.xp })}
        />
      ))}

      <Text style={Type.caption}>Напоминания</Text>
      <Card style={styles.gap}>
        <ToggleRow
          label="Напоминать заниматься"
          value={settings.reminder.enabled}
          onChange={enabled => setReminder({ enabled })}
        />
        {settings.reminder.enabled && (
          <>
            <TimePicker
              hour={settings.reminder.hour}
              minute={settings.reminder.minute}
              onChange={t => setReminder(t)}
            />
            <Text style={Type.small}>Если ты уже позанимался сегодня, напоминание не придёт.</Text>
          </>
        )}
      </Card>

      <Text style={Type.caption}>Обратная связь</Text>
      <Card style={styles.gap}>
        <ToggleRow
          label="Звуки"
          value={settings.soundEnabled}
          onChange={v => updateSettings({ soundEnabled: v })}
        />
        <ToggleRow
          label="Вибрация"
          value={settings.hapticsEnabled}
          onChange={v => updateSettings({ hapticsEnabled: v })}
        />
      </Card>

      <Text style={Type.caption}>Рейтинг</Text>
      <Card style={styles.gap}>
        {settings.nickname ? (
          <>
            <Text style={Type.body}>Ник: {settings.nickname}</Text>
            <Pressable onPress={leaveLeaderboard} accessibilityRole="button">
              <Text style={styles.danger}>Выйти из рейтинга</Text>
            </Pressable>
          </>
        ) : (
          <Text style={Type.small}>
            Ты не участвуешь в рейтинге. Присоединиться можно на вкладке «Рейтинг».
          </Text>
        )}
      </Card>

      <Card style={styles.gap}>
        <Pressable onPress={() => router.push('/privacy-policy')} accessibilityRole="link">
          <Text style={styles.link}>Политика конфиденциальности</Text>
        </Pressable>
        <Pressable onPress={confirmReset} accessibilityRole="button">
          <Text style={styles.danger}>Сбросить прогресс</Text>
        </Pressable>
      </Card>
      <Text style={[Type.small, styles.version]}>
        JS Sensei {Constants.expoConfig?.version ?? ''}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { fontSize: 24, color: Colors.textSecondary },
  gap: { gap: Spacing.md },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { fontSize: 15, color: Colors.textPrimary },
  link: { color: Colors.blue, fontSize: 15 },
  danger: { color: Colors.danger, fontSize: 15, fontWeight: '600' },
  version: { textAlign: 'center' },
});
