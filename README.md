# Star 🤖

AI Chat Assistant — мобильное приложение для общения с искусственным интеллектом через OpenAI-совместимые API.

## Возможности

- 💬 **Чат с AI** — общайтесь с различными языковыми моделями
- 🖼️ **Вложения** — отправляйте фото, файлы и изображения с камеры (поддержка vision-моделей)
- 🔄 **Несколько моделей** — переключайтесь между доступными моделями в настройках
- 📝 **Автоматические заголовки** — чаты автоматически получают названия на основе контекста
- 🌙 **Тёмная тема** — полностью тёмный интерфейс в стиле iOS
- ⚙️ **Гибкие настройки** — настройте системный промпт, API-ключ и endpoint

## Технологии

- [React Native](https://reactnative.dev/) — фреймворк для нативных приложений
- [Expo](https://expo.dev/) — платформа для разработки React Native
- [Expo Router](https://docs.expo.dev/router/introduction/) — файловая навигация
- [Zustand](https://github.com/pmndrs/zustand) — управление состоянием
- TypeScript — типизация

## Запуск

```bash
# Установка зависимостей
npm install

# Запуск на Android (через Expo Go)
npx expo start --android

# Или просто
npx expo start
```

## Настройка

1. Откройте приложение
2. Нажмите на шапку "Провайдер" в боковом меню
3. Введите:
   - **Base URL** — адрес вашего API (например, `https://api.openai.com/v1`)
   - **API Key** — ваш ключ
   - **Model** — название модели (например, `gpt-4o`)
4. Начните чат!

## Структура проекта

```
app/                 — Expo Router экраны
src/
  components/        — UI компоненты (ChatInput, MessageBubble, Drawer...)
  screens/           — Экраны (Settings, Login, Splash...)
  stores/            — Zustand сторы (chatStore, settingsStore)
  lib/               — API, утилиты, хелперы
  design/            — Тема, типографика, отступы
  types/             — TypeScript типы
assets/              — Изображения, иконки
```

## Лицензия

MIT
