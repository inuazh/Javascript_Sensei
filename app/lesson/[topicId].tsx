import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useContentStore } from '../../src/stores/useContentStore';
import { useUserStore } from '../../src/stores/useUserStore';
import { ACHIEVEMENTS } from '../../src/constants/gamification';
import { saveLessonResult } from '../../src/db/database';
import type { Lesson, Question } from '../../src/stores/useContentStore';

const XP_PER_QUESTION = 15;

// Map topicId → sectionId for content loading
const TOPIC_SECTION_MAP: Record<string, string> = {
  variables: 'basics',
  'data-types': 'basics',
  operators: 'basics',
  conditions: 'control',
  loops: 'control',
  functions: 'control',
  arrays: 'collections',
  objects: 'collections',
  'set-map': 'collections',
};

// ─── Achievement Toast ───────────────────────────────────────────────────────

function AchievementToast({ achievementId, onHide }: { achievementId: string; onHide: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(onHide);
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  if (!achievement) return null;

  const icons: Record<string, string> = {
    first_lesson: '🌅', streak_7: '🔥', streak_30: '💥', perfect_lesson: '💯',
    all_stars: '⭐', junior_dev: '🧠', middle_dev: '📚', senior_dev: '🚀',
    js_sensei: '⚡', section_master: '👑', speed_demon: '💨', night_owl: '🌙',
  };

  return (
    <Animated.View style={[styles.achievementToast, { opacity, transform: [{ translateY }] }]}>
      <Text style={styles.toastIcon}>{icons[achievementId] || '🏆'}</Text>
      <View style={styles.toastText}>
        <Text style={styles.toastLabel}>Достижение разблокировано!</Text>
        <Text style={styles.toastTitle}>{achievement.title}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Option Button ────────────────────────────────────────────────────────────

interface OptionButtonProps {
  label: string;
  index: number;
  selected: boolean;
  correct: boolean;
  revealed: boolean;
  onPress: () => void;
}

function OptionButton({ label, index, selected, correct, revealed, onPress }: OptionButtonProps) {
  const isCorrect = revealed && correct;
  const isWrong = revealed && selected && !correct;

  return (
    <Pressable
      onPress={onPress}
      disabled={revealed}
      style={[
        styles.optionButton,
        selected && !revealed && styles.optionButtonSelected,
        isCorrect && styles.optionButtonCorrect,
        isWrong && styles.optionButtonWrong,
      ]}
    >
      <Text
        style={[
          styles.optionLabel,
          selected && !revealed && styles.optionLabelSelected,
          isCorrect && styles.optionLabelCorrect,
          isWrong && styles.optionLabelWrong,
        ]}
      >
        {isCorrect ? '✓' : isWrong ? '✗' : String.fromCharCode(65 + index)}
      </Text>
      <Text
        style={[
          styles.optionText,
          selected && !revealed && styles.optionTextSelected,
          isCorrect && styles.optionTextCorrect,
          isWrong && styles.optionTextWrong,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Order Question ───────────────────────────────────────────────────────────

interface OrderQuestionProps {
  question: Question;
  onComplete: (isCorrect: boolean) => void;
}

function OrderQuestion({ question, onComplete }: OrderQuestionProps) {
  const [items, setItems] = useState(
    question.shuffled!.map((i) => ({ id: i, text: question.lines![i] }))
  );
  const [dragging, setDragging] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [correct, setCorrect] = useState(false);

  const handleSwap = (fromIdx: number) => {
    if (isRevealed) return;
    if (dragging === null) {
      setDragging(fromIdx);
    } else {
      const next = [...items];
      [next[dragging], next[fromIdx]] = [next[fromIdx], next[dragging]];
      setItems(next);
      setDragging(null);
    }
  };

  const check = () => {
    const isCorrect = items.every((item, idx) => item.id === idx);
    setCorrect(isCorrect);
    setIsRevealed(true);
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setTimeout(() => onComplete(isCorrect), 1200);
  };

  return (
    <View style={styles.answerArea}>
      <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginBottom: 8 }}>
        {dragging !== null ? '👆 Нажми куда переставить' : '👆 Нажми строку чтобы выбрать'}
      </Text>
      {items.map((item, idx) => (
        <Pressable
          key={item.id}
          onPress={() => handleSwap(idx)}
          disabled={isRevealed}
          style={[
            styles.orderLine,
            dragging === idx && styles.orderLineDragging,
            isRevealed && item.id === idx && styles.orderLineCorrect,
            isRevealed && item.id !== idx && styles.orderLineWrong,
          ]}
        >
          <Text style={styles.orderLineIndex}>{idx + 1}</Text>
          <Text style={[styles.orderLineText, dragging === idx && styles.orderLineTextDragging]}>
            {item.text}
          </Text>
        </Pressable>
      ))}
      {!isRevealed && (
        <Pressable style={[styles.checkButton, styles.checkButtonActive]} onPress={check}>
          <Text style={[styles.checkButtonText, styles.checkButtonTextActive]}>Проверить</Text>
        </Pressable>
      )}
      {isRevealed && (
        <View style={[styles.feedbackPanel, correct ? styles.feedbackPanelCorrect : styles.feedbackPanelWrong]}>
          <Text style={[styles.feedbackText, correct ? styles.feedbackTextCorrect : styles.feedbackTextWrong]}>
            {correct ? `🎉 Верно! +${XP_PER_QUESTION} XP` : 'Неверный порядок. Смотри правильный выше ↑'}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Result Screen ────────────────────────────────────────────────────────────

interface ResultScreenProps {
  score: number;
  total: number;
  xp: number;
  newAchievements: string[];
  onComplete: () => void;
}

function ResultScreen({ score, total, xp, newAchievements, onComplete }: ResultScreenProps) {
  const percentage = Math.round((score / total) * 100);
  const stars = percentage === 100 ? 3 : percentage >= 60 ? 2 : 1;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const [toastQueue, setToastQueue] = useState<string[]>(newAchievements);

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 60,
      friction: 7,
      useNativeDriver: true,
    }).start();
    if (percentage === 100) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  const getTrophy = () => {
    if (percentage === 100) return '🏆';
    if (percentage >= 60) return '🎯';
    return '📚';
  };

  const getTitle = () => {
    if (percentage === 100) return 'Идеально!';
    if (percentage >= 60) return 'Хорошо!';
    return 'Попробуй ещё';
  };

  return (
    <View style={styles.resultScreen}>
      {/* Achievement toasts */}
      {toastQueue.length > 0 && (
        <AchievementToast
          achievementId={toastQueue[0]}
          onHide={() => setToastQueue(q => q.slice(1))}
        />
      )}

      <Animated.Text style={[styles.resultTrophy, { transform: [{ scale: scaleAnim }] }]}>
        {getTrophy()}
      </Animated.Text>
      <Text style={styles.resultTitle}>{getTitle()}</Text>

      <View style={styles.starsContainer}>
        {[0, 1, 2].map((i) => (
          <Text key={i} style={[styles.star, { opacity: i < stars ? 1 : 0.2 }]}>⭐</Text>
        ))}
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{xp}</Text>
          <Text style={styles.statLabel}>XP</Text>
        </View>
        <View style={styles.resultDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{score}/{total}</Text>
          <Text style={styles.statLabel}>Верно</Text>
        </View>
      </View>

      <Pressable style={styles.resultButton} onPress={onComplete}>
        <Text style={styles.resultButtonText}>Завершить</Text>
      </Pressable>
    </View>
  );
}

// ─── Main Lesson Screen ───────────────────────────────────────────────────────

export default function LessonScreen() {
  const router = useRouter();
  const { topicId, isChallenge } = useLocalSearchParams<{ topicId: string; isChallenge?: string }>();

  const contentStore = useContentStore();
  const userStore = useUserStore();

  const [loading, setLoading] = useState(true);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [finished, setFinished] = useState(false);
  const [startTime] = useState(Date.now());
  const [fadeKey, setFadeKey] = useState(0);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);

  // Load content on mount
  useEffect(() => {
    const load = async () => {
      if (!topicId) return;
      const sectionId = TOPIC_SECTION_MAP[topicId];
      if (sectionId) {
        await contentStore.loadLessonsForSection(sectionId);
      }
      setLoading(false);
    };
    load();
  }, [topicId]);

  const lessons = contentStore.getLessonsForTopic(topicId || '');

  // Find first incomplete lesson
  useEffect(() => {
    if (lessons.length === 0) return;
    const userProgress = userStore.topicsProgress[topicId || ''];
    if (!userProgress) {
      setCurrentLessonIndex(0);
      return;
    }
    const firstIncompleteIdx = lessons.findIndex(
      (l) => !userProgress.completedLessons.includes(l.id)
    );
    setCurrentLessonIndex(firstIncompleteIdx >= 0 ? firstIncompleteIdx : 0);
  }, [lessons.length, topicId]);

  if (loading || !topicId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Загрузка...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!lessons.length) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
          <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 12 }}>
            Уроки для этой темы не найдены
          </Text>
          <Pressable style={styles.resultButton} onPress={() => router.back()}>
            <Text style={styles.resultButtonText}>Назад</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const currentLesson = lessons[currentLessonIndex];
  const currentQuestion = currentLesson?.questions[currentQuestionIndex];

  if (!currentLesson || !currentQuestion) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Загрузка урока...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalQuestions = currentLesson.questions.length;

  const handleSelect = (idx: number) => {
    if (revealed) return;
    setSelected(idx);
    Haptics.selectionAsync();
  };

  const handleCheck = () => {
    if (selected === null) return;
    setRevealed(true);
    const isCorrect = selected === currentQuestion.correct;
    if (isCorrect) {
      setScore((s) => s + 1);
      setXpEarned((x) => x + XP_PER_QUESTION);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setTimeout(() => advance(), 1300);
  };

  const advance = () => {
    if (currentQuestionIndex + 1 >= totalQuestions) {
      setFinished(true);
    } else {
      setCurrentQuestionIndex((i) => i + 1);
      setSelected(null);
      setRevealed(false);
      setFadeKey((k) => k + 1);
    }
  };

  const handleOrderComplete = (isCorrect: boolean) => {
    if (isCorrect) {
      setScore((s) => s + 1);
      setXpEarned((x) => x + XP_PER_QUESTION);
    }
    setTimeout(() => advance(), 400);
  };

  const handleResultComplete = () => {
    const timeSec = Math.floor((Date.now() - startTime) / 1000);

    // Save to SQLite
    try {
      saveLessonResult({
        lessonId: currentLesson.id,
        topicId: topicId!,
        completedAt: new Date().toISOString(),
        stars: score === totalQuestions ? 3 : totalQuestions - score === 1 ? 2 : 1,
        correctAnswers: score,
        totalQuestions,
        timeSpentSec: timeSec,
        xpEarned,
      });
    } catch (e) {
      // SQLite save failed — non-critical, proceed
    }

    // Save to Zustand + check achievements
    const unlocked = userStore.completeLesson(
      currentLesson.id,
      topicId!,
      score,
      totalQuestions,
      timeSec
    );

    // If daily challenge, award bonus XP
    if (isChallenge === 'true') {
      userStore.completeDailyChallenge();
    }

    if (unlocked.length > 0) {
      setNewAchievements(unlocked);
      return; // stay on result screen briefly to show toasts
    }

    router.back();
  };

  const progressPercentage = finished
    ? 100
    : Math.round((currentQuestionIndex / totalQuestions) * 100);
  const currentXp = userStore.userProgress.totalXp + xpEarned;

  if (finished) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1 }}>
          <View style={styles.contentContainer}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>←</Text>
            </Pressable>
          </View>
          <ResultScreen
            score={score}
            total={totalQuestions}
            xp={xpEarned}
            newAchievements={newAchievements}
            onComplete={handleResultComplete}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const renderCodeBlock = () => {
    if (currentQuestion.type === 'fill') {
      return (
        <View style={styles.codeBlock}>
          <Text style={styles.codeLabel}>JS</Text>
          <Text style={styles.codeText}>
            <Text style={styles.codeHighlight}>{currentQuestion.codeBefore}</Text>
            <Text style={styles.codeGap}>???</Text>
            <Text style={styles.codeHighlight}>{currentQuestion.codeAfter}</Text>
          </Text>
        </View>
      );
    }
    if (currentQuestion.code) {
      return (
        <View style={styles.codeBlock}>
          <Text style={styles.codeLabel}>JS</Text>
          <Text style={styles.codeText}>{currentQuestion.code}</Text>
        </View>
      );
    }
    return null;
  };

  const renderAnswerArea = () => {
    if (currentQuestion.type === 'order') {
      return (
        <OrderQuestion
          key={`order-${currentQuestionIndex}`}
          question={currentQuestion}
          onComplete={handleOrderComplete}
        />
      );
    }

    if (currentQuestion.type === 'trueFalse') {
      return (
        <View style={styles.answerArea}>
          <View style={styles.trueFalseContainer}>
            {currentQuestion.options!.map((option, idx) => {
              const isSelected = selected === idx;
              const isCorrect = idx === currentQuestion.correct;
              const isWrong = isSelected && !isCorrect && revealed;
              const correctRevealed = isCorrect && revealed;

              return (
                <Pressable
                  key={idx}
                  onPress={() => handleSelect(idx)}
                  disabled={revealed}
                  style={[
                    styles.trueFalseButton,
                    isSelected && !revealed && styles.trueFalseButtonSelected,
                    correctRevealed && styles.trueFalseButtonCorrect,
                    isWrong && styles.trueFalseButtonWrong,
                  ]}
                >
                  <Text
                    style={[
                      styles.trueFalseText,
                      isSelected && !revealed && styles.trueFalseTextSelected,
                      correctRevealed && styles.trueFalseTextCorrect,
                      isWrong && styles.trueFalseTextWrong,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {revealed && (
            <View style={[styles.feedbackPanel, selected === currentQuestion.correct ? styles.feedbackPanelCorrect : styles.feedbackPanelWrong]}>
              <Text style={[styles.feedbackText, selected === currentQuestion.correct ? styles.feedbackTextCorrect : styles.feedbackTextWrong]}>
                {selected === currentQuestion.correct
                  ? `🎉 Верно! +${XP_PER_QUESTION} XP`
                  : `Неверно. Правильный ответ: ${currentQuestion.options![currentQuestion.correct!]}`}
              </Text>
              {currentQuestion.explanation && (
                <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
              )}
            </View>
          )}

          {!revealed && (
            <Pressable
              style={[styles.checkButton, selected !== null ? styles.checkButtonActive : styles.checkButtonDisabled]}
              onPress={handleCheck}
              disabled={selected === null}
            >
              <Text style={[styles.checkButtonText, selected !== null ? styles.checkButtonTextActive : styles.checkButtonTextDisabled]}>
                Проверить
              </Text>
            </Pressable>
          )}
        </View>
      );
    }

    // output or fill
    return (
      <View style={styles.answerArea}>
        {currentQuestion.options!.map((option, idx) => (
          <OptionButton
            key={idx}
            label={option}
            index={idx}
            selected={selected === idx}
            correct={idx === currentQuestion.correct}
            revealed={revealed}
            onPress={() => handleSelect(idx)}
          />
        ))}

        {revealed && (
          <View style={[styles.feedbackPanel, selected === currentQuestion.correct ? styles.feedbackPanelCorrect : styles.feedbackPanelWrong]}>
            <Text style={[styles.feedbackText, selected === currentQuestion.correct ? styles.feedbackTextCorrect : styles.feedbackTextWrong]}>
              {selected === currentQuestion.correct
                ? `🎉 Верно! +${XP_PER_QUESTION} XP`
                : `Неверно. Правильный ответ: ${currentQuestion.options![currentQuestion.correct!]}`}
            </Text>
            {currentQuestion.explanation && (
              <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
            )}
          </View>
        )}

        {!revealed && (
          <Pressable
            style={[styles.checkButton, selected !== null ? styles.checkButtonActive : styles.checkButtonDisabled]}
            onPress={handleCheck}
            disabled={selected === null}
          >
            <Text style={[styles.checkButtonText, selected !== null ? styles.checkButtonTextActive : styles.checkButtonTextDisabled]}>
              Проверить
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={styles.contentContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Pressable style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backButtonText}>←</Text>
              </Pressable>
              <Text style={styles.headerTitle}>JS Sensei</Text>
              {isChallenge === 'true' && (
                <View style={styles.challengeBadge}>
                  <Text style={styles.challengeBadgeText}>🎯 Задание</Text>
                </View>
              )}
            </View>
            <View style={styles.xpBadge}>
              <Text>✨</Text>
              <Text style={styles.xpBadgeText}>{currentXp} XP</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {currentQuestionIndex + 1}/{totalQuestions}
            </Text>
          </View>

          {/* Topic badge */}
          <View style={styles.topicBadge}>
            <Text style={styles.topicBadgeIcon}>📦</Text>
            <Text style={styles.topicBadgeText}>
              {currentLesson.title}
            </Text>
            <Text style={styles.topicBadgeDot}>•</Text>
            <Text style={styles.topicBadgeLevel}>Урок {currentLessonIndex + 1}</Text>
          </View>

          {/* Question */}
          <View key={fadeKey}>
            <View style={styles.titleRow}>
              <Text style={styles.questionTitle}>{currentQuestion.title}</Text>
              {currentQuestion.type === 'trueFalse' && (
                <Text style={styles.quickTag}>БЫСТРЫЙ</Text>
              )}
            </View>

            {renderCodeBlock()}
            {renderAnswerArea()}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════ STYLES ══════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  safeArea: { flex: 1, backgroundColor: '#0A0A0A' },
  contentContainer: { paddingHorizontal: 20, paddingVertical: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FACC15', letterSpacing: -0.5 },
  challengeBadge: {
    backgroundColor: 'rgba(96,165,250,0.12)',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.3)',
  },
  challengeBadgeText: { fontSize: 11, fontWeight: '700', color: '#60A5FA' },
  xpBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(250,204,21,0.08)', borderRadius: 99,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  xpBadgeText: { fontFamily: 'monospace', fontSize: 13, fontWeight: '700', color: '#FACC15' },
  progressSection: { marginBottom: 16 },
  progressBar: {
    height: 14, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  progressFill: { height: '100%', backgroundColor: '#FACC15' },
  progressText: { fontFamily: 'monospace', fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'right' },
  topicBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(96,165,250,0.08)', borderRadius: 99,
    paddingHorizontal: 12, paddingVertical: 8,
    marginTop: 8, marginBottom: 20, alignSelf: 'flex-start',
  },
  topicBadgeIcon: { fontSize: 13 },
  topicBadgeText: { fontSize: 13, color: '#60A5FA', fontWeight: '600' },
  topicBadgeDot: { fontSize: 12, color: 'rgba(255,255,255,0.25)', marginHorizontal: 4 },
  topicBadgeLevel: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
  questionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16, color: '#fff', letterSpacing: -0.3 },
  quickTag: {
    marginLeft: 10, fontSize: 10, fontWeight: '600', color: '#FB923C',
    backgroundColor: 'rgba(251,146,60,0.1)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  codeBlock: {
    backgroundColor: '#0D1117', borderRadius: 16, paddingVertical: 16, paddingHorizontal: 18,
    marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  codeLabel: { position: 'absolute', top: 10, right: 14, fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' },
  codeText: { fontFamily: 'monospace', fontSize: 14, color: '#E6EDF3', lineHeight: 22 },
  codeHighlight: { color: '#79C0FF' },
  codeGap: {
    backgroundColor: 'rgba(250,204,21,0.15)', borderWidth: 1, borderColor: 'rgba(250,204,21,0.4)',
    borderStyle: 'dashed', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, color: '#FACC15',
  },
  answerArea: { gap: 10, marginBottom: 24 },
  optionButton: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)',
  },
  optionButtonSelected: { backgroundColor: 'rgba(250,204,21,0.1)', borderColor: 'rgba(250,204,21,0.6)', borderWidth: 1.5 },
  optionButtonCorrect: { backgroundColor: 'rgba(52,211,153,0.12)', borderColor: 'rgba(52,211,153,0.6)', borderWidth: 1.5 },
  optionButtonWrong: { backgroundColor: 'rgba(248,113,113,0.1)', borderColor: 'rgba(248,113,113,0.5)', borderWidth: 1.5 },
  optionLabel: {
    width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center',
    fontWeight: '700', fontSize: 12, backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)',
  },
  optionLabelSelected: { backgroundColor: 'rgba(250,204,21,0.2)', color: '#FACC15' },
  optionLabelCorrect: { backgroundColor: 'rgba(52,211,153,0.2)', color: '#34D399' },
  optionLabelWrong: { backgroundColor: 'rgba(248,113,113,0.15)', color: '#F87171' },
  optionText: { fontFamily: 'monospace', fontSize: 14, color: 'rgba(255,255,255,0.9)', flex: 1 },
  optionTextSelected: { color: '#FACC15' },
  optionTextCorrect: { color: '#34D399' },
  optionTextWrong: { color: '#F87171' },
  trueFalseContainer: { flexDirection: 'row', gap: 12 },
  trueFalseButton: {
    flex: 1, paddingVertical: 16, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)',
  },
  trueFalseButtonSelected: { backgroundColor: 'rgba(250,204,21,0.1)', borderColor: 'rgba(250,204,21,0.6)' },
  trueFalseButtonCorrect: { backgroundColor: 'rgba(52,211,153,0.12)', borderColor: 'rgba(52,211,153,0.6)' },
  trueFalseButtonWrong: { backgroundColor: 'rgba(248,113,113,0.1)', borderColor: 'rgba(248,113,113,0.5)' },
  trueFalseText: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  trueFalseTextSelected: { color: '#FACC15' },
  trueFalseTextCorrect: { color: '#34D399' },
  trueFalseTextWrong: { color: '#F87171' },
  orderLine: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)',
  },
  orderLineDragging: { backgroundColor: 'rgba(250,204,21,0.1)', borderColor: 'rgba(250,204,21,0.5)' },
  orderLineCorrect: { backgroundColor: 'rgba(52,211,153,0.1)', borderColor: 'rgba(52,211,153,0.5)' },
  orderLineWrong: { backgroundColor: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.4)' },
  orderLineIndex: {
    width: 24, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)', fontWeight: '700', fontSize: 11,
  },
  orderLineText: { fontFamily: 'monospace', fontSize: 13, color: 'rgba(255,255,255,0.85)', flex: 1 },
  orderLineTextDragging: { color: '#FACC15' },
  feedbackPanel: {
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
    marginTop: 8, marginBottom: 12, borderWidth: 1,
  },
  feedbackPanelCorrect: { backgroundColor: 'rgba(52,211,153,0.08)', borderColor: 'rgba(52,211,153,0.2)' },
  feedbackPanelWrong: { backgroundColor: 'rgba(248,113,113,0.06)', borderColor: 'rgba(248,113,113,0.15)' },
  feedbackText: { fontSize: 14, marginBottom: 4 },
  feedbackTextCorrect: { color: '#34D399' },
  feedbackTextWrong: { color: '#F87171' },
  explanationText: { fontSize: 12, marginTop: 4, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' },
  checkButton: { paddingVertical: 14, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  checkButtonActive: { backgroundColor: '#FACC15' },
  checkButtonDisabled: { backgroundColor: 'rgba(255,255,255,0.05)' },
  checkButtonText: { fontSize: 16, fontWeight: '700' },
  checkButtonTextActive: { color: '#0A0A0A' },
  checkButtonTextDisabled: { color: 'rgba(255,255,255,0.2)' },
  resultScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 40 },
  resultTrophy: { fontSize: 48, marginBottom: 16 },
  resultTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 24 },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  star: { fontSize: 32 },
  statsContainer: { flexDirection: 'row', gap: 20, marginBottom: 28, alignItems: 'center' },
  statBox: { alignItems: 'center' },
  statValue: { fontFamily: 'monospace', fontSize: 32, fontWeight: '800', color: '#FACC15', marginBottom: 4 },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  resultDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.08)' },
  resultButton: {
    paddingHorizontal: 40, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#FACC15', justifyContent: 'center', alignItems: 'center',
  },
  resultButtonText: { fontSize: 16, fontWeight: '700', color: '#0A0A0A' },
  backButton: { marginRight: 12 },
  backButtonText: { fontSize: 24, color: '#fff' },
  // Achievement toast
  achievementToast: {
    position: 'absolute',
    top: -60,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(30,30,30,0.95)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.2)',
    marginHorizontal: 20,
    zIndex: 99,
  },
  toastIcon: { fontSize: 28 },
  toastText: { flex: 1 },
  toastLabel: { fontSize: 10, fontWeight: '600', color: '#FACC15', textTransform: 'uppercase', letterSpacing: 0.5 },
  toastTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 2 },
});
