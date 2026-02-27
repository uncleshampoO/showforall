import { X, Info } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function WelcomeModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <>
      <div className="modal-overlay fade-in" onClick={onClose}></div>
      <div className="modal-container glass-panel">
        <div className="modal-header">
          <h2>🤖 AI-Powered Портфолио</h2>
          <button onClick={onClose} className="modal-close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p className="intro-text">
            Этот сайт — <strong>живая RAG-система</strong>, которая автоматически обновляется на основе моей активности в разработке.
          </p>

          <div className="section-explanation">
            <h3>📊 Архитектура и Стек</h3>
            <p>
              Автоматически собирается из проектов:
            </p>
            <ul>
              <li><strong>Языки</strong> — Сканируются из файлов (.js, .py, .tsx и др.)</li>
              <li><strong>Технологии</strong> — Парсятся из <code>package.json</code> и конфигов</li>
              <li><strong>Сервисы</strong> — Анализируются из <code>Credentials.env</code> (Supabase, Gemini, Vercel)</li>
            </ul>
          </div>

          <div className="section-explanation">
            <h3>🚀 Проекты</h3>
            <p>
              Обновления в реальном времени с живыми демо и деталями стека.
            </p>
          </div>

          <div className="section-explanation">
            <h3>🤖 AI HR-Ассистент</h3>
            <p>
              Глубокий поиск по истории задач для подтверждения опыта реальными примерами.
            </p>
          </div>

          <div className="section-explanation">
            <h3>🏆 Proof of Work</h3>
            <p>
              Ежемесячные отчеты об активности в IDE, точках трения и планах роста.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-primary">
            Понятно, спасибо!
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          z-index: 1000;
          animation: fadeIn 0.3s ease-out forwards;
        }

        .modal-container {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          max-width: 650px;
          max-height: 85vh;
          width: 90%;
          z-index: 1001;
          display: flex;
          flex-direction: column;
          padding: 0;
          animation: modalFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -48%) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 32px 40px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
          color: white;
          font-weight: 800;
        }

        .modal-close {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          cursor: pointer;
          color: white;
          padding: 8px;
          border-radius: 12px;
          transition: all 0.3s;
        }

        .modal-close:hover {
          background: white;
          color: black;
          transform: rotate(90deg);
        }

        .modal-body {
          padding: 40px;
          overflow-y: auto;
          flex: 1;
        }

        .intro-text {
          font-size: 1.1rem;
          line-height: 1.7;
          margin-bottom: 32px;
          color: var(--text-secondary);
        }

        .section-explanation {
          margin-bottom: 24px;
          padding: 24px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .section-explanation h3 {
          margin: 0 0 12px 0;
          font-size: 1.1rem;
          color: white;
          font-weight: 700;
        }

        .section-explanation p {
          margin: 8px 0;
          font-size: 15px;
          line-height: 1.6;
          color: var(--text-secondary);
        }

        .section-explanation ul {
          margin: 12px 0;
          padding-left: 20px;
        }

        .section-explanation li {
          margin: 8px 0;
          font-size: 14px;
          color: var(--text-muted);
        }

        .section-explanation code {
          background: rgba(255, 77, 0, 0.1);
          padding: 2px 6px;
          border-radius: 4px;
          font-family: var(--font-mono);
          font-size: 0.9em;
          color: var(--accent);
        }

        .modal-footer {
          padding: 24px 40px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          justify-content: flex-end;
        }

        @media (max-width: 768px) {
          .modal-header, .modal-body, .modal-footer {
            padding: 24px;
          }
          .modal-header h2 {
            font-size: 1.2rem;
          }
        }
      `}</style>
    </>
  )
}
