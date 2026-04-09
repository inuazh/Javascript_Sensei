import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  // SafeAreaView replaced below,
  FlatList,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '../../src/stores/useUserStore';
import { useContentStore } from '../../src/stores/useContentStore';
import { Colors, Spacing, Radius, SectionColors } from '../../src/constants/theme';

const { width } = Dimensions.get('window');

interface DayActivity {
  label: string;
  done: boolean;
  today: boolean;
}

interface SkillNode {
  id: string;
  title: string;
  subtitle: string;
  stars: number;
  maxStars: number;
  xp: number;
  status: 'done' | 'current' | 'locked';
  sectionId: string;
}

interface Section {
  sectionId: string;
  name: string;
  icon: string;
  color: string;
  nodes: SkillNode[];
}

const WEEK_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const WEEK_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function buildWeekActivity(weekActivity: Partial<Record<string, boolean>>): DayActivity[] {
  const todayDow = new Date().getDay(); // 0=Sun, 1=Mon … 6=Sat
  // Show Mon–Sun (starting Monday): reorder so Mon is index 0
  const ordered = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun day-of-week indices
  return ordered.map((dow) => ({
    label: WEEK_LABELS[dow],
    done: weekActivity[WEEK_KEYS[dow]] === true,
    today: dow === todayDow,
  }));
}

// ───── Stars Component ─────
function Stars({ count, max, size = 14 }: { count: number; max: number; size?: number }) {
  return (
    <View style={styles.starsContainer}>
      {Array.from({ length: max }, (_, i) => (
        <Text
          key={i}
          style={[
            styles.star,
            {
              fontSize: size,
              opacity: i < count ? 1 : 0.2,
            },
          ]}
        >
          ⭐
        </Text>
      ))}
    </View>
  );
}

// ───── Skill Node Component ─────
function SkillNode({
  node,
  color,
  onPress,
  isSelected,
}: {
  node: SkillNode;
  color: string;
  onPress: () => void;
  isSelected: boolean;
}) {
  const isCurrent = node.status === 'current';
  const isLocked = node.status === 'locked';
  const isDone = node.status === 'done';

  return (
    <Pressable
      onPress={!isLocked ? onPress : undefined}
      style={[
        styles.skillNode,
        {
          backgroundColor: isSelected
            ? color + '18'
            : isCurrent
            ? 'rgba(255,255,255,0.04)'
            : 'transparent',
          borderColor: isSelected
            ? color + '55'
            : isCurrent
            ? 'rgba(255,255,255,0.1)'
            : 'transparent',
          opacity: isLocked ? 0.35 : 1,
        },
      ]}
    >
      {/* Node Circle */}
      <View
        style={[
          styles.nodeCircle,
          {
            backgroundColor: isDone
              ? color + '20'
              : isCurrent
              ? 'rgba(250,204,21,0.15)'
              : 'rgba(255,255,255,0.03)',
            borderColor: isCurrent ? 'rgba(250,204,21,0.4)' : color + '30',
            borderWidth: isCurrent ? 2 : 1.5,
            shadowColor: isCurrent ? 'rgba(250,204,21,0.15)' : 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: isCurrent ? 0.15 : 0,
            shadowRadius: isCurrent ? 10 : 0,
            elevation: isCurrent ? 10 : 0,
          },
        ]}
      >
        <Text style={styles.nodeIcon}>
          {isLocked ? '🔒' : isDone ? '✓' : isCurrent ? '▶' : '○'}
        </Text>
      </View>

      {/* Text Content */}
      <View style={styles.nodeTextContainer}>
        <Text style={[styles.nodeTitle, { color: isLocked ? 'rgba(255,255,255,0.3)' : '#fff' }]}>
          {node.title}
        </Text>
        <Text style={styles.nodeSubtitle}>{node.subtitle}</Text>
        {isDone && <Stars count={node.stars} max={node.maxStars} size={11} />}
      </View>

      {/* XP Badge */}
      {isDone && node.xp > 0 && (
        <View style={[styles.xpBadge, { backgroundColor: color + '12', borderColor: color + '30' }]}>
          <Text style={[styles.xpText, { color }]}>+{node.xp}</Text>
        </View>
      )}

      {/* Play Button */}
      {isCurrent && (
        <View style={[styles.playButton, { backgroundColor: color }]}>
          <Text style={styles.playButtonText}>Начать</Text>
        </View>
      )}
    </Pressable>
  );
}

