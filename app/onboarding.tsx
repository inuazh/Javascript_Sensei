import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useUserStore } from '../src/stores/useUserStore';
import { Colors, Spacing, Radius } from '../src/constants/theme';

type OnboardingStep = 0 | 1 | 2 | 3;

interface LevelOption {
  id: string;
  title: string;
  subtitle: string;
}

interface GoalOption {
  id: string;
  title: string;
  subtitle: string;
  minutes: number;
}

const LEVEL_OPTIONS: LevelOption[] = [
  { id: 'beginner', title: 'Новичок', subtitle: 'С нуля' },
  { id: 'intermediate', title: 'Знаю основы', subtitle: 'Немного практики' },
  { id: 'advanced', title: 'Есть опыт', subtitle: 'Хочу систематизировать' },
];

const GOAL_OPTIONS: GoalOption[] = [
  { id: '5min', title: '5 минут', subtitle: 'Быстрый старт', minutes: 5 },
  { id: '10min', title: '10 минут', subtitle: 'Оптимально', minutes: 10 },
  { id: '15min', title: '15 минут', subtitle: 'Интенсивно', minutes: 15 },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState<OnboardingStep>(0);
  const [selectedLevel, setSelectedLevel] = useState<string>('beginner');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const { setOnboarded } = useUserStore();

  const handleFinish = async (requestNotifications: boolean) => {
    if (requestNotifications) {
      await Notifications.requestPermissionsAsync();
    }
    const goal = GOAL_OPTIONS.find((g) => g.id === selectedGoal);
    setOnboarded(goal?.minutes ?? 5, selectedLevel);
    router.replace('/(tabs)');
  };

  const canProceed = () => {
    if (step === 2) return selectedGoal !== null;
    return true;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Step 0: Welcome */}
        {step === 0 && (
          <View style={styles.stepContainer}>
            <View style={styles.welcomeIcon}>
              <Text style={styles.icon}>⚡</Text>
            </View>
            <Text style={styles.title}>JS Sensei</Text>
            <Text style={styles.subtitle}>Учи JavaScript за 5 минут в день</Text>
            <Pressable style={styles.button} onPress={() => setStep(1)}>
              <Text style={styles.buttonText}>Начать →</Text>
            </Pressable>
          </View>
        )}

        {/* Step 1: Choose Level */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Выбери свой уровень</Text>
            <View style={styles.optionsContainer}>
              {LEVEL_OPTIONS.map((option) => (
                <Pressable
                  key={option.id}
                  style={[
                    styles.optionCard,
                    selectedLevel === option.id && styles.optionCardSelected,
                  ]}
                  onPress={() => setSelectedLevel(option.id)}
                >
                  <Text style={[styles.optionTitle, selectedLevel === option.id && styles.optionTextSelected]}>
                    {option.title}
                  </Text>
                  <Text style={[styles.optionSubtitle, selectedLevel === option.id && styles.optionTextSelected]}>
                    {option.subtitle}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.navigation}>
              <Pressable onPress={() => setStep(0)}>
                <Text style={styles.backButton}>← Назад</Text>
              </Pressable>
              <Pressable style={styles.button} onPress={() => setStep(2)}>
                <Text style={styles.buttonText}>Далее →</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Step 2: Daily Goal */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Сколько времени в день?</Text>
            <View style={styles.optionsContainer}>
              {GOAL_OPTIONS.map((option) => (
                <Pressable
                  key={option.id}
                  style={[
                    styles.optionCard,
                    selectedGoal === option.id && styles.optionCardSelected,
                  ]}
                  onPress={() => setSelectedGoal(option.id)}
                >
                  <Text style={[styles.optionTitle, selectedGoal === option.id && styles.optionTextSelected]}>
                    {option.title}
                  </Text>
                  <Text style={[styles.optionSubtitle, selectedGoal === option.id && styles.optionTextSelected]}>
                    {option.subtitle}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.navigation}>
              <Pressable onPress={() => setStep(1)}>
                <Text style={styles.backButton}>← Назад</Text>
              </Pressable>
              <Pressable
                style={[styles.button, !canProceed() && styles.buttonDisabled]}
                onPress={() => setStep(3)}
                disabled={!canProceed()}
              >
                <Text style={styles.buttonText}>Далее →</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Step 3: Notifications */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <View style={styles.welcomeIcon}>
              <Text style={styles.icon}>🔔</Text>
            </View>
            <Text style={styles.stepTitle}>Не пропускай занятия</Text>
            <Text style={styles.stepSubtitle}>
              Включи уведомления — мы напомним тебе учиться каждый день и поможем сохранить стрик
            </Text>
            <Pressable style={styles.button} onPress={() => handleFinish(true)}>
              <Text style={styles.buttonText}>Включить уведомления</Text>
            </Pressable>
            <Pressable style={styles.skipButton} onPress={() => handleFinish(false)}>
              <Text style={styles.skipButtonText}>Пропустить</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Dots Indicator */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.dot, step === i && styles.dotActive]} />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  stepContainer: {
    alignItems: 'center',
  },
  welcomeIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.yellowBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxl,
    textAlign: 'center',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: Spacing.xxl,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxl,
    textAlign: 'center',
    lineHeight: 22,
  },
  optionsContainer: {
    width: '100%',
    gap: Spacing.lg,
    marginBottom: Spacing.xxxl,
  },
  optionCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionCardSelected: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  optionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },
  button: {
    backgroundColor: Colors.yellow,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radius.lg,
    alignItems: 'center',
    minWidth: 200,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  skipButton: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  skipButtonText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
  navigation: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  backButton: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    backgroundColor: Colors.yellow,
    width: 24,
  },
});
