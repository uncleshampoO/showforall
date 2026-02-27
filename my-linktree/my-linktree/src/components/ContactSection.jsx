import { useLang } from '../contexts/LanguageContext'

export default function ContactSection() {
    const { t } = useLang()

    const contactLines = t('contactTitle').split('\n')

    return (
        <section
            id="contact"
            className="section"
            style={{
                flexDirection: 'column',
                justifyContent: 'center',
            }}
        >
            <div className="section-content">
                <h2 className="text-section-title" style={{ marginBottom: 'var(--space-md)' }}>
                    {contactLines.map((line, i) => (
                        <span key={i} style={{ display: 'block' }}>
                            {line}
                        </span>
                    ))}
                </h2>

                <div className="contact-links">
                    <a
                        href="mailto:v9253696275@gmail.com"
                        className="contact-link"
                    >
                        {t('contactEmail')}
                    </a>
                    <a
                        href="https://t.me/bondarev_vi"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="contact-link"
                    >
                        {t('contactTelegram')}
                    </a>
                    <a
                        href="https://linkedin.com/in/bondarev-vi"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="contact-link"
                    >
                        {t('contactLinkedin')}
                    </a>
                </div>
            </div>
        </section>
    )
}
