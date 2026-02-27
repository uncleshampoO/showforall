import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLang } from '../contexts/LanguageContext'

gsap.registerPlugin(ScrollTrigger)

const projects = [
    {
        num: '01',
        nameKey: 'project1Name',
        tagKey: 'project1Tag',
        descKey: 'project1Desc',
        featuresKey: 'project1Features',
        demoUrl: 'https://vibo-shark.vercel.app/#/?demo=true',
        stack: ['React', 'TypeScript', 'Supabase', 'Gemini AI'],
    },
    {
        num: '02',
        nameKey: 'project2Name',
        tagKey: 'project2Tag',
        descKey: 'project2Desc',
        featuresKey: 'project2Features',
        demoUrl: 'https://t.me/ViboAcademy_bot',
        stack: ['React', 'Vite', 'Supabase', 'Telegram Stars'],
    },
    {
        num: '03',
        nameKey: 'project3Name',
        tagKey: 'project3Tag',
        descKey: 'project3Desc',
        featuresKey: 'project3Features',
        demoUrl: null,
        stack: ['Python', 'Gemini API', 'Markdown', 'VS Code'],
    },
]

export default function ProjectsScroll() {
    const { t } = useLang()
    const containerRef = useRef(null)
    const trackRef = useRef(null)
    const titleRef = useRef(null)

    useEffect(() => {
        const ctx = gsap.context(() => {
            const track = trackRef.current
            const panels = track.querySelectorAll('.h-scroll-panel')
            const totalWidth = track.scrollWidth - window.innerWidth

            // Pin and horizontal scroll
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

            // Animate each panel content on enter
            panels.forEach((panel) => {
                const content = panel.querySelector('.project-panel')
                if (content) {
                    gsap.fromTo(
                        content.children,
                        { y: 40, opacity: 0 },
                        {
                            y: 0,
                            opacity: 1,
                            stagger: 0.1,
                            duration: 0.6,
                            ease: 'power3.out',
                            scrollTrigger: {
                                trigger: panel,
                                containerAnimation: gsap.getById?.('projectsScroll'),
                                start: 'left 80%',
                                end: 'left 50%',
                                toggleActions: 'play none none reverse',
                            },
                        }
                    )
                }
            })
        }, containerRef)

        return () => ctx.revert()
    }, [])

    return (
        <section ref={containerRef} id="projects" className="h-scroll-container">
            {/* Section Title Overlay */}
            <div
                ref={titleRef}
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
                    {t('projectsTitle')}
                </span>
            </div>

            <div ref={trackRef} className="h-scroll-track">
                {projects.map((project, i) => (
                    <div key={project.num} className="h-scroll-panel">
                        <div className="project-panel">
                            <div className="project-panel__number">
                                {project.num} / 0{projects.length}
                            </div>

                            <h2 className="project-panel__name text-section-title">
                                {t(project.nameKey)}
                            </h2>

                            <div className="project-panel__tag">
                                {t(project.tagKey)}
                            </div>

                            <p className="project-panel__desc text-body-lg">
                                {t(project.descKey)}
                            </p>

                            <ul className="project-panel__features">
                                {(t(project.featuresKey) || []).map((feature, fi) => (
                                    <li key={fi}>
                                        <span className="tag">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {/* Stack */}
                            <div style={{ marginTop: 'var(--space-md)' }}>
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: '8px',
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    {project.stack.map((tech) => (
                                        <span key={tech} className="tag tag--accent">
                                            {tech}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Demo Link */}
                            {project.demoUrl && (
                                <a
                                    href={project.demoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="contact-link"
                                    style={{
                                        marginTop: 'var(--space-md)',
                                        display: 'inline-block',
                                        fontSize: 'var(--fs-body)',
                                    }}
                                >
                                    Demo →
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}
