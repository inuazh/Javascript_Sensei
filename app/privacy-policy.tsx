import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BackButton, Colors, Fonts } from '../src/ui';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.title}>Политика конфиденциальности</Text>
        <View style={{ width: 22 }} />
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
          отправляются: ник, случайный идентификатор игрока, XP (всего и за текущую неделю) и длина
          стрика. Для этого приложение создаёт анонимную учётную запись Firebase — без имени, почты
          и телефона. Эти данные видят другие участники рейтинга. Без ника ничего из этого не
          отправляется.{'\n\n'}
          Когда вы открываете вкладку «Рейтинг», приложение загружает таблицу с серверов Google
          Firebase — даже если вы не участвуете в рейтинге. При этом, как при любом обращении к
          интернет-сервису, Firebase получает IP-адрес вашего устройства. Приложение IP-адрес не
          сохраняет.{'\n\n'}
          Выйти из рейтинга можно в настройках: приложение удалит с сервера вашу запись (общий
          рейтинг и таблицы текущей и прошлой недели). Если удаление не удалось, например без
          интернета, напишите на адрес ниже, и мы удалим запись вручную.
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
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontFamily: Fonts.monoBold, fontSize: 14, color: Colors.textPrimary },
  scroll: { flex: 1 },
  content: { padding: 20 },
  updated: { fontFamily: Fonts.mono, fontSize: 12, color: Colors.textMuted, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontFamily: Fonts.monoBold, fontSize: 14, color: Colors.accent, marginBottom: 8 },
  sectionBody: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
});
