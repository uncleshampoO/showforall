import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLang } from '../contexts/LanguageContext'

gsap.registerPlugin(ScrollTrigger)

// Experience data (from cv.json, hardcoded for performance)
const experience = [
    {
        company: 'Vibo (Startup)',
        role: { ru: 'AI Practitioner & Product Builder', en: 'AI Practitioner & Product Builder' },
        period: { ru: 'Окт 2025 — настоящее время', en: 'Oct 2025 — Present' },
        achievements: {
            ru: [
                'Vibo Academy: адаптивная система обучения с AI-наставником',
                'Vibo Shark CRM: безинтерфейсная CRM с AI-агентом',
                'Agents Framework: продакшн-готовые AI-агенты',
                'Gemini Starter Pack: мульти-агентный фреймворк',
            ],
            en: [
                'Vibo Academy: adaptive learning with AI tutor',
                'Vibo Shark CRM: interface-free CRM with AI agent',
                'Agents Framework: production-ready AI agents',
                'Gemini Starter Pack: multi-agent framework',
            ],
        },
    },
    {
        company: { ru: 'ИП, Тбилиси', en: 'Own Business, Tbilisi' },
        role: { ru: 'Основатель и управляющий', en: 'Founder & Manager' },
        period: { ru: '2022 — 2025', en: '2022 — 2025' },
        achievements: {
            ru: [
                'Привлёк инвестиции, создал бренд и операционные процессы',
                'Руководил командой из 6 человек',
                'Устойчивая работа 2.5 года без доп. инвестиций',
            ],
            en: [
                'Raised investments, built brand & operations',
                'Led a team of 6',
                'Sustained 2.5 years without additional investment',
            ],
        },
    },
    {
        company: 'COLLIDER',
        role: { ru: 'Руководитель отдела развития', en: 'Head of Business Development' },
        period: { ru: '2019 — 2021', en: '2019 — 2021' },
        achievements: {
            ru: [
                'B2B-продажи резидентства (загрузка ≥90%)',
                '20+ мероприятий, доход >1 млн ₽',
                'Сохранил прибыльность в пандемию',
            ],
            en: [
                'B2B residency sales (occupancy ≥90%)',
                '20+ events, revenue >1M ₽',
                'Maintained profitability during pandemic',
            ],
        },
    },
    {
        company: 'CYBERX',
        role: { ru: 'Старший менеджер продаж', en: 'Senior Sales Manager' },
        period: { ru: '2018 — 2019', en: '2018 — 2019' },
        achievements: {
            ru: [
                'Построил систему продаж с нуля (конверсия 5% → 15%)',
                'Настроил AmoCRM и автоматизировал воронку',
            ],
            en: [
                'Built sales system from scratch (conversion 5% → 15%)',
                'Setup AmoCRM and automated the pipeline',
            ],
        },
    },
    {
        company: 'LifePay',
        role: { ru: 'Эксперт по развитию продаж', en: 'Sales Development Expert' },
        period: { ru: '2014 — 2017', en: '2014 — 2017' },
        achievements: {
            ru: [
                'Рост от поддержки до руководителя за 1.5 года',
                'Сформировал и обучил команду продаж',
                'Перевыполнял план (>1 млн ₽/мес)',
            ],
            en: [
                'Grew from support to team lead in 1.5 years',
                'Built and trained sales team from scratch',
                'Exceeded targets (>1M ₽/month)',
            ],
        },
    },
]

export default function ExperienceSection() {
    const { t, lang } = useLang()
    const sectionRef = useRef(null)
    const itemsRef = useRef([])

    const setItemRef = (el, i) => {
        if (el) itemsRef.current[i] = el
    }

    useEffect(() => {
        const ctx = gsap.context(() => {
            itemsRef.current.forEach((item, i) => {
                gsap.fromTo(
                    item,
                    { y: 30, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.6,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: item,
                            start: 'top 85%',
                            end: 'top 60%',
                            toggleActions: 'play none none reverse',
                        },
                    }
                )
            })
        }, sectionRef)

        return () => ctx.revert()
    }, [])

    const getVal = (field) => {
        if (typeof field === 'string') return field
        return field[lang] || field.ru
    }

    return (
        <section
            ref={sectionRef}
            id="experience"
            className="section-auto"
            style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}
        >
            <div className="section-content">
                {/* Title */}
                <h2
                    className="text-section-title"
                    style={{ marginBottom: 'var(--space-lg)' }}
                >
                    {t('experienceTitle')}
                </h2>

                {/* Timeline */}
                <div className="timeline">
                    {experience.map((exp, i) => (
                        <div
                            key={i}
                            ref={(el) => setItemRef(el, i)}
                            className="timeline-item"
                        >
                            <div className="timeline-dot" />

                            <div className="timeline-period">
                                {getVal(exp.period)}
                            </div>

                            <div className="timeline-company">
                                {getVal(exp.company)}
                            </div>

                            <div className="timeline-role">
                                {getVal(exp.role)}
                            </div>

                            <ul className="timeline-achievements">
                                {(getVal(exp.achievements) || []).map((ach, ai) => (
                                    <li key={ai}>{ach}</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
