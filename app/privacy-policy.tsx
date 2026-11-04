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
        <Text style={styles.updated}>Последнее обновление: ноябрь 2026</Text>

        <Section title="1. Общие положения">
          JS Sensei («Приложение») не продаёт персональные данные и не использует их для рекламы.
          Почти все данные хранятся только на вашем устройстве.
        </Section>

        <Section title="2. Данные на устройстве">
          Приложение сохраняет на вашем устройстве:{'\n\n'}• Прогресс обучения (пройденные уроки,
          звёзды, XP, стрик){'\n'}• Историю ответов для интервальных повторений{'\n'}• Настройки
          (цель дня, напоминания, звук){'\n\n'}
          Эти данные не покидают устройство.
        </Section>

        <Section title="3. Рейтинг (по желанию)">
          Если вы выбираете ник и присоединяетесь к рейтингу, на сервер (Google Firebase)
          отправляются: ник, случайный идентификатор игрока, XP, уровень и длина стрика. Эти данные
          видят другие участники рейтинга. Без ника ничего не отправляется. Выйти из рейтинга можно
          в настройках; для удаления записи напишите на адрес ниже.
        </Section>

        <Section title="4. Уведомления">
          Напоминания о занятиях планируются локально на устройстве и не требуют сервера. Их можно
          отключить в настройках приложения или телефона.
        </Section>

        <Section title="5. Аналитика и реклама">
          Приложение не использует сторонние сервисы аналитики, рекламные сети или инструменты
          отслеживания.
        </Section>

        <Section title="6. Права пользователя">
          Вы можете сбросить прогресс в настройках или удалить все локальные данные, удалив
          приложение. По запросу мы удалим вашу запись из рейтинга.
        </Section>

        <Section title="7. Дети">
          Приложение не предназначено для детей до 13 лет и не собирает сознательно данные
          несовершеннолетних.
        </Section>

        <Section title="8. Изменения политики">
          В случае изменения политики обновлённая версия будет опубликована в приложении с новой
          датой.
        </Section>

        <Section title="9. Контакт">По вопросам конфиденциальности: jssensei.app@gmail.com</Section>

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  back: { width: 40, height: 40, justifyContent: 'center' },
  backText: { fontSize: 22, color: '#fff' },
  title: { fontSize: 16, fontWeight: '700', color: '#fff' },
  scroll: { flex: 1 },
  content: { padding: 20 },
  updated: { fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FACC15',
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 22,
  },
});
