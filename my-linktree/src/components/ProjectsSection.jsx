import { useState } from 'react'
import { ExternalLink, Info, X, Rocket, Code2 } from 'lucide-react'

function ProjectsSection({ projects, onNavigate }) {
  const [selectedProject, setSelectedProject] = useState(null)

  const getStatusBadge = (status) => {
    const styles = {
      active: { bg: 'rgba(22, 101, 52, 0.2)', color: '#4ade80', label: 'Active' },
      development: { bg: 'rgba(146, 64, 14, 0.2)', color: '#fbbf24', label: 'In Dev' },
      archived: { bg: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af', label: 'Archived' }
    }
    const s = styles[status] || styles.development
    return <span className="status-badge" style={{ background: s.bg, color: s.color }}>{s.label}</span>
  }

  const handleDemoClick = (project, e) => {
    if (project.id === 'interactive-cv' && onNavigate) {
      e.preventDefault()
      onNavigate('ai')
    }
  }

  return (
    <div className="projects-section fade-in">
      <h2 className="section-title">🚀 Featured Projects</h2>

      <div className="projects-grid">
        {Array.isArray(projects) && projects.map((project) => (
          <div key={project.id} className="project-card glass-panel">
            <div className="project-header">
              <div className="project-icon">
                <Rocket size={24} />
              </div>
              <div className="project-info">
                <h3 className="project-name">{project.name}</h3>
                <p className="project-tagline">{project.tagline}</p>
              </div>
            </div>

            <div className="card-meta">
              {getStatusBadge(project.status)}
              <div className="project-stack">
                {Array.isArray(project.stack) && project.stack.slice(0, 3).map((tech, i) => (
                  <span key={i} className="stack-tag">{tech}</span>
                ))}
              </div>
            </div>

            <div className="project-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedProject(project)}
              >
                <Info size={16} />
                Details
              </button>
              {project.demoUrl && (
                <a
                  href={project.id === 'interactive-cv' ? '#' : project.demoUrl}
                  className="btn btn-primary"
                  target={project.id === 'interactive-cv' ? '_self' : '_blank'}
                  rel="noopener"
                  onClick={(e) => handleDemoClick(project, e)}
                >
                  <ExternalLink size={16} />
                  Demo
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedProject && (
        <div className="modal-overlay fade-in" onClick={() => setSelectedProject(null)}>
          <div className="modal glass-panel" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedProject(null)}>
              <X size={24} />
            </button>

            <div className="modal-header">
              <div className="modal-icon">
                <Code2 size={32} />
              </div>
              <div>
                <h2>{selectedProject.name}</h2>
                <p>{selectedProject.tagline}</p>
              </div>
            </div>

            <p className="modal-description">{selectedProject.description}</p>

            <div className="modal-section">
              <h4>🛠 Stack</h4>
              <div className="tag-group">
                {Array.isArray(selectedProject.stack) && selectedProject.stack.map((tech, i) => (
                  <span key={i} className="tag">{tech}</span>
                ))}
              </div>
            </div>

            <div className="modal-section">
              <h4>✨ Features</h4>
              <ul className="features-list">
                {Array.isArray(selectedProject.features) && selectedProject.features.map((feature, i) => (
                  <li key={i}>{feature}</li>
                ))}
              </ul>
            </div>

            <div className="modal-actions">
              {selectedProject.demoUrl && (
                <a href={selectedProject.demoUrl} className="btn btn-primary" target="_blank">
                  <ExternalLink size={16} />
                  Try it out
                </a>
              )}
              {selectedProject.repoUrl && (
                <a href={selectedProject.repoUrl} className="btn btn-secondary" target="_blank">
                  <Code2 size={16} />
                  GitHub
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .projects-section {
          width: 100%;
          margin-bottom: 60px;
        }

        .section-title {
          font-size: 1.75rem;
          font-weight: 800;
          margin-bottom: 32px;
          color: white;
          text-align: center;
        }

        .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 24px;
        }

        .project-card {
          display: flex;
          flex-direction: column;
          gap: 24px;
          padding: 32px;
        }

        .project-header {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .project-icon {
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          color: var(--accent);
          border-radius: 16px;
          flex-shrink: 0;
        }

        .project-name {
          font-size: 18px;
          font-weight: 700;
          color: white;
          margin-bottom: 4px;
        }

        .project-tagline {
          font-size: 14px;
          color: var(--text-secondary);
        }

        .card-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .status-badge {
          padding: 4px 12px;
          font-size: 11px;
          font-weight: 700;
          border-radius: 100px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .project-stack {
          display: flex;
          gap: 8px;
        }

        .stack-tag {
          font-size: 11px;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.03);
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .project-actions {
          display: flex;
          gap: 12px;
          margin-top: auto;
        }

        .project-actions .btn {
          flex: 1;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          z-index: 1000;
        }

        .modal {
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          padding: 48px;
        }

        .modal-close {
          position: absolute;
          top: 24px;
          right: 24px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          cursor: pointer;
          padding: 8px;
          border-radius: 12px;
          transition: all 0.3s;
        }

        .modal-close:hover {
          background: white;
          color: black;
          transform: rotate(90deg);
        }

        .modal-header {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 32px;
        }

        .modal-icon {
          width: 72px;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent);
          color: white;
          border-radius: 20px;
          box-shadow: 0 4px 20px var(--accent-glow);
        }

        .modal-header h2 {
          font-size: 24px;
          font-weight: 800;
          color: white;
        }

        .modal-description {
          font-size: 16px;
          line-height: 1.8;
          color: var(--text-secondary);
          margin-bottom: 32px;
        }

        .modal-section {
          margin-bottom: 32px;
        }

        .modal-section h4 {
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--accent);
          margin-bottom: 16px;
        }

        .features-list {
          list-style: none;
        }

        .features-list li {
          position: relative;
          padding-left: 28px;
          margin-bottom: 12px;
          font-size: 15px;
          color: var(--text-secondary);
        }

        .features-list li::before {
          content: '→';
          position: absolute;
          left: 0;
          color: var(--accent);
        }

        .modal-actions {
          display: flex;
          gap: 16px;
        }

        @media (max-width: 600px) {
          .modal {
            padding: 32px 24px;
          }
          .modal-header {
            flex-direction: column;
            text-align: center;
          }
          .modal-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  )
}

export default ProjectsSection
