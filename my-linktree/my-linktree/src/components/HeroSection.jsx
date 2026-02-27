import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { useLang } from '../contexts/LanguageContext'

export default function HeroSection() {
    const { t } = useLang()
    const sectionRef = useRef(null)
    const nameRef = useRef(null)
    const titleRef = useRef(null)
    const statementRef = useRef(null)
    const maskRef = useRef(null)
    const scrollRef = useRef(null)

    useEffect(() => {
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

            // Mask slides in
            tl.fromTo(
                maskRef.current,
                { clipPath: 'polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)' },
                { clipPath: 'polygon(15% 0%, 100% 0%, 100% 100%, 0% 100%)', duration: 1.2 },
                0
            )

            // Name reveals
            tl.fromTo(
                nameRef.current,
                { y: 80, opacity: 0 },
                { y: 0, opacity: 1, duration: 1 },
                0.4
            )

            // Title
            tl.fromTo(
                titleRef.current,
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.8 },
                0.8
            )

            // Statement
            tl.fromTo(
                statementRef.current,
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.8 },
                1.0
            )

            // Scroll indicator
            tl.fromTo(
                scrollRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.6 },
                1.4
            )
        }, sectionRef)

        return () => ctx.revert()
    }, [])

    // Split name into lines for rendering
    const nameLines = t('heroName').split('\n')

    return (
        <section
            ref={sectionRef}
            id="hero"
            className="section"
            style={{
                position: 'relative',
                overflow: 'hidden',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'flex-start',
            }}
        >
            {/* Geometric Mask */}
            <div
                ref={maskRef}
                className="geo-mask"
                aria-hidden="true"
            />

            {/* Content */}
            <div className="section-content" style={{ position: 'relative', zIndex: 2 }}>
                {/* Name */}
                <h1
                    ref={nameRef}
                    className="text-hero"
                    style={{ marginBottom: 'var(--space-md)' }}
                >
                    {nameLines.map((line, i) => (
                        <span key={i} style={{ display: 'block' }}>
                            {line}
                        </span>
                    ))}
                </h1>

                {/* Title */}
                <p
                    ref={titleRef}
                    style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 'var(--fs-body-lg)',
                        color: 'var(--color-muted)',
                        letterSpacing: '0.05em',
                        marginBottom: 'var(--space-lg)',
                    }}
                >
                    {t('heroTitle')}
                </p>

                {/* Statement */}
                <p
                    ref={statementRef}
                    className="text-statement"
                    style={{ color: 'var(--color-fg)', maxWidth: '600px' }}
                >
                    {t('heroStatement').split('\n').map((line, i) => (
                        <span key={i} style={{ display: 'block' }}>
                            {line}
                        </span>
                    ))}
                </p>
            </div>

            {/* Scroll Indicator */}
            <div ref={scrollRef} className="scroll-indicator">
                <span>{t('scrollHint')}</span>
                <div className="scroll-indicator__line" />
            </div>
        </section>
    )
}
