import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { requestNotificationPermission, syncReminders } from '../src/services/notifications';
import { DAILY_GOALS, useUserStore, type ExperienceLevel } from '../src/stores/useUserStore';
import { Button, Colors, OptionCard, Screen, Spacing, TimePicker, Type } from '../src/ui';

const LEVELS: { id: ExperienceLevel; title: string; subtitle: string; icon: string }[] = [
  { id: 'beginner', title: 'Новичок', subtitle: 'Начинаю с нуля', icon: '🌱' },
  { id: 'intermediate', title: 'Знаю основы', subtitle: 'Писал немного кода', icon: '🚀' },
  {
    id: 'advanced',
    title: 'Есть опыт',
    subtitle: 'Хочу закрыть пробелы и подготовиться к собеседованию',
    icon: '🦾',
  },
];

const STEPS = 4;

export default function OnboardingScreen() {
  const updateSettings = useUserStore(s => s.updateSettings);
  const [step, setStep] = useState(0);
  const [experience, setExperience] = useState<ExperienceLevel>('beginner');
  const [goal, setGoal] = useState<number>(DAILY_GOALS[0].xp);
  const [time, setTime] = useState({ hour: 19, minute: 0 });

  const finish = async (withReminder: boolean) => {
    const enabled = withReminder && (await requestNotificationPermission());
    const reminder = { enabled, ...time };
    updateSettings({ onboarded: true, experience, dailyGoalXp: goal, reminder });
    syncReminders(reminder, useUserStore.getState().progress);
    router.replace(experience === 'beginner' ? '/(tabs)' : '/placement');
  };

  const dots = (
    <View style={styles.dots}>
      {Array.from({ length: STEPS }, (_, i) => (
        <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
      ))}
    </View>
  );

  const footer = (
    primary: { title: string; onPress: () => void },
    secondary?: { title: string; onPress: () => void },
  ) => (
    <View style={styles.footer}>
      <Button title={primary.title} onPress={primary.onPress} />
      {secondary ? (
        <Button title={secondary.title} variant="ghost" onPress={secondary.onPress} />
      ) : null}
    </View>
  );

  if (step === 0) {
    return (
      <Screen
        edges={['top', 'bottom']}
        contentStyle={styles.welcome}
        footer={footer({ title: 'Начать →', onPress: () => setStep(1) })}
      >
        <Text style={styles.logo}>⚡</Text>
        <Text style={[Type.h1, styles.center]}>JS Sensei</Text>
        <Text style={[Type.body, styles.center, styles.muted]}>
          JavaScript по 5 минут в день: короткая теория, практика на реальном коде и повторения,
          чтобы ничего не забылось.
        </Text>
      </Screen>
    );
  }

  if (step === 1) {
    return (
      <Screen
        edges={['top', 'bottom']}
        footer={footer({ title: 'Дальше', onPress: () => setStep(2) })}
      >
        {dots}
        <Text style={Type.h1}>Какой у тебя опыт?</Text>
        {LEVELS.map(l => (
          <OptionCard
            key={l.id}
            icon={l.icon}
            title={l.title}
            subtitle={l.subtitle}
            selected={experience === l.id}
            onPress={() => setExperience(l.id)}
          />
        ))}
      </Screen>
    );
  }

  if (step === 2) {
    return (
      <Screen
        edges={['top', 'bottom']}
        footer={footer({ title: 'Дальше', onPress: () => setStep(3) })}
      >
        {dots}
        <Text style={Type.h1}>Цель на день</Text>
        <Text style={[Type.small]}>Её можно поменять в настройках.</Text>
        {DAILY_GOALS.map(g => (
          <OptionCard
            key={g.xp}
            title={`${g.title} · ${g.xp} XP`}
            subtitle={g.subtitle}
            selected={goal === g.xp}
            onPress={() => setGoal(g.xp)}
          />
        ))}
      </Screen>
    );
  }

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={footer(
        { title: '🔔 Напоминать', onPress: () => finish(true) },
        { title: 'Не сейчас', onPress: () => finish(false) },
      )}
    >
      {dots}
      <Text style={Type.h1}>Когда напомнить?</Text>
      <Text style={Type.small}>
        Одно уведомление в день, и только если ты ещё не занимался. Привычка складывается из
        регулярности.
      </Text>
      <View style={styles.time}>
        <TimePicker hour={time.hour} minute={time.minute} onChange={setTime} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  welcome: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  logo: { fontSize: 80 },
  center: { textAlign: 'center' },
  muted: { color: Colors.textSecondary },
  dots: { flexDirection: 'row', gap: 6, marginBottom: Spacing.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)' },
  dotActive: { width: 24, backgroundColor: Colors.yellow },
  time: { marginTop: Spacing.xxl },
  footer: { padding: Spacing.xl, paddingTop: Spacing.md, gap: Spacing.xs },
});
