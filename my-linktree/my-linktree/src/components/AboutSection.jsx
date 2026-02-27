import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLang } from '../contexts/LanguageContext'

gsap.registerPlugin(ScrollTrigger)

export default function AboutSection() {
    const { t } = useLang()
    const sectionRef = useRef(null)
    const linesRef = useRef([])

    const setLineRef = (el, i) => {
        if (el) linesRef.current[i] = el
    }

    useEffect(() => {
        const ctx = gsap.context(() => {
            linesRef.current.forEach((line, i) => {
                gsap.fromTo(
                    line,
                    { y: 40, opacity: 0 },
                    {
                        y: 0,
                        opacity: 1,
                        duration: 0.8,
                        ease: 'power3.out',
                        scrollTrigger: {
                            trigger: line,
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

    const lines = [
        t('aboutLine1'),
        t('aboutLine2'),
        t('aboutLine3'),
        t('aboutLine4'),
        t('aboutLine5'),
    ]

    return (
        <section
            ref={sectionRef}
            id="about"
            className="section"
            style={{ flexDirection: 'column', justifyContent: 'center' }}
        >
            <div className="section-content">
                {lines.map((line, i) => (
                    <p
                        key={i}
                        ref={(el) => setLineRef(el, i)}
                        className="text-statement"
                        style={{
                            color: i === 1 ? 'var(--color-fg)' : 'var(--color-muted)',
                            fontWeight: i === 1 ? 700 : 500,
                            marginBottom: i === 1 ? 'var(--space-lg)' : 'var(--space-md)',
                            maxWidth: '900px',
                        }}
                    >
                        {line}
                    </p>
                ))}
            </div>
        </section>
    )
}
