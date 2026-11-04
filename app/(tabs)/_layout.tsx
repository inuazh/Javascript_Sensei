import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { dueItems } from '../../src/domain/review';
import { useToday } from '../../src/hooks/useToday';
import { useUserStore } from '../../src/stores/useUserStore';
import { Colors } from '../../src/ui';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={[styles.icon, { opacity: focused ? 1 : 0.45 }]}>{emoji}</Text>;
}

export default function TabsLayout() {
  const today = useToday();
  const dueCount = useUserStore(s => dueItems(s.progress.review, today).length);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.yellow,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
        sceneStyle: { backgroundColor: Colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Учёба',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📚" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Тренировка',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🧠" focused={focused} />,
          tabBarBadge: dueCount > 0 ? dueCount : undefined,
          tabBarBadgeStyle: styles.badge,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Рейтинг',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏆" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.background,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
  },
  label: { fontSize: 10, fontWeight: '700' },
  icon: { fontSize: 20 },
  badge: {
    backgroundColor: Colors.pink,
    color: Colors.textOnAccent,
    fontWeight: '800',
    fontSize: 10,
  },
});
