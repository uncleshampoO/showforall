import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const sections = [
    { id: 'hero', label: 'Hero' },
    { id: 'about', label: 'About' },
    { id: 'projects', label: 'Projects' },
    { id: 'experience', label: 'Experience' },
    { id: 'stack', label: 'Stack' },
    { id: 'proof', label: 'Proof' },
    { id: 'chat', label: 'Chat' },
    { id: 'contact', label: 'Contact' },
]

export default function NavDots() {
    const [active, setActive] = useState(0)
    const dotsRef = useRef(null)

    useEffect(() => {
        const triggers = []

        sections.forEach((section, i) => {
            const el = document.getElementById(section.id)
            if (!el) return

            const trigger = ScrollTrigger.create({
                trigger: el,
                start: 'top center',
                end: 'bottom center',
                onEnter: () => setActive(i),
                onEnterBack: () => setActive(i),
            })

            triggers.push(trigger)
        })

        return () => {
            triggers.forEach((t) => t.kill())
        }
    }, [])

    const scrollTo = (id) => {
        const el = document.getElementById(id)
        if (el) {
            gsap.to(window, {
                scrollTo: { y: el, offsetY: 0 },
                duration: 1,
                ease: 'power3.inOut',
            })
        }
    }

    return (
        <nav className="nav-dots" ref={dotsRef} aria-label="Page navigation">
            {sections.map((section, i) => (
                <button
                    key={section.id}
                    className={`nav-dot ${i === active ? 'nav-dot--active' : ''}`}
                    onClick={() => scrollTo(section.id)}
                    aria-label={section.label}
                    title={section.label}
                />
            ))}
        </nav>
    )
}
