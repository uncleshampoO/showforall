import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLang } from '../contexts/LanguageContext'

gsap.registerPlugin(ScrollTrigger)

const proofItems = {
    ru: [
        { metric: '5', label: 'публичных проектов запущено' },
        { metric: '30+', label: 'дней непрерывного вайбкодинга' },
        { metric: '3', label: 'продукта в продакшне' },
        { metric: '10', label: 'AI-агентов создано' },
        { metric: '50+', label: 'компонентов React' },
        { metric: '∞', label: 'часов промпт-инжиниринга' },
    ],
    en: [
        { metric: '5', label: 'public projects launched' },
        { metric: '30+', label: 'days of continuous vibecoding' },
        { metric: '3', label: 'products in production' },
        { metric: '10', label: 'AI agents created' },
        { metric: '50+', label: 'React components' },
        { metric: '∞', label: 'hours of prompt engineering' },
    ],
}

const highlights = {
    ru: [
        'Vibo Shark CRM: полный цикл от идеи до деплоя — AI Sales OS с пайплайном, генерацией КП и Shark Advisor',
        'Vibo Academy: адаптивное обучение с AI-роадмапами, Spaced Repetition и оплатой через Telegram Stars',
        'Agents Framework: DO-паттерн оркестрации AI-агентов — от Filesystem Hygiene до Proposal Generator',
        'Antigravity Starter Pack: pre-configured среда с обучением, агентами и 10-Phase методологией',
        'Интерактивное портфолио: scrollytelling с GSAP, AI HR Assistant и переключателем языков',
    ],
    en: [
        'Vibo Shark CRM: full cycle from idea to deploy — AI Sales OS with pipeline, proposal gen & Shark Advisor',
        'Vibo Academy: adaptive learning with AI roadmaps, Spaced Repetition & Telegram Stars payments',
        'Agents Framework: DO-pattern for AI agent orchestration — from Filesystem Hygiene to Proposal Generator',
        'Antigravity Starter Pack: pre-configured env with training, agents & 10-Phase methodology',
        'Interactive portfolio: scrollytelling with GSAP, AI HR Assistant & language toggle',
    ],
}

export default function ProofOfWork() {
    const { t, lang } = useLang()
    const sectionRef = useRef(null)
    const itemsRef = useRef([])

    const setItemRef = (el, i) => {
        if (el) itemsRef.current[i] = el
    }

    useEffect(() => {
        const ctx = gsap.context(() => {
            itemsRef.current.forEach((item) => {
                gsap.fromTo(
                    item,
                    { y: 20, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.5,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: item,
                            start: 'top 90%',
                            toggleActions: 'play none none reverse',
                        },
                    }
                )
            })
        }, sectionRef)

        return () => ctx.revert()
    }, [])

    const items = proofItems[lang] || proofItems.ru
    const hlItems = highlights[lang] || highlights.ru

    return (
        <section
            ref={sectionRef}
            id="proof"
            className="section-auto"
            style={{ paddingTop: 'var(--space-section)', paddingBottom: 'var(--space-section)' }}
        >
            <div className="section-content">
                <h2
                    className="text-section-title"
                    style={{ marginBottom: 'var(--space-xs)' }}
                >
                    {t('proofTitle')}
                </h2>
                <p
                    className="text-muted"
                    style={{
                        fontSize: 'var(--fs-body-lg)',
                        marginBottom: 'var(--space-lg)',
                    }}
                >
                    {t('proofSubtitle')}
                </p>

                {/* Metrics Grid */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: 'var(--space-md)',
                        marginBottom: 'var(--space-lg)',
                    }}
                >
                    {items.map((item, i) => (
                        <div
                            key={i}
                            ref={(el) => setItemRef(el, i)}
                            style={{
                                padding: 'var(--space-md)',
                                border: '1px solid var(--color-border)',
                            }}
                        >
                            <div
                                style={{
                                    fontFamily: 'var(--font-display)',
                                    fontSize: 'var(--fs-statement)',
                                    fontWeight: 900,
                                    lineHeight: 1,
                                    marginBottom: 'var(--space-xs)',
                                }}
                            >
                                {item.metric}
                            </div>
                            <div
                                style={{
                                    fontSize: 'var(--fs-small)',
                                    color: 'var(--color-muted)',
                                }}
                            >
                                {item.label}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Highlights */}
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-md)' }}>
                    <h3
                        style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 'var(--fs-body-lg)',
                            fontWeight: 700,
                            marginBottom: 'var(--space-md)',
                        }}
                    >
                        {lang === 'ru' ? 'Ключевые достижения' : 'Key Achievements'}
                    </h3>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {hlItems.map((hl, i) => (
                            <li
                                key={i}
                                style={{
                                    fontSize: 'var(--fs-body)',
                                    color: 'var(--color-muted)',
                                    paddingLeft: '20px',
                                    position: 'relative',
                                }}
                            >
                                <span
                                    style={{
                                        position: 'absolute',
                                        left: 0,
                                        color: 'var(--color-fg)',
                                    }}
                                >
                                    →
                                </span>
                                {hl}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </section>
    )
}
