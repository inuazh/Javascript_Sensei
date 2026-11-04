import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { afterActivity, leaveLeaderboard } from '../src/services/activity';
import { confirmAction, showNotice } from '../src/services/dialog';
import { requestNotificationPermission, syncReminders } from '../src/services/notifications';
import { DAILY_GOALS, useUserStore, type ReminderSettings } from '../src/stores/useUserStore';
import {
  BackButton,
  Card,
  Colors,
  Fonts,
  Label,
  OptionCard,
  Screen,
  Spacing,
  TimePicker,
  Type,
} from '../src/ui';

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
        trackColor={{ true: Colors.accent, false: Colors.borderStrong }}
        thumbColor={Colors.textPrimary}
        // react-native-web colours the "on" thumb separately (teal by default).
        {...(Platform.OS === 'web' ? { activeThumbColor: Colors.textPrimary } : null)}
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
      showNotice(
        'Уведомления выключены',
        'Разреши уведомления для JS Sensei в настройках телефона.',
      );
      return;
    }
    updateSettings({ reminder });
    syncReminders(reminder, useUserStore.getState().progress);
  };

  const confirmLeave = () =>
    confirmAction({
      title: 'Выйти из рейтинга?',
      message: 'Твоя запись и ник будут удалены из рейтинга.',
      confirmText: 'Выйти',
      onConfirm: async () => {
        if (!(await leaveLeaderboard())) {
          showNotice(
            'Запись не удалена',
            'Не удалось связаться с сервером. Напиши на jssensei.app@gmail.com, и мы удалим её вручную.',
          );
        }
      },
    });

  const confirmReset = () =>
    confirmAction({
      title: 'Сбросить прогресс?',
      message: 'Уроки, XP, стрик и достижения будут удалены. Это нельзя отменить.',
      confirmText: 'Сбросить',
      onConfirm: () => {
        resetProgress();
        afterActivity();
      },
    });

  return (
    <Screen edges={['top', 'bottom']}>
      <BackButton />
      <Text style={Type.h1}>Настройки</Text>

      <Label>цель дня</Label>
      {DAILY_GOALS.map(g => (
        <OptionCard
          key={g.xp}
          title={`${g.title} · ${g.xp} XP`}
          subtitle={g.subtitle}
          selected={settings.dailyGoalXp === g.xp}
          onPress={() => updateSettings({ dailyGoalXp: g.xp })}
        />
      ))}

      <Label>напоминания</Label>
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

      <Label>звук и вибрация</Label>
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

      <Label>рейтинг</Label>
      <Card style={styles.gap}>
        {settings.nickname ? (
          <>
            <Text style={Type.body}>Ник: {settings.nickname}</Text>
            <Pressable onPress={confirmLeave} accessibilityRole="button">
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
  gap: { gap: Spacing.md },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { fontFamily: Fonts.sans, fontSize: 15, color: Colors.textPrimary },
  link: { fontFamily: Fonts.sans, color: Colors.info, fontSize: 15 },
  danger: { fontFamily: Fonts.sansSemiBold, color: Colors.danger, fontSize: 15 },
  version: { textAlign: 'center' },
});
