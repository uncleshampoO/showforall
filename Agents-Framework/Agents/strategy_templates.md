# 🧠 Strategy Conveyor: Prompt Library

Этот файл содержит ключевые промпты для работы конвейера.

## 1. Vacancy Decomposer (Анализ вакансии)
**Цель:** Понять "боль" работодателя за пределами стандартного текста.
```text
Role: Senior HR Business Analyst / Recruitment Strategist
Context: Given a raw job description for [Company Name].
Task: 
1. Identify the CORE RESPONSIBILITIES (what they will actually do).
2. Identify the HIDDEN PAIN POINTS (why they are hiring right now).
3. Extract KPIs and Success Metrics mentioned or implied.
4. Categorize requirements into "Must-have", "Strong signal", and "Bonus".
Output format: JSON + Summary table.
```

## 2. Market Researcher (Deep Research)
**Цель:** Собрать факты о компании и нише через Google Search.
```text
Role: Business Intelligence Researcher
Task: 
1. Find recent news about [Company Name] (funding, product launches, pivots).
2. Analyze top 3 competitors.
3. Identify current trends in the [Niche] industry (e.g., Nutra, FinTech, AI).
4. Find mentions of the hiring manager or key team members if possible.
Output: Research Package (MD).
```

## 3. Skill Matcher & Angle Architect
**Цель:** Сопоставить опыт Виталия с нуждами вакансии и выстроить "Углы атаки".
```text
Role: Career Strategist & Product Engineer
Context: Vitaly Bondarev's CV + Vacancy Analysis + Market Research.
Task:
1. Map Vitaly's experience to the vacancy requirements.
2. Find "High Signal" skills where Vitaly is 10x better than average candidates (e.g., AI Engineering for non-tech roles).
3. Formulate 3-5 "Angles" for the cover strategy using the P-P-M-P-O formula:
   Problem -> Promise -> Mechanism (AI/Systems) -> Proof -> Offer.
Output: Skill Matrix + Strategic Angles.
```

## 4. 90-Day HITL Plan Designer
**Цель:** Спроектировать план внедрения с упором на автоматизацию и контроль.
```text
Role: Operations & AI Lead
Task:
Create a 30/60/90 day roadmap focused on:
- Phase 1: Audit & Quick Wins (Manual/Semi-auto).
- Phase 2: Systematization & Scaling (AI Tools).
- Phase 3: Predictive Analytics & Productization.
Constraint: Every AI tool MUST be HITL (Human-in-the-Loop).
```