// ───── Bottom Sheet Modal ─────
function LessonModal({
  visible,
  node,
  color,
  onClose,
  onStartLesson,
}: {
  visible: boolean;
  node: SkillNode | null;
  color: string;
  onClose: () => void;
  onStartLesson: (lessonIndex?: number) => void;
}) {
  if (!node) return null;

  const contentStore = useContentStore();
  const userStore = useUserStore();
  const lessons = contentStore.getLessonsForTopic(node.id);
  const completedLessonIds = userStore.topicsProgress[node.id]?.completedLessons || [];
  const isDone = node.status === 'done';
  const lessonCount = lessons.length > 0 ? lessons.length : 5;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalContent}>
          {/* Handle */}
          <View style={styles.modalHandle} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={[styles.modalCircle, { backgroundColor: color + '20', borderColor: color + '30' }]}>
              <Text style={styles.modalCircleIcon}>{isDone ? '✓' : '▶'}</Text>
            </View>
            <View style={styles.modalHeaderText}>
              <Text style={styles.modalTitle}>{node.title}</Text>
              <Text style={styles.modalSubtitle}>{node.subtitle}</Text>
            </View>
          </View>

          {/* Stats Box (if done) */}
          {isDone && (
            <View style={styles.statsBox}>
              <View style={styles.statItem}>
                <Stars count={node.stars} max={node.maxStars} size={16} />
                <Text style={styles.statLabel}>Звёзды</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statXp}>{node.xp}</Text>
                <Text style={styles.statLabel}>XP</Text>
              </View>
            </View>
          )}

          {/* Lesson List */}
          <View style={styles.lessonList}>
            {(lessons.length > 0
              ? lessons
              : Array.from({ length: lessonCount }, (_, i) => ({ id: `${node.id}-${i}`, title: `Урок ${i + 1}`, order: i }))
            ).map((lesson, i) => {
              const completed = completedLessonIds.includes(lesson.id);
              return (
                <Pressable
                  key={lesson.id}
                  onPress={() => onStartLesson(i)}
                  style={[
                    styles.lessonItem,
                    {
                      backgroundColor: completed ? 'rgba(52,211,153,0.04)' : 'rgba(255,255,255,0.02)',
                      borderColor: completed ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.lessonNumber,
                      { backgroundColor: completed ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.04)' },
                    ]}
                  >
                    <Text style={[styles.lessonNumberText, { color: completed ? '#34D399' : 'rgba(255,255,255,0.25)' }]}>
                      {completed ? '✓' : i + 1}
                    </Text>
                  </View>
                  <Text style={[styles.lessonLabel, { color: completed ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)', flex: 1 }]}>
                    {lesson.title}
                  </Text>
                  {!completed && (
                    <Text style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>▶</Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Action Button */}
          <Pressable
            onPress={() => onStartLesson()}
            style={[
              styles.actionButton,
              {
                backgroundColor: isDone ? 'rgba(255,255,255,0.06)' : color,
                borderColor: isDone ? 'rgba(255,255,255,0.08)' : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.actionButtonText,
                {
                  color: isDone ? '#fff' : '#0A0A0A',
                },
              ]}
            >
              {isDone ? 'Повторить' : 'Начать урок'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ───── Main Home Screen ─────
export default function HomeScreen() {
  const router = useRouter();
  const userStore = useUserStore();
  const contentStore = useContentStore();

  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
  const [selectedColor, setSelectedColor] = useState('#fff');
  const [contentReady, setContentReady] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Load content once on mount
  useEffect(() => {
    const initContent = async () => {
      await contentStore.loadSections();
      await contentStore.loadLessonsForSection('basics');
      await contentStore.loadLessonsForSection('control');
      await contentStore.loadLessonsForSection('collections');
      setContentReady(true);
    };
    initContent();
  }, []);

  // Re-derive sections whenever content or progress changes
  const sections = React.useMemo(() => {
    if (!contentReady) return [];
    return contentStore.sections.map((sectionDef) => {
      const sectionColor = SectionColors[sectionDef.id] || '#FFFFFF';
      const nodes: SkillNode[] = (sectionDef.topics || []).map((topic) => {
        const progress = userStore.topicsProgress[topic.id];
        const completedCount = progress?.completedLessons.length || 0;
        const totalLessonsForTopic = contentStore.getLessonsForTopic(topic.id).length || 5;
        const isDone = completedCount >= totalLessonsForTopic;
        return {
          id: topic.id,
          title: topic.title,
          subtitle: topic.subtitle,
          stars: progress?.bestStars || 0,
          maxStars: 3,
          xp: progress?.earnedXp || 0,
          status: isDone ? 'done' : ('current' as 'done' | 'current' | 'locked'),
          sectionId: sectionDef.id,
        };
      });
      return { sectionId: sectionDef.id, name: sectionDef.title, icon: sectionDef.icon, color: sectionColor, nodes };
    });
  }, [contentReady, contentStore.sections, userStore.topicsProgress]);

  // Compute stats
  const totalXp = Object.values(userStore.topicsProgress).reduce((sum, tp) => sum + tp.earnedXp, 0);
  const totalStars = userStore.totalStars();
  const maxStars = sections.reduce(
    (sum, s) => sum + s.nodes.reduce((nodeSum, n) => nodeSum + n.maxStars, 0),
    0
  );
  const streakCount = userStore.userProgress.currentStreak;
  const weekDays = buildWeekActivity(userStore.weekActivity as unknown as Partial<Record<string, boolean>>);

  const handleSelectNode = (node: SkillNode, color: string) => {
    setSelectedNode(node);
    setSelectedColor(color);
    setIsModalVisible(true);
  };

  const handleStartLesson = (lessonIndex?: number) => {
    if (selectedNode) {
      const params = lessonIndex !== undefined ? `?lessonIndex=${lessonIndex}` : '';
      router.push(`/lesson/${selectedNode.id}${params}`);
      setIsModalVisible(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* ── Top Header ── */}
        <View style={styles.headerContainer}>
          <View style={styles.headerTop}>
            <View style={styles.logoContainer}>
              <Text style={styles.lightningEmoji}>⚡</Text>
              <Text style={styles.logoText}>JS Sensei</Text>
            </View>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>R</Text>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: 'rgba(251,146,60,0.08)', borderColor: 'rgba(251,146,60,0.15)' }]}>
              <Text style={styles.statIcon}>🔥</Text>
              <Text style={[styles.statValue, { color: '#FB923C' }]}>{streakCount}</Text>
              <Text style={styles.statCardLabel}>стрик</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: 'rgba(250,204,21,0.08)', borderColor: 'rgba(250,204,21,0.15)' }]}>
              <Text style={styles.statIcon}>✨</Text>
              <Text style={[styles.statValue, { color: '#FACC15' }]}>{totalXp}</Text>
              <Text style={styles.statCardLabel}>XP</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: 'rgba(96,165,250,0.08)', borderColor: 'rgba(96,165,250,0.15)' }]}>
              <Text style={styles.statIcon}>⭐</Text>
              <Text style={[styles.statValue, { color: '#60A5FA' }]}>{totalStars}/{maxStars}</Text>
              <Text style={styles.statCardLabel}>звёзд</Text>
            </View>
          </View>

          {/* Weekly Progress */}
          <View style={styles.weeklyBox}>
            <Text style={styles.weeklyLabel}>НЕДЕЛЬНЫЙ ПРОГРЕСС</Text>
            <View style={styles.weeklyDays}>
              {weekDays.map((day, i) => (
                <View key={i} style={styles.dayContainer}>
                  <View
                    style={[
                      styles.dayCircle,
                      {
                        backgroundColor: day.done
                          ? 'linear-gradient(135deg, #34D399, #10B981)'
                          : day.today
                          ? 'rgba(250,204,21,0.1)'
                          : 'rgba(255,255,255,0.03)',
                        borderColor: day.today && !day.done
                          ? 'rgba(250,204,21,0.4)'
                          : day.done
                          ? 'rgba(52,211,153,0.3)'
                          : 'rgba(255,255,255,0.05)',
                        borderWidth: day.today && !day.done ? 1.5 : 1,
                        shadowColor: day.today && !day.done ? 'rgba(250,204,21,0.15)' : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayCircleText,
                        {
                          color: day.done ? '#fff' : day.today ? '#FACC15' : 'rgba(255,255,255,0.15)',
                        },
                      ]}
                    >
                      {day.done ? '✓' : day.today ? '!' : '·'}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.dayLabel,
                      {
                        color: day.today ? '#FACC15' : day.done ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
                      },
                    ]}
                  >
                    {day.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── Skill Tree ── */}
        <View style={styles.skillTreeContainer}>
          {sections.map((section, sectionIdx) => (
            <View key={section.sectionId} style={styles.sectionContainer}>
              {/* Section Header */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>{section.icon}</Text>
                <Text style={[styles.sectionTitle, { color: section.color }]}>{section.name}</Text>
                <View style={[styles.sectionLine, { backgroundColor: section.color + '15' }]} />
                <Text style={styles.sectionProgress}>
                  {section.nodes.filter((n) => n.status === 'done').length}/{section.nodes.length}
                </Text>
              </View>

              {/* Nodes */}
              <View style={styles.nodesContainer}>
                {/* Connecting Line */}
                <View
                  style={[
                    styles.connectingLine,
                    { backgroundColor: section.color + '20' },
                  ]}
                />

                {section.nodes.map((node) => (
                  <SkillNode
                    key={node.id}
                    node={node}
                    color={section.color}
                    isSelected={selectedNode?.id === node.id}
                    onPress={() => handleSelectNode(node, section.color)}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Bottom Padding for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal */}
      <LessonModal
        visible={isModalVisible}
        node={selectedNode}
        color={selectedColor}
        onClose={() => setIsModalVisible(false)}
        onStartLesson={handleStartLesson}
      />
    </SafeAreaView>
  );
}

// ═══════════════ STYLES ═══════════════
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Header ──
  headerContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    backgroundColor: 'rgba(250,204,21,0.03)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  lightningEmoji: {
    fontSize: 24,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.yellow,
    letterSpacing: -0.5,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(139,92,246,0.3)',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },

  // ── Stats Row ──
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  statIcon: {
    fontSize: 16,
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: Spacing.xs,
  },
  statCardLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
  },

  // ── Weekly Progress ──
  weeklyBox: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  weeklyLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: Spacing.lg,
    letterSpacing: 0.5,
  },
  weeklyDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayContainer: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  dayCircleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Skill Tree ──
  skillTreeContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xl,
  },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingLeft: Spacing.xs,
    gap: Spacing.sm,
  },
  sectionIcon: {
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  sectionLine: {
    flex: 1,
    height: 1,
  },
  sectionProgress: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
  },

  // ── Nodes ──
  nodesContainer: {
    position: 'relative',
    gap: Spacing.sm,
  },
  connectingLine: {
    position: 'absolute',
    left: 24,
    top: 20,
    bottom: 20,
    width: 2,
    borderRadius: 99,
    zIndex: 0,
  },
  skillNode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    gap: Spacing.lg,
    zIndex: 1,
  },
  nodeCircle: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  nodeIcon: {
    fontSize: 22,
  },
  nodeTextContainer: {
    flex: 1,
  },
  nodeTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  nodeSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    marginBottom: Spacing.xs,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  star: {
    color: '#FACC15',
  },
  xpBadge: {
    borderRadius: Radius.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
  },
  xpText: {
    fontSize: 12,
    fontWeight: '700',
  },
  playButton: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0A0A0A',
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    backgroundColor: 'rgba(24,24,27,0.95)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    zIndex: 101,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  modalCircle: {
    width: 60,
    height: 60,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  modalCircleIcon: {
    fontSize: 26,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  statsBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    marginBottom: Spacing.xl,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  statXp: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FACC15',
    marginBottom: Spacing.md,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
  },
  lessonList: {
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  lessonNumber: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lessonNumberText: {
    fontSize: 12,
    fontWeight: '700',
  },
  lessonLabel: {
    fontSize: 14,
  },
  actionButton: {
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(250,204,21,0.25)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
