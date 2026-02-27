import { useState } from 'react'
import { Send, Bot, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'

// Fetch and parse resume HTML
async function fetchResumeText() {
  try {
    const response = await fetch('/resume_bondarev.html');
    const html = await response.text();

    // Parse HTML to extract text
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract all text content
    const fullText = doc.body.textContent || '';

    return {
      fullText: fullText.toLowerCase(),
      rawHtml: html
    };
  } catch (error) {
    console.error('Failed to fetch resume:', error);
    return null;
  }
}

// Enhanced matching algorithm using real resume text
async function analyzeVacancy(vacancy) {
  const vacancyLower = vacancy.toLowerCase();

  // Fetch full resume text
  const resume = await fetchResumeText();
  if (!resume) {
    return {
      matchScore: 0,
      matchingSkills: [],
      gaps: [],
      recommendation: 'Ошибка загрузки резюме. Обновите страницу и попробуйте снова.'
    };
  }

  const { fullText } = resume;

  // 1. Keyword Matching Patterns (regex for flexible matching)
  const keywordPatterns = {
    // Management & Leadership  
    'team management': /управлени[ея]\s+(командой|командами|отдел)|team\s+lead|руковод|лидерство/gi,
    'project management': /управлени[ея]\s+проект|project\s+manager|менеджер\s+проектов|product\s+owner/gi,
    'people management': /управлени[ея]\s+людьми|развити[ея]\s+команд|обучени[ея]\s+(команд|сотрудников|персонала)/gi,

    // Planning & Process
    'planning': /планировани[ея]|roadmap|стратеги[ия]/gi,
    'prioritization': /приоритиз|backlog/gi,
    'development process': /процесс\s+разработки|sdlc|agile|scrum/gi,
    'quality assurance': /qa|качеств|control/gi,

    // Business Skills
    'b2b sales': /b2b|продаж[аиы]|коммерческ|sales/gi,
    'crm': /crm|amocrm|zoho|salesforce/gi,
    'automation': /автоматизаци|оптимизаци|automation/gi,

    // Product & Tech
    'product management': /product\s+(management|owner)|продуктов|custdev/gi,
    'ai development': /ai|gemini|llm|prompt\s+engineering|rag/gi,
    'frontend': /react|typescript|frontend|ui/gi,
    'backend': /backend|api|supabase|rest/gi,

    // Soft Skills
    'communication': /коммуникаци|презентаци|переговоры/gi,
    'analytical': /анализ|аналитик/gi,
    'collaboration': /кросс-функциональн|cross-functional/gi
  };

  // 2. Find matches
  const matches = [];
  const matchDetails = {};

  Object.entries(keywordPatterns).forEach(([skill, pattern]) => {
    // Check if vacancy requires this skill
    const vacancyRequires = vacancyLower.includes(skill.replace(/\s+/g, ' ')) || pattern.test(vacancy);

    if (vacancyRequires) {
      // Check if we have this in resume
      if (pattern.test(fullText)) {
        matches.push(skill);
        matchDetails[skill] = true;
      }
    }
  });

  // 3. Extract years of experience
  const yearsMatch = fullText.match(/более\s+(\d+)\s+лет/i) || fullText.match(/(\d+)\+?\s+лет/i);
  const yearsOfExperience = yearsMatch ? parseInt(yearsMatch[1]) : 7;

  // 4. Check level match
  const levels = { 'senior': 5, 'lead': 7, 'principal': 10, 'middle': 3, 'junior': 1 };
  let requiredLevel = 0;
  Object.entries(levels).forEach(([keyword, level]) => {
    if (vacancyLower.includes(keyword)) requiredLevel = Math.max(requiredLevel, level);
  });

  const candidateLevel = yearsOfExperience >= 7 ? 7 : yearsOfExperience >= 3 ? 4 : 2;

  // 5. Find specific tech stack matches
  const techKeywords = ['react', 'typescript', 'python', 'gemini', 'ai', 'crm', 'api', 'supabase', 'git', 'vercel'];
  const techMatches = techKeywords.filter(tech =>
    vacancyLower.includes(tech) && fullText.includes(tech.toLowerCase())
  );

  // 6. Calculate match score
  let matchScore = 0;
  const reasoning = [];

  // Contextual matches (main weight - 55  points)
  const contextPoints = Math.min(55, (matches.length / 4) * 55);
  matchScore += contextPoints;
  if (matches.length > 0) {
    reasoning.push(`Релевантный опыт: ${matches.slice(0, 5).join(', ')}`);
  }

  // Tech skills (20 points)
  const techPoints = Math.min(20, (techMatches.length / 3) * 20);
  matchScore += techPoints;
  if (techMatches.length > 0) {
    reasoning.push(`Технические навыки: ${techMatches.slice(0, 5).join(', ')}`);
  }

  // Experience level (15 points)
  if (candidateLevel >= requiredLevel) {
    matchScore += 15;
    reasoning.push(`Опыт ${yearsOfExperience}+ лет`);
  } else if (candidateLevel >= requiredLevel - 2) {
    matchScore += 10;
    reasoning.push(`Опыт близок к требуемому`);
  }

  // Domain keywords bonus (10 points)
  const domainKeywords = ['b2b', 'sales', 'management', 'automation', 'ai'];
  const domainMatches = domainKeywords.filter(kw =>
    vacancyLower.includes(kw) && fullText.includes(kw)
  );
  const domainPoints = Math.min(10, (domainMatches.length / 2) * 10);
  matchScore += domainPoints;

  matchScore = Math.round(matchScore);

  // 7. Find REAL gaps - what vacancy requires but NOT in resume
  const gaps = [];
  const gapsDetails = [];

  // Check all required skills from patterns
  Object.entries(keywordPatterns).forEach(([skill, pattern]) => {
    const vacancyRequires = vacancyLower.includes(skill.replace(/\s+/g, ' ')) || pattern.test(vacancy);

    if (vacancyRequires && !pattern.test(fullText)) {
      gaps.push(skill);
      gapsDetails.push({ skill, severity: 'required' });
    }
  });

  // Additional tech gaps
  const allTechMentioned = [...new Set([
    ...vacancyLower.match(/\b(python|java|kotlin|swift|go|rust|c\+\+|scala|ruby)\b/gi) || [],
    ...vacancyLower.match(/\b(kubernetes|docker|aws|azure|gcp)\b/gi) || [],
    ...vacancyLower.match(/\b(sql|postgresql|mongodb|redis)\b/gi) || []
  ])].map(t => t.toLowerCase());

  allTechMentioned.forEach(tech => {
    if (!fullText.includes(tech) && !gaps.some(g => g.toLowerCase().includes(tech))) {
      gaps.push(tech);
      gapsDetails.push({ skill: tech, severity: 'technical' });
    }
  });

  // 8. Generate STRUCTURED recommendation for HR
  let recommendation = '';

  // Intro based on score
  if (matchScore >= 70) {
    recommendation = `**Рекомендую рассмотреть кандидата.**\n\n`;
    recommendation += `**Сильные стороны:**\n`;

    if (matches.length > 0) {
      recommendation += `• Релевантный опыт: ${matches.slice(0, 5).join(', ')}\n`;
    }
    if (techMatches.length > 0) {
      recommendation += `• Технические навыки: ${techMatches.slice(0, 5).join(', ')}\n`;
    }
    recommendation += `• Опыт работы: ${yearsOfExperience}+ лет\n\n`;

    if (gaps.length > 0) {
      recommendation += `**Зоны развития:** ${gaps.slice(0, 3).join(', ')}. Однако базовый опыт позволит кандидату быстро освоить недостающие навыки.`;
    } else {
      recommendation += `**Вывод:** Профиль полностью соответствует требованиям вакансии. Рекомендуется пригласить на интервью.`;
    }

  } else if (matchScore >= 50) {
    recommendation = `**Кандидат может рассматриваться с учетом дополнительного обучения.**\n\n`;
    recommendation += `**Что есть:**\n`;

    if (matches.length > 0) {
      recommendation += `• ${matches.slice(0, 4).join(', ')}\n`;
    }
    if (techMatches.length > 0) {
      recommendation += `• Технически: ${techMatches.join(', ')}\n`;
    }
    recommendation += `• Опыт: ${yearsOfExperience}+ лет\n\n`;

    if (gaps.length > 0) {
      recommendation += `**Что требует развития:** ${gaps.slice(0, 5).join(', ')}.\n\n`;
      recommendation += `**Вывод:** Кандидат обладает базовыми компетенциями, но для успешного выполнения требуется time-to-onboard 1-3 месяца.`;
    }

  } else if (matchScore >= 30) {
    recommendation = `**Частичное соответствие. Рекомендуется рассмотреть альтернативных кандидатов.**\n\n`;
    recommendation += `**Сильные стороны:**\n`;

    if (matches.length > 0) {
      recommendation += `• ${matches.slice(0, 3).join(', ')}\n\n`;
    } else {
      recommendation += `• Опыт работы ${yearsOfExperience}+ лет\n\n`;
    }

    if (gaps.length > 0) {
      recommendation += `**Критические пробелы:** ${gaps.slice(0, 5).join(', ')}.\n\n`;
      recommendation += `**Вывод:** Кандидату потребуется значительное обучение (3-6 месяцев) для соответствия позиции. Риск: долгий onboarding и возможная неэффективность.`;
    }

  } else {
    recommendation = `**Не рекомендуется к рассмотрению.**\n\n`;
    recommendation += `Профиль кандидата значительно отличается от требований вакансии.\n\n`;

    if (gaps.length > 0) {
      recommendation += `**Отсутствуют ключевые компетенции:** ${gaps.slice(0, 7).join(', ')}.\n\n`;
    }

    recommendation += `**Вывод:** Для данной позиции рекомендуется искать более релевантных кандидатов. Onboarding потребует 6+ месяцев, что экономически нецелесообразно.`;
  }


  return {
    matchScore,
    matchingSkills: [...matches, ...techMatches].slice(0, 12),
    gaps: gaps.slice(0, 5),
    recommendation
  };
}


function AIChat() {
  const [vacancy, setVacancy] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleAnalyze = async () => {
    if (!vacancy.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const analysisResult = await analyzeVacancy(vacancy);
      setResult(analysisResult);
    } catch (err) {
      setError('Analysis failed. Try again later.')
    } finally {
      setLoading(false)
    }
  }

  const getMatchColor = (percent) => {
    if (percent >= 80) return 'var(--aurora-3)'
    if (percent >= 60) return '#eab308'
    return '#ef4444'
  }

  return (
    <div className="ai-chat fade-in">
      <div className="glass-panel main-panel">
        <div className="ai-header">
          <div className="ai-icon">
            <Sparkles size={28} />
          </div>
          <div>
            <h2>🤖 AI HR Assistant</h2>
            <p>Paste a job description to analyze the match with my profile.</p>
          </div>
        </div>

        <div className="ai-input-section">
          <textarea
            className="vacancy-textarea"
            placeholder="Paste job description here..."
            value={vacancy}
            onChange={(e) => setVacancy(e.target.value)}
            rows={6}
          />
          <button
            className="btn btn-primary analyze-btn"
            onClick={handleAnalyze}
            disabled={loading || !vacancy.trim()}
          >
            {loading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
            {loading ? 'Analyzing...' : 'Analyze Match'}
          </button>
        </div>

        {error && (
          <div className="ai-error glass-panel">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="ai-result fade-in">
            <div className="match-score-section">
              <div className="match-ring" style={{ '--score-color': getMatchColor(result.matchScore) }}>
                <span className="score-value">{result.matchScore}%</span>
              </div>
              <p className="match-verdict">Match score based on complete resume analysis</p>
            </div>

            <div className="result-grid">
              <div className="res-card success glass-panel">
                <h4><CheckCircle2 size={16} /> Matching Skills</h4>
                <div className="tag-group">
                  {result.matchingSkills.map((s, i) => <span key={i} className="tag active-tag">{s}</span>)}
                </div>
              </div>
              <div className="res-card gaps glass-panel">
                <h4><AlertCircle size={16} /> Gaps</h4>
                <ul className="gaps-list">
                  {result.gaps.map((g, i) => <li key={i}>{g}</li>)}
                </ul>
              </div>
            </div>

            <div className="recommendation glass-panel">
              <div className="rec-header"><Bot size={18} /> Recommendation</div>
              <p>{result.recommendation}</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .ai-chat {
          width: 100%;
          max-width: 800px;
          margin: 0 auto 60px;
        }

        .main-panel {
          padding: 48px;
        }

        .ai-header {
          display: flex;
          align-items: center;
          gap: 24px;
          margin-bottom: 40px;
        }

        .ai-icon {
          width: 64px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--aurora-1);
          color: white;
          border-radius: 20px;
          box-shadow: 0 8px 32px var(--accent-glow);
        }

        .ai-header h2 { font-size: 24px; font-weight: 800; color: white; margin-bottom: 4px; }
        .ai-header p { font-size: 15px; color: var(--text-secondary); }

        .vacancy-textarea {
          width: 100%;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 24px;
          color: white;
          font-family: inherit;
          font-size: 15px;
          line-height: 1.6;
          margin-bottom: 24px;
          transition: all 0.3s;
        }

        .vacancy-textarea:focus { border-color: var(--accent); outline: none; background: rgba(255, 255, 255, 0.05); }

        .analyze-btn { width: 100%; padding: 18px; display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: 700; }

        .match-score-section { text-align: center; margin: 48px 0; }
        .match-ring {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 140px;
          height: 140px;
          border-radius: 50%;
          border: 4px solid var(--score-color);
          box-shadow: 0 0 40px var(--score-color) inset, 0 0 20px rgba(0,0,0,0.5);
          margin-bottom: 20px;
        }
        .score-value { font-size: 32px; font-weight: 800; color: white; }

        .result-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        .res-card { padding: 24px; background: rgba(255, 255, 255, 0.01) !important; }
        .res-card h4 { font-size: 14px; font-weight: 700; text-transform: uppercase; color: white; display: flex; align-items: center; gap: 8px; margin-bottom: 20px; }
        .res-card.success h4 { color: var(--aurora-3); }
        .res-card.gaps h4 { color: #ef4444; }

        .gaps-list { list-style: none; }
        .gaps-list li { font-size: 14px; color: var(--text-secondary); margin-bottom: 8px; padding-left: 20px; position: relative; }
        .gaps-list li::before { content: '•'; position: absolute; left: 0; color: #ef4444; }

        .recommendation { padding: 32px; background: rgba(255, 255, 255, 0.02) !important; }
        .rec-header { font-size: 14px; font-weight: 700; text-transform: uppercase; color: var(--aurora-2); margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
        .recommendation p { font-size: 15px; line-height: 1.8; color: var(--text-secondary); }

        .tag-group { display: flex; flex-wrap: wrap; gap: 8px; }
        
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media (max-width: 600px) {
          .result-grid { grid-template-columns: 1fr; }
          .main-panel { padding: 24px; }
        }
      `}</style>
    </div>
  )
}

export default AIChat
