import { useState } from 'react'
import { ChevronDown, ChevronUp, Briefcase, Code, Brain, Wrench, Users } from 'lucide-react'

const CATEGORY_ICONS = {
  ai_llm: Brain,
  frontend: Code,
  backend: Code,
  platforms: Code,
  tools: Wrench,
  business: Users
}

const CATEGORY_LABELS = {
  ai_llm: 'AI & LLM',
  frontend: 'Frontend',
  backend: 'Backend & Infrastructure',
  platforms: 'Platforms',
  tools: 'Tools',
  business: 'Business Skills'
}

function CVSection({ data }) {
  const [expandedExp, setExpandedExp] = useState(0)

  const toggleExp = (index) => {
    setExpandedExp(expandedExp === index ? -1 : index)
  }

  return (
    <div className="cv-section fade-in">
      {/* Skills Grid */}
      <section className="skills-section">
        <h2 className="section-title">
          <Brain size={24} className="title-icon" />
          Stack & Architecture
        </h2>
        <div className="skills-flow-layout">
          {/* Phase 1: Business Logic */}
          <div className="flow-group primary">
            <div className="skill-card business full-width glass-panel">
              <div className="skill-header">
                <Users size={20} className="skill-icon" />
                <h3>Phase 1: Business & Strategy</h3>
                <span className="phase-badge">INPUT</span>
              </div>
              <div className="tag-group">
                {Array.isArray(data?.stack?.business) && data.stack.business.map((skill, i) => (
                  <span key={i} className="tag">{skill}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="flow-connector vertical">
            <div className="arrow-line"></div>
            <div className="arrow-head"></div>
          </div>

          {/* Phase 2: AI Multiplier */}
          <div className="flow-group primary">
            <div className="skill-card ai_llm full-width multiplier-card glass-panel">
              <div className="skill-header">
                <Brain size={20} className="skill-icon" />
                <h3>Phase 2: AI & LLM (The Multiplier)</h3>
                <span className="phase-badge engine">ENGINE</span>
              </div>
              <p className="multiplier-info">
                Architecting with Prompt Engineering and AI Agents.
              </p>
              <div className="tag-group">
                {Array.isArray(data?.stack?.ai_llm) && data.stack.ai_llm.map((skill, i) => (
                  <span key={i} className="tag active-tag">{skill}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="flow-distribution-container">
            <div className="distribution-label">
              <span>PROMPT-DRIVEN OUTPUT</span>
            </div>
            <div className="distribution-lines">
              <div className="line l1"></div>
              <div className="line l2"></div>
              <div className="line l3"></div>
            </div>
          </div>

          {/* Phase 3: Tech Delivery */}
          <div className="skills-grid outputs">
            {data?.stack && Object.entries(data.stack)
              .filter(([cat]) => !['business', 'ai_llm'].includes(cat))
              .map(([category, skills]) => {
                const IconComponent = CATEGORY_ICONS[category] || Code
                return (
                  <div key={category} className="skill-card output-card glass-panel">
                    <div className="skill-header">
                      <IconComponent size={18} className="skill-icon" />
                      <h3>{CATEGORY_LABELS[category] || category}</h3>
                    </div>
                    <div className="tag-group">
                      {Array.isArray(skills) && skills.map((skill, i) => (
                        <span key={i} className="tag sm-tag">{skill}</span>
                      ))}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </section>

      {/* Experience */}
      <section className="experience-section">
        <h2 className="section-title">💼 Experience</h2>
        <div className="experience-list">
          {Array.isArray(data?.experience) && data.experience.map((exp, index) => (
            <div
              key={index}
              className={`experience-item glass-panel ${expandedExp === index ? 'expanded' : ''}`}
            >
              <div
                className="experience-header"
                onClick={() => toggleExp(index)}
              >
                <div className="experience-main">
                  <div className="experience-icon">
                    <Briefcase size={20} />
                  </div>
                  <div>
                    <h3 className="experience-role">{exp.role}</h3>
                    <p className="experience-company">{exp.company}</p>
                  </div>
                </div>
                <div className="experience-meta">
                  <span className="experience-period">{exp.period}</span>
                  {expandedExp === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {expandedExp === index && (
                <div className="experience-details fade-in">
                  <p className="experience-desc">{exp.description}</p>
                  <ul className="experience-achievements">
                    {Array.isArray(exp.achievements) && exp.achievements.map((ach, i) => (
                      <li key={i}>{ach}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <style>{`
        .cv-section {
          display: flex;
          flex-direction: column;
          gap: 60px;
          margin-bottom: 60px;
        }

        @media (max-width: 768px) {
          .cv-section {
            gap: 32px;
            margin-bottom: 32px;
          }
        }

        .section-title {
          font-size: 1.75rem;
          font-weight: 800;
          margin-bottom: 32px;
          color: white;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .title-icon {
          color: var(--accent);
        }

        .skill-card {
          padding: 32px;
        }

        .multiplier-card {
          border: 1px solid var(--accent) !important;
          background: var(--glass-bg) !important;
          box-shadow: 0 0 30px rgba(139, 92, 246, 0.2);
        }

        @media (max-width: 768px) {
          .multiplier-card {
            padding: 20px !important;
          }
        }

        .skill-card {
          padding: 32px;
          background: var(--glass-bg) !important;
        }

        @media (max-width: 768px) {
          .skill-card {
            padding: 20px !important;
          }
        }

        .output-card {
          background: var(--glass-bg) !important;
        }

        .multiplier-info {
          font-size: 14px;
          color: var(--text-primary);
          margin-bottom: 20px;
          opacity: 0.9;
        }

        .phase-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 100px;
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          letter-spacing: 0.05em;
        }

        .phase-badge.engine {
          background: var(--accent);
          color: white;
        }

        .flow-connector {
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 48px;
        }

        .arrow-line {
          width: 1px;
          height: 100%;
          background: linear-gradient(to bottom, transparent, var(--aurora-1));
        }

        .arrow-head {
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 8px solid var(--accent);
        }

        .flow-distribution-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin: 24px 0;
        }

        .distribution-label {
          font-size: 11px;
          font-weight: 800;
          color: white;
          background: var(--aurora-1);
          padding: 6px 16px;
          border: 1px solid var(--aurora-1);
          border-radius: 40px;
          margin-bottom: -1px;
          z-index: 10;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
        }

        .distribution-lines {
          display: flex;
          justify-content: space-around;
          width: 80%;
          height: 60px;
          border-top: 1px solid rgba(139, 92, 246, 0.2);
          border-left: 1px solid rgba(139, 92, 246, 0.2);
          border-right: 1px solid rgba(139, 92, 246, 0.2);
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
        }

        .line {
          width: 1px;
          height: 100%;
          background: rgba(139, 92, 246, 0.1);
        }

        .skills-grid.outputs {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }

        .skill-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        @media (max-width: 768px) {
          .skill-header {
            margin-bottom: 16px;
          }
        }

        .skill-header h3 {
          font-size: 16px;
          font-weight: 700;
          color: white;
        }

        .output-card .skill-icon {
          color: var(--aurora-2);
        }

        .business .skill-icon {
          color: var(--aurora-3);
        }

        .ai_llm .skill-icon {
          color: var(--aurora-2);
        }

        .tag-group {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .tag {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.3s;
        }

        .tag:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border-color: rgba(255, 255, 255, 0.2);
        }

        .active-tag {
          background: var(--accent) !important;
          color: white !important;
          border: none !important;
        }

        .experience-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .experience-item {
          padding: 0;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .experience-item.expanded {
          border-color: rgba(255, 255, 255, 0.3);
        }

        .experience-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 32px;
          cursor: pointer;
        }

        .experience-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          color: var(--accent);
          border-radius: 12px;
        }

        .experience-role {
          font-size: 17px;
          font-weight: 700;
          color: white;
        }

        .experience-company {
          font-size: 15px;
          color: var(--text-secondary);
        }

        .experience-period {
          font-size: 13px;
          font-family: var(--font-mono);
          color: var(--text-muted);
        }

        .experience-details {
          padding: 32px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .experience-desc {
          font-size: 16px;
          color: var(--text-secondary);
          margin-bottom: 24px;
        }

        .experience-achievements li {
          position: relative;
          padding-left: 28px;
          font-size: 15px;
          color: var(--text-secondary);
          margin-bottom: 12px;
        }

        .experience-achievements li::before {
          content: '→';
          position: absolute;
          left: 0;
          color: var(--accent);
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .experience-header {
            padding: 20px;
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          .experience-meta {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  )
}

export default CVSection
