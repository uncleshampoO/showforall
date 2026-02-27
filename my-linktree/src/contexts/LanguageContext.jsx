import { createContext, useContext, useState, useCallback } from 'react'

const LanguageContext = createContext()

// All translatable content in one place
const translations = {
    ru: {
        // Hero
        heroName: 'ВИТАЛИЙ\nБОНДАРЕВ',
        heroTitle: 'AI Product Engineer | Internal AI Consultant',
        heroStatement: 'Я строю AI-системы,\nкоторые продают',
        scrollHint: 'Скролл',

        // About
        aboutLine1: '7 лет я строил отделы продаж, нанимал людей и закрывал сделки.',
        aboutLine2: 'Потом понял: всё это можно автоматизировать.',
        aboutLine3: 'Сегодня я соединяю глубокое понимание бизнес-процессов с архитектурой LLM-решений.',
        aboutLine4: 'Я перевожу с технического на бизнесовый — и обратно.',
        aboutLine5: 'Я не просто пишу промпты. Я внедряю AI в живые процессы компаний.',

        // Projects
        projectsTitle: 'ПРОЕКТЫ',
        project1Name: 'Vibo Team',
        project1Tag: 'AI Sales OS',
        project1Desc: 'CRM с AI-агентом под капотом. Автогенерация коммерческих предложений, счетов и индивидуальный коучинг по каждой сделке.',
        project1Features: ['AI Shark Advisor', 'Генерация КП и счетов', '4-этапная воронка', 'Командный пайплайн'],
        project2Name: 'Vibo Academy',
        project2Tag: 'Duolingo + NotebookLM',
        project2Desc: 'Адаптивная система обучения с персонализированными AI-роадмапами. Оплата через Telegram Stars.',
        project2Features: ['AI-Роадмапы', 'Spaced Repetition', 'Telegram Stars', 'Адаптивная сложность'],
        project3Name: 'Antigravity Starter Pack',
        project3Tag: 'AI Рабочая Среда',
        project3Desc: 'Полностью готовая рабочая среда с pre-configured агентами, скиллами и вшитым обучением. Операционная система для AI-ассистента.',
        project3Features: ['Pre-configured среда', 'Встроенные агенты', '10-Phase методология', 'Обучение из коробки'],

        // Experience
        experienceTitle: 'ОПЫТ',

        // Stack
        stackTitle: 'КОГНИТИВНЫЙ СТЕК',
        stackPhase1: 'Business & Strategy',
        stackPhase1Tag: 'INPUT',
        stackPhase2: 'AI & LLM',
        stackPhase2Tag: 'ENGINE',
        stackPhase3: 'Products',
        stackPhase3Tag: 'OUTPUT',

        // Proof of Work
        proofTitle: 'PROOF OF WORK',
        proofSubtitle: 'Январь 2026',

        // AI Chat
        chatTitle: 'AI HR Assistant',
        chatPlaceholder: 'Задайте вопрос про мой опыт...',

        // Contacts
        contactTitle: 'ДАВАЙТЕ СОЗДАДИМ\nЧТО-ТО ВМЕСТЕ',
        contactEmail: 'Написать на Email',
        contactTelegram: 'Telegram',
        contactLinkedin: 'LinkedIn',

        // Nav
        navHero: 'Главная',
        navAbout: 'Обо мне',
        navProjects: 'Проекты',
        navExperience: 'Опыт',
        navStack: 'Стек',
        navContact: 'Контакт',
    },
    en: {
        // Hero
        heroName: 'VITALIY\nBONDAREV',
        heroTitle: 'AI Product Engineer | Internal AI Consultant',
        heroStatement: 'I build AI systems\nthat sell',
        scrollHint: 'Scroll',

        // About
        aboutLine1: '7 years building sales teams, hiring people, closing deals.',
        aboutLine2: 'Then I realized: all of this can be automated.',
        aboutLine3: 'Today I connect deep business process understanding with LLM solution architecture.',
        aboutLine4: 'I translate between tech and business — both ways.',
        aboutLine5: "I don't just write prompts. I embed AI into real company workflows.",

        // Projects
        projectsTitle: 'PROJECTS',
        project1Name: 'Vibo Team',
        project1Tag: 'AI Sales OS',
        project1Desc: 'CRM with an AI agent under the hood. Auto-generation of commercial proposals, invoices, and individual deal coaching.',
        project1Features: ['AI Shark Advisor', 'Proposal & Invoice Gen', '4-Stage Funnel', 'Team Pipeline'],
        project2Name: 'Vibo Academy',
        project2Tag: 'Duolingo + NotebookLM',
        project2Desc: 'Adaptive learning system with personalized AI roadmaps. Payment via Telegram Stars.',
        project2Features: ['AI Roadmaps', 'Spaced Repetition', 'Telegram Stars', 'Adaptive Difficulty'],
        project3Name: 'Antigravity Starter Pack',
        project3Tag: 'AI Workspace',
        project3Desc: 'Fully configured workspace with pre-built agents, skills, and embedded training. An operating system for your AI assistant.',
        project3Features: ['Pre-configured Env', 'Built-in Agents', '10-Phase Methodology', 'Training Included'],

        // Experience
        experienceTitle: 'EXPERIENCE',

        // Stack
        stackTitle: 'COGNITIVE STACK',
        stackPhase1: 'Business & Strategy',
        stackPhase1Tag: 'INPUT',
        stackPhase2: 'AI & LLM',
        stackPhase2Tag: 'ENGINE',
        stackPhase3: 'Products',
        stackPhase3Tag: 'OUTPUT',

        // Proof of Work
        proofTitle: 'PROOF OF WORK',
        proofSubtitle: 'January 2026',

        // AI Chat
        chatTitle: 'AI HR Assistant',
        chatPlaceholder: 'Ask about my experience...',

        // Contacts
        contactTitle: "LET'S BUILD\nSOMETHING TOGETHER",
        contactEmail: 'Email Me',
        contactTelegram: 'Telegram',
        contactLinkedin: 'LinkedIn',

        // Nav
        navHero: 'Home',
        navAbout: 'About',
        navProjects: 'Projects',
        navExperience: 'Experience',
        navStack: 'Stack',
        navContact: 'Contact',
    },
}

export function LanguageProvider({ children }) {
    const [lang, setLang] = useState('ru')

    const toggleLang = useCallback(() => {
        setLang((prev) => (prev === 'ru' ? 'en' : 'ru'))
    }, [])

    const t = useCallback(
        (key) => {
            return translations[lang]?.[key] ?? key
        },
        [lang]
    )

    return (
        <LanguageContext.Provider value={{ lang, toggleLang, t }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLang() {
    const context = useContext(LanguageContext)
    if (!context) {
        throw new Error('useLang must be used within LanguageProvider')
    }
    return context
}
