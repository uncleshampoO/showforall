import { Mail, MapPin, Send, Linkedin, Info } from 'lucide-react'

function Header({ data, onInfoClick }) {
  return (
    <header className="header fade-in">
      <div className="container">
        <div className="header-glass glass-panel">
          <div className="header-content">
            <div className="header-main">
              <h1 className="header-name">{data.name}</h1>
              <p className="header-title">{data.title}</p>
            </div>

            <button onClick={onInfoClick} className="info-button" title="About site">
              <Info size={20} />
            </button>

            <div className="header-contacts">
              <a href={`mailto:${data.email}`} className="contact-link">
                <Mail size={16} />
                <span>{data.email}</span>
              </a>
              <a href={`https://t.me/${(data.telegram || '').replace('@', '')}`} className="contact-link" target="_blank" rel="noopener">
                <Send size={16} />
                <span>{data.telegram}</span>
              </a>
              <div className="contact-link">
                <MapPin size={16} />
                <span>{data.location}</span>
              </div>
              {data.linkedin && (
                <a href={data.linkedin} className="contact-link" target="_blank" rel="noopener">
                  <Linkedin size={16} />
                  <span>LinkedIn</span>
                </a>
              )}
            </div>
          </div>

          <p className="header-summary">{data.summary}</p>
        </div>
      </div>

      <style>{`
        .header {
          padding-top: 40px;
          margin-bottom: 20px;
          width: 100%;
        }

        @media (max-width: 768px) {
          .header {
            padding-top: 20px;
            margin-bottom: 12px;
          }
        }

        .header-glass {
          padding: 40px;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 24px;
        }

        .header-name {
          font-size: 2.5rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .header-title {
          font-size: 1.25rem;
          color: var(--accent);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .header-contacts {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
        }

        @media (max-width: 768px) {
          .header-contacts {
            gap: 10px;
          }
        }

        .contact-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: var(--text-secondary);
          text-decoration: none;
          transition: all 0.3s;
          background: rgba(255, 255, 255, 0.05);
          padding: 8px 16px;
          border-radius: 100px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .contact-link:hover {
          color: white;
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .header-summary {
          margin-top: 32px;
          font-size: 16px;
          line-height: 1.8;
          color: var(--text-secondary);
          max-width: 850px;
          font-weight: 400;
        }

        @media (max-width: 768px) {
          .header-summary {
            margin-top: 16px;
            font-size: 14px;
            line-height: 1.6;
          }
        }

        .info-button {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
          padding: 10px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .info-button:hover {
          background: white;
          color: black;
          transform: rotate(90deg);
        }

        @media (max-width: 768px) {
          .header-glass {
            padding: 24px;
          }
          .header-name {
            font-size: 1.8rem;
          }
          .header-content {
            flex-direction: column;
          }
        }
      `}</style>
    </header>
  )
}

export default Header
