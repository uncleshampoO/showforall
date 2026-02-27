import { useState, useEffect } from 'react'
import { inject } from '@vercel/analytics'
import LiquidBackground from './components/LiquidBackground'
import Header from './components/Header'
import CVSection from './components/CVSection'
import ProjectsSection from './components/ProjectsSection'
import ReportsSection from './components/ReportsSection'
import AIChat from './components/AIChat'
import WelcomeModal from './components/WelcomeModal'
import ErrorBoundary from './components/ErrorBoundary'
import cvData from './data/cv.json'
import projectsData from './data/projects.json'

// Vercel Analytics
inject()

export default function App() {
  const [activeTab, setActiveTab] = useState('cv')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Show welcome modal once on first visit
  useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisitedV2')
    if (!hasVisited) {
      const timer = setTimeout(() => {
        setIsModalOpen(true)
        localStorage.setItem('hasVisitedV2', 'true')
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const renderContent = () => {
    switch (activeTab) {
      case 'cv':
        return <CVSection data={cvData} />
      case 'projects':
        return <ProjectsSection projects={projectsData} onNavigate={setActiveTab} />
      case 'chat':
        return <AIChat />
      case 'proof':
        return <ReportsSection />
      default:
        return <CVSection data={cvData} />
    }
  }

  return (
    <ErrorBoundary>
      <div className="app">
        <LiquidBackground />

        <Header
          data={cvData}
          onInfoClick={() => setIsModalOpen(true)}
        />

        <main className="container">
          <nav className="nav-tabs">
            <button
              onClick={() => setActiveTab('cv')}
              className={`nav-tab ${activeTab === 'cv' ? 'active' : ''}`}
            >
              CV
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`nav-tab ${activeTab === 'projects' ? 'active' : ''}`}
            >
              Projects
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`nav-tab ${activeTab === 'chat' ? 'active' : ''}`}
            >
              AI Assistant
            </button>
            <button
              onClick={() => setActiveTab('proof')}
              className={`nav-tab ${activeTab === 'proof' ? 'active' : ''}`}
            >
              Proof of Work
            </button>
          </nav>

          <div className="content-area fade-in">
            {renderContent()}
          </div>
        </main>

        <footer className="footer">
          <p className="text-muted">
            © {new Date().getFullYear()} Виталий Бондарев. Built with React & AI.
          </p>
        </footer>

        <WelcomeModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    </ErrorBoundary>
  )
}
