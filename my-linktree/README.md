# My LinkTree Portfolio

<!-- Build trigger: 2026-01-18T02:08:00 -->

Интерактивное CV с AI HR Assistant для анализа соответствия вакансиям.

## 🚀 Запуск

```bash
# 1. Установить зависимости
npm install

# 2. Настроить API ключ
# Скопируй .env.example в .env и добавь свой Gemini API key
cp .env.example .env

# 3. Запустить dev сервер
npm run dev
```

## 📁 Структура

```
my-linktree/
├── src/
│   ├── components/
│   │   ├── Header.jsx       # Шапка с контактами
│   │   ├── CVSection.jsx    # Навыки и опыт
│   │   ├── ProjectsSection.jsx  # Витрина проектов
│   │   └── AIChat.jsx       # HR-ассистент
│   ├── data/
│   │   ├── cv.json          # Данные CV
│   │   └── projects.json    # Список проектов
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── vite.config.js
└── package.json
```

## 🤖 AI HR Assistant

HR может вставить текст вакансии → AI анализирует соответствие твоего профиля.

**Требуется:** Gemini API Key (бесплатно на https://aistudio.google.com/)

## 🎨 Стек

- React + Vite
- Gemini AI
- Vanilla CSS (светлая тема + синий акцент)
