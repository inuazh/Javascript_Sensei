import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { dueItems } from '../../src/domain/review';
import { useToday } from '../../src/hooks/useToday';
import { useUserStore } from '../../src/stores/useUserStore';
import { Colors, Fonts, Icon, type IconName } from '../../src/ui';

function tabIcon(name: IconName) {
  function TabIcon({ color }: { color: string }) {
    return <Icon name={name} size={20} color={color} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const today = useToday();
  const dueCount = useUserStore(s => dueItems(s.progress.review, today).length);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.textPrimary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
        sceneStyle: { backgroundColor: Colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'учёба', tabBarIcon: tabIcon('book-open') }} />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'повтор',
          tabBarIcon: tabIcon('repeat'),
          tabBarBadge: dueCount > 0 ? dueCount : undefined,
          tabBarBadgeStyle: styles.badge,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{ title: 'рейтинг', tabBarIcon: tabIcon('bar-chart-2') }}
      />
      <Tabs.Screen name="profile" options={{ title: 'профиль', tabBarIcon: tabIcon('user') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.background,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    ...(Platform.OS === 'web' ? { height: 60, paddingBottom: 6 } : null),
  },
  label: { fontFamily: Fonts.mono, fontSize: 10, lineHeight: 14, marginBottom: 2 },
  badge: {
    backgroundColor: Colors.accent,
    color: Colors.textOnAccent,
    fontFamily: Fonts.monoBold,
    fontSize: 10,
  },
});
