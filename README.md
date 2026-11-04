# JS Sensei

JavaScript по 5 минут в день: короткая теория, задания на реальном коде и интервальные повторения.

**Веб-версия:** https://inuazh.github.io/Javascript_Sensei/

Expo SDK 54 · React Native · TypeScript · expo-router · zustand · Jest · Playwright · Firebase Realtime Database

## Запуск

```bash
npm ci
npm start           # Expo Dev Server, QR-код для Expo Go
npm run web         # веб-версия
npm run check       # типы, линтер, формат, тесты, проверка контента (то же в CI)
npm run test:e2e    # e2e на веб-сборке (один раз: npx playwright install chromium)
```

## Устройство

```
app/            экраны (expo-router)
content/        уроки в JSON, правила в content/README.md
src/domain/     логика без React: XP, стрик, повторения, миграции (покрыта тестами)
src/features/   квиз, теория, результаты, запуск кода
src/stores/     сохранённое состояние пользователя с версиями и миграциями
src/services/   уведомления, рейтинг, песочница для кода
src/ui/         тема и компоненты
scripts/        валидатор контента
```

- Новый раздел: JSON-файл, запись в `content/sections.json` и строка в `content/index.ts`.
- Новый тип вопроса: компонент, запись в `src/features/quiz/registry.ts` и вариант в схеме.
- Меняешь форму сохранённых данных: новая версия стора и миграция, иначе пользователи потеряют прогресс.

## Сборка и обновления

```bash
npm run build:rustore                         # APK для RuStore
npm run update -- --message "что исправлено"  # правки уроков и JS без нового APK
```

Новый APK нужен только при нативных изменениях: зависимости, плагины, иконка, разрешения, версия SDK. Тогда подними `version` в `app.json` и `package.json`.

Рейтинг на Firebase: настройка в [`docs/firebase.md`](./docs/firebase.md). Публикация в RuStore: [`docs/store/rustore.md`](./docs/store/rustore.md).
