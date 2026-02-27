import { useLang } from '../contexts/LanguageContext'

export default function LanguageToggle() {
    const { lang, toggleLang } = useLang()

    return (
        <div className="lang-toggle" role="radiogroup" aria-label="Language">
            <button
                className={`lang-toggle__btn ${lang === 'ru' ? 'lang-toggle__btn--active' : ''}`}
                onClick={lang !== 'ru' ? toggleLang : undefined}
                role="radio"
                aria-checked={lang === 'ru'}
            >
                RU
            </button>
            <button
                className={`lang-toggle__btn ${lang === 'en' ? 'lang-toggle__btn--active' : ''}`}
                onClick={lang !== 'en' ? toggleLang : undefined}
                role="radio"
                aria-checked={lang === 'en'}
            >
                EN
            </button>
        </div>
    )
}
