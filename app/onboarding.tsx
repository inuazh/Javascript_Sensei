import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { getLevelPlacement } from '../src/content/repository';
import { PLACEMENT_MINUTES } from '../src/domain/placement';
import { requestNotificationPermission, syncReminders } from '../src/services/notifications';
import { DAILY_GOALS, useUserStore, type ExperienceLevel } from '../src/stores/useUserStore';
import {
  Button,
  Colors,
  Fonts,
  type IconName,
  Logo,
  OptionCard,
  Screen,
  Spacing,
  TimePicker,
  Type,
} from '../src/ui';

type Choice = ExperienceLevel | 'test';

const startsWith = (level: ExperienceLevel) => {
  const title = getLevelPlacement(level).startSection?.title;
  return title ? `начнёшь с раздела «${title}»` : '';
};

const CHOICES: { id: Choice; title: string; subtitle: string; icon: IconName }[] = [
  { id: 'beginner', title: 'новичок', subtitle: 'начинаю с нуля', icon: 'sprout' },
  {
    id: 'intermediate',
    title: 'знаю основы',
    subtitle: startsWith('intermediate'),
    icon: 'rocket',
  },
  { id: 'advanced', title: 'есть опыт', subtitle: startsWith('advanced'), icon: 'cpu' },
  {
    id: 'test',
    title: 'не уверен',
    subtitle: `пройти тест на ${PLACEMENT_MINUTES}\u00a0минут`,
    icon: 'compass',
  },
];

const STEPS = 4;

export default function OnboardingScreen() {
  const updateSettings = useUserStore(s => s.updateSettings);
  const applyPlacement = useUserStore(s => s.applyPlacement);
  const [step, setStep] = useState(0);
  const [choice, setChoice] = useState<Choice>('beginner');
  const [goal, setGoal] = useState<number>(DAILY_GOALS[0].xp);
  const [time, setTime] = useState({ hour: 19, minute: 0 });

  // Android back returns to the previous step instead of closing the app.
  useEffect(() => {
    if (step === 0) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setStep(s => s - 1);
      return true;
    });
    return () => sub.remove();
  }, [step]);

  const finish = async (withReminder: boolean) => {
    const enabled = withReminder && (await requestNotificationPermission());
    const reminder = { enabled, ...time };
    // Someone unsure of their level takes the test; the level only matters until then.
    const experience: ExperienceLevel = choice === 'test' ? 'intermediate' : choice;
    updateSettings({ onboarded: true, experience, dailyGoalXp: goal, reminder });
    if (choice === 'test') {
      syncReminders(reminder, useUserStore.getState().progress);
      router.replace({ pathname: '/placement', params: { start: '1' } });
      return;
    }
    const { lessonIds } = getLevelPlacement(choice);
    if (lessonIds.length > 0) applyPlacement(lessonIds);
    syncReminders(reminder, useUserStore.getState().progress);
    router.replace('/(tabs)');
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
        footer={footer({ title: 'начать', onPress: () => setStep(1) })}
      >
        <Logo size={44} />
        <Text style={styles.prompt}>
          <Text style={styles.promptSign}>$ </Text>node learn.js
        </Text>
        <Text style={[Type.body, styles.muted]}>
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
        footer={footer({ title: 'дальше', onPress: () => setStep(2) })}
      >
        {dots}
        <Text style={Type.h1}>какой у тебя опыт?</Text>
        {CHOICES.map(c => (
          <OptionCard
            key={c.id}
            icon={c.icon}
            title={c.title}
            subtitle={c.subtitle}
            selected={choice === c.id}
            onPress={() => setChoice(c.id)}
          />
        ))}
        <Text style={Type.small}>пропущенные разделы можно пройти в любой момент.</Text>
      </Screen>
    );
  }

  if (step === 2) {
    return (
      <Screen
        edges={['top', 'bottom']}
        footer={footer({ title: 'дальше', onPress: () => setStep(3) })}
      >
        {dots}
        <Text style={Type.h1}>цель на день</Text>
        <Text style={[Type.small]}>её можно поменять в настройках.</Text>
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
        { title: 'напоминать', onPress: () => finish(true) },
        { title: 'не сейчас', onPress: () => finish(false) },
      )}
    >
      {dots}
      <Text style={Type.h1}>когда напомнить?</Text>
      <Text style={Type.small}>
        одно уведомление в день, и только если ты ещё не занимался. привычка складывается из
        регулярности.
      </Text>
      <View style={styles.time}>
        <TimePicker hour={time.hour} minute={time.minute} onChange={setTime} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  welcome: { flexGrow: 1, justifyContent: 'center' },
  center: { textAlign: 'center' },
  muted: { color: Colors.textSecondary },
  prompt: {
    fontFamily: Fonts.mono,
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: Spacing.xl,
  },
  promptSign: { color: Colors.accent },
  dots: { flexDirection: 'row', gap: 6, marginBottom: Spacing.md },
  dot: { width: 8, height: 4, borderRadius: 2, backgroundColor: Colors.border },
  dotActive: { width: 24, height: 4, backgroundColor: Colors.accent },
  time: { marginTop: Spacing.xxl },
  footer: { padding: Spacing.xl, paddingTop: Spacing.md, gap: Spacing.xs },
});
