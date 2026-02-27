import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLang } from '../contexts/LanguageContext'

gsap.registerPlugin(ScrollTrigger)

// Stack data organized into 3 phases
const stackData = [
    {
        titleKey: 'stackPhase1',
        tagKey: 'stackPhase1Tag',
        description: {
            ru: 'Софт-скиллы и бизнес-экспертиза, сформированные за 7+ лет.',
            en: 'Soft skills and business expertise built over 7+ years.',
        },
        skills: [
            'B2B Sales', 'Customer Development', 'Process Automation',
            'Sales Management', 'Team Leadership', 'Product Management',
            'UX Research', 'Backlog Management', 'Roadmap',
            'Scrum', 'Financial Analysis',
        ],
    },
    {
        titleKey: 'stackPhase2',
        tagKey: 'stackPhase2Tag',
        description: {
            ru: 'Архитектура и инструменты для создания AI-решений.',
            en: 'Architecture and tools for building AI solutions.',
        },
        skills: [
            'Google Gemini API', 'LLM Architecture', 'Prompt Engineering',
            'RAG Concepts', 'System Prompt Design', 'Multi-Agent Systems',
            'Function Calling', 'AI Sales Automation',
        ],
    },
    {
        titleKey: 'stackPhase3',
        tagKey: 'stackPhase3Tag',
        description: {
            ru: 'Полный стек для создания продуктов.',
            en: 'Full stack for building products.',
        },
        skills: [
            'React', 'TypeScript', 'Vite', 'Next.js',
            'Tailwind CSS', 'Node.js', 'REST API',
            'Supabase (PostgreSQL)', 'Edge Functions',
            'Vercel CI/CD', 'Telegram Mini Apps',
            'Telegram Payments (Stars)', 'Git / GitHub',
        ],
    },
]

export default function StackSection() {
    const { t, lang } = useLang()
    const containerRef = useRef(null)
    const trackRef = useRef(null)

    useEffect(() => {
        const ctx = gsap.context(() => {
            const track = trackRef.current
            const totalWidth = track.scrollWidth - window.innerWidth

            gsap.to(track, {
                x: -totalWidth,
                ease: 'none',
                scrollTrigger: {
                    trigger: containerRef.current,
                    start: 'top top',
                    end: () => `+=${totalWidth}`,
                    pin: true,
                    scrub: 1,
                    anticipatePin: 1,
                    invalidateOnRefresh: true,
                },
            })
        }, containerRef)

        return () => ctx.revert()
    }, [])

    return (
        <section ref={containerRef} id="stack" className="h-scroll-container">
            {/* Section label */}
            <div
                style={{
                    position: 'absolute',
                    top: 'var(--space-lg)',
                    left: 'var(--content-padding)',
                    zIndex: 5,
                    pointerEvents: 'none',
                }}
            >
                <span
                    style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'var(--fs-small)',
                        fontWeight: 600,
                        color: 'var(--color-dim)',
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                    }}
                >
                    {t('stackTitle')}
                </span>
            </div>

            <div ref={trackRef} className="h-scroll-track">
                {stackData.map((phase, i) => (
                    <div key={i} className="h-scroll-panel">
                        <div className="stack-phase">
                            <div className="stack-phase__header">
                                <h2 className="stack-phase__title">
                                    {t(phase.titleKey)}
                                </h2>
                                <span className="stack-phase__badge">
                                    {t(phase.tagKey)}
                                </span>
                            </div>

                            <p
                                className="text-body-lg"
                                style={{ marginBottom: 'var(--space-lg)', maxWidth: '500px' }}
                            >
                                {phase.description[lang] || phase.description.ru}
                            </p>

                            <div className="stack-phase__tags">
                                {phase.skills.map((skill) => (
                                    <span key={skill} className="tag">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}
