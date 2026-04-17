import React from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.title}>Политика конфиденциальности</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Последнее обновление: апрель 2025</Text>

        <Section title="1. Общие положения">
          JS Sensei («Приложение») не собирает, не передаёт и не продаёт
          персональные данные пользователей. Все данные хранятся исключительно
          на устройстве пользователя.
        </Section>

        <Section title="2. Данные, хранящиеся локально">
          Приложение сохраняет на вашем устройстве:{'\n\n'}
          • Прогресс обучения (пройденные уроки, звёзды, XP){'\n'}
          • Статистику ответов (количество верных/неверных){'\n'}
          • Настройки профиля (уровень, ежедневная цель){'\n'}
          • Историю активности (для тепловой карты){'\n\n'}
          Эти данные не покидают ваше устройство и не передаются третьим лицам.
        </Section>

        <Section title="3. Уведомления">
          Приложение может запрашивать разрешение на отправку push-уведомлений
          для напоминаний о ежедневных занятиях. Уведомления отправляются
          локально с устройства. Вы можете отключить их в любой момент
          в настройках устройства.
        </Section>

        <Section title="4. Аналитика и реклама">
          Приложение не использует сторонние сервисы аналитики, рекламные сети
          или инструменты отслеживания.
        </Section>

        <Section title="5. Права пользователя">
          Вы можете удалить все данные приложения в любой момент, удалив
          приложение с устройства. Все локальные данные будут безвозвратно
          удалены вместе с приложением.
        </Section>

        <Section title="6. Дети">
          Приложение не предназначено для детей до 13 лет и не собирает
          сознательно данные несовершеннолетних.
        </Section>

        <Section title="7. Изменения политики">
          В случае изменения настоящей политики обновлённая версия будет
          опубликована в приложении с указанием новой даты.
        </Section>

        <Section title="8. Контакт">
          По вопросам конфиденциальности обращайтесь:{'\n'}
          jssensei.app@gmail.com
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A0A' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  back: { width: 40, height: 40, justifyContent: 'center' },
  backText: { fontSize: 22, color: '#fff' },
  title: { fontSize: 16, fontWeight: '700', color: '#fff' },
  scroll: { flex: 1 },
  content: { padding: 20 },
  updated: { fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: '#FACC15', marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 22,
  },
});
