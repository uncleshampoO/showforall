import { supabase } from "./supabase.service";

// Мы больше не используем Google SDK на фронтенде для безопасности API ключа.
// Все вызовы идут через Supabase Edge Function 'vibo-ai'.

const GRADE_DESCRIPTIONS = {
    junior: {
        ru: 'Новичок (обучение с нуля)',
        complexity: 'КРИТИЧЕСКИ ПРОСТО. Используй метафоры из реальной жизни. НИКАКИХ сложных терминов без объяснения. Вопросы должны быть на понимание сути, а не на знание тонкостей реализации. Человек только начинает путь.',
        topics: 'азы, введение, базовые понятия, зачем это нужно на практике'
    },
    middle: {
        ru: 'Специалист с опытом (2-3 года)',
        complexity: 'ВЫШЕ СРЕДНЕГО. Практические кейсы, сложные рабочие ситуации, поиск оптимального решения из нескольких верных.',
        topics: 'глубокая практика, оптимизация, решение проблем, архитектура процессов'
    },
    senior: {
        ru: 'Эксперт (5+ лет опыта)',
        complexity: 'ПРОДВИНУТЫЙ уровень. Архитектурные решения, оптимизация.',
        topics: 'архитектура, масштабирование, сложные интеграции'
    },
    lead: {
        ru: 'Технический лидер',
        complexity: 'ЭКСПЕРТНЫЙ уровень. Стратегические решения, системный дизайн.',
        topics: 'лидерство, стратегия, менторство'
    }
};

// Типы заданий с описаниями для AI
const TASK_TYPES = {
    pulse_test: {
        name: 'Тест',
        prompt: `Создай тестовый вопрос с 4 вариантами ответа.
JSON формат: {"question": "Вопрос?", "options": ["A", "B", "C", "D"], "correctAnswerText": "Текст правильного ответа", "explanation": "Почему"}`
    },
    true_false: {
        name: 'Правда/Ложь',
        prompt: `Создай утверждение, которое либо ПРАВДА, либо ЛОЖЬ.
JSON формат: {"statement": "Утверждение...", "isTrue": true/false, "explanation": "Почему"}`
    },
    flash_card: {
        name: 'Флеш-карточка',
        prompt: `Создай флеш-карточку для запоминания ключевого понятия.
JSON формат: {"front": "Вопрос или термин", "back": "Ответ или определение", "hint": "Подсказка"}`
    },
    bug_hunter: {
        name: 'Найди несоответствие',
        prompt: `Создай профессиональную задачу на поиск технической, концептуальной или логической ошибки.
JSON формат: {"context": "описание ситуации", "options": ["Ошибка 1", "Ошибка 2", "Ошибка 3", "Нет ошибки"], "correctAnswerText": "Текст правильного варианта", "explanation": "Почему это ошибка"}`
    },
    fill_blank: {
        name: 'Заполни пробел',
        prompt: `Создай предложение с пропущенным словом/фразой и 4 варианта заполнения.
JSON формат: {"sentence": "Для создания ____ используется паттерн Factory", "options": ["объектов", "классов", "функций", "модулей"], "correctAnswerText": "объектов", "explanation": "Объяснение"}`
    }
};

// Глобальная история вопросов для текущей сессии
const sessionHistory = new Set();

// Термины, которые ЗАПРЕЩЕНО переводить (универсальные)
const PROHIBITED_TRANSLATIONS = ["Best Practices", "Deep Dive", "Roadmap", "Skills", "Know-how", "Case Study"];

export const aiService = {

    /**
     * Универсальный вызов Edge Function
     */
    async callAI(prompt, type = "general") {
        try {
            console.log(`[Edge Function] Calling vibo-ai for ${type}...`);
            const { data, error } = await supabase.functions.invoke('vibo-ai', {
                body: { prompt, type }
            });

            if (error) {
                console.error(`[Edge Function Invoke Error] ${type}:`, error);
                // Попытка извлечь текст ошибки из ответа, если это возможно
                try {
                    const errorDetails = await error.context?.json();
                    if (errorDetails?.error) {
                        console.error(`[Edge Function Detail Error] ${type}:`, errorDetails.error);
                        throw new Error(errorDetails.error);
                    }
                } catch (e) { /* ignore parse error */ }
                throw error;
            }

            console.log(`[Edge Function Response] ${type} success:`, data);

            if (!data?.text) {
                console.error(`[Edge Function Error] No text in response:`, data);
                throw new Error("Empty response from AI");
            }

            return data.text;
        } catch (err) {
            console.error(`[Edge Function Catch] ${type}:`, err);
            throw err;
        }
    },

    async generateRoadmap(jobTitle, grade) {
        const gradeInfo = GRADE_DESCRIPTIONS[grade] || GRADE_DESCRIPTIONS.middle;

        const prompt = `### ROLE
Ты — Head of Education и главный архитектор курсов Vibo Academy. Твоя задача — создать уникальный, экспертный "Roadmap" (Дорожную карту) для специалиста. Твой стиль: отсутствие шаблонов, глубокая техническая экспертиза и фокус на современные требования рынка (2025-2026).

### TARGET AUDIENCE
- **Должность:** ${jobTitle}
- **Уровень (Grade):** ${grade.toUpperCase()} (${gradeInfo.ru})
- **Сотрудник:** Тебе нужно составить план обучения, который закроет пробелы именно для этой роли, учитывая грейд.

### GENERATION RULES (Strict)
1. **No Generic Blocks:** ЗАПРЕЩЕНО использовать стандартные названия типа "Основы", "Инструменты", "Практика", "Введение". 
2. **Technical Depth:** Каждый заголовок модуля должен звучать как узкая профессиональная специализация (например, вместо "Продвинутый уровень" -> "Архитектура высоконагруженных систем и High Availability").
3. **Context Sensitivity:** Модули должны учитывать специфику ${jobTitle}. Если это актер, модули про сцену и эмоции; если повар — про кухню.
4. **Terminology:** Используй профессиональный сленг, принятый в индустрии пользователя.
5. **Language:** Описание и заголовки — на русском языке.

### OUTPUT STRUCTURE (JSON ОБЪЕКТ)
Верни СТРОГО JSON объект (БЕЗ разметки markdown и пояснений):
{
  "roadmap": [
    {
      "title": "(Узкоспециализированный заголовок модуля)",
      "description": "(Экспертное описание, до 120 символов)",
      "xp": 150
    },
    ...
  ]
}

### ПРАВИЛА JSON:
- Только валидный JSON.
- Никаких запятых после последнего элемента.
- Никакого текста до или после JSON.

### КОЛИЧЕСТВО МОДУЛЕЙ:
Определи сам исходя из сложности профессии "${jobTitle}". Для простых ролей достаточно 3-4 глубоких модуля, для сложных — до 8.`;

        try {
            console.log('Calling AI for Roadmap:', { jobTitle, grade });
            const text = await this.callAI(prompt, "roadmap");
            console.log('AI RAW Text:', text);

            // Улучшенная очистка JSON от markdown и лишнего текста
            const cleanedText = text
                .replace(/```json\s?/g, "")
                .replace(/```/g, "")
                .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Очистка непечатных символов
                .trim();

            const jsonStart = cleanedText.indexOf('{');
            const jsonEnd = cleanedText.lastIndexOf('}');

            if (jsonStart !== -1 && jsonEnd !== -1) {
                const jsonStr = cleanedText.substring(jsonStart, jsonEnd + 1);
                console.log('Extracted JSON String:', jsonStr);
                const data = JSON.parse(jsonStr);
                if (data.roadmap && Array.isArray(data.roadmap)) {
                    console.log('Successfully parsed Roadmap:', data.roadmap.length, 'modules');
                    return data;
                }
            }
            console.error('Roadmap JSON structure mismatch. Cleaned text:', cleanedText);
            throw new Error("Invalid Roadmap JSON structure");
        } catch (e) {
            console.error('AI generateRoadmap total failure:', e);
            throw e;
        }
    },

    // Получить случайный тип задания
    getRandomTaskType() {
        const types = Object.keys(TASK_TYPES);
        return types[Math.floor(Math.random() * types.length)];
    },

    async generateLesson(jobTitle, grade, topic, description = "", count = 10) {
        let attempts = 0;
        let uniqueTasks = [];
        const seenCurrentLesson = new Set();

        try {
            while (attempts < 3 && uniqueTasks.length < count) {
                attempts++;
                const salt = `batch-${attempts}-${Math.random().toString(36).substring(7)}`;
                // ОПТИМИЗАЦИЯ V3: 12 заданий — золотая середина между скоростью и качеством Double-Pass.
                const batchSize = attempts === 1 ? 12 : 8;
                const batchTasks = await this._generateBatch(jobTitle, grade, topic, description, batchSize, "extreme_variety", salt);

                for (const task of batchTasks) {
                    if (uniqueTasks.length >= count) break;

                    const text = task.question.toLowerCase().replace(/[^\w\sа-я]/gi, '').replace(/\s+/g, ' ').trim();
                    const isDuplicate = Array.from(seenCurrentLesson).some(seen => seen.includes(text) || text.includes(seen) || this.getSimilarity(seen, text) > 0.7)
                        || Array.from(sessionHistory).some(seen => seen.includes(text) || text.includes(seen) || this.getSimilarity(seen, text) > 0.7);

                    // Проверка на примитивность (смягчаем для Junior, так как там нужны простые вопросы)
                    const minLen = grade === 'junior' ? 15 : 40;
                    const isPrimitive = text.length < minLen ||
                        (text.includes("полезно") && text.length < 60) ||
                        (text.includes("нужно") && text.length < 60);

                    const absoluteMinLen = grade === 'junior' ? 10 : 20;

                    if (!isDuplicate && !isPrimitive && text.length > absoluteMinLen) {
                        uniqueTasks.push(task);
                        seenCurrentLesson.add(text);
                        sessionHistory.add(text);
                    }
                }
            }

            return uniqueTasks.slice(0, count).sort(() => Math.random() - 0.5);
        } catch (e) {
            console.error("Critical lesson generation failure:", e);
            throw e;
        }
    },

    async _generateBatch(jobTitle, grade, topic, description, count, focus = "extreme_variety", salt = "") {
        const gradeInfo = GRADE_DESCRIPTIONS[grade] || GRADE_DESCRIPTIONS.middle;
        const taskConfigs = Object.entries(TASK_TYPES).map(([name, config]) => ({ name, ...config }));

        const prompt = `### ROLE
Ты — Senior Instructional Designer и ведущий эксперт Vibo Academy. Твоя специализация — разработка хардкорных образовательных траекторий для ${jobTitle}. Твой стиль: структурность, экспертный цинизм (никакой "воды") и фокус на реальный профит для бизнеса.

### GOAL
Сгенерировать пул из ${count} уникальных, методически выверенных заданий для модуля по теме: "${topic}".
ПОДРОБНОЕ ОПИСАНИЕ ТЕМЫ МОДУЛЯ: "${description}"

### CONSTRAINTS & ANTI-PRIMITIVE RULES
1. **Zero Redundancy:** Каждое задание — это новый технический или управленческий вектор. 
2. **Context Enrichment:** Запрещены односложные условия. Добавляй вводные: показатели KPI, технические ограничения, профиль клиента.
3. **ANTI-DANA:** ЗАПРЕЩАЮТСЯ вопросы, на которые можно ответить "Да/Нет" или "Это полезно". Вопрос должен требовать выбора из нескольких РАВНОЦЕННЫХ с виду решений.
4. **Expertise Alignment:** Задания ДОЛЖНЫ основываться на предоставленном описании модуля. 
   - **JUNIOR RULE:** Задания должны быть понятны человеку БЕЗ опыта в этой сфере. Используй простые аналогии. Избегай узкой терминологии.
   - **MIDDLE/SENIOR RULE:** Максимально хардкорно и практично. Ставь в тупик, используй противоречивые данные.
5. **ZERO IT-BIAS:** Если роль "${jobTitle}" не является IT-профессией, КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО упоминать код, базы данных, микросервисы, архитектуру ПО и другие IT-концепции. Используй только термины, релевантные индустрии ${jobTitle}.
6. **Terminology Policy:** Весь контент на русском языке. Ключевые термины индустрии можно оставлять в оригинале (English).
7. **Expertise Depth:** Ставь ученика в тупик. Используй противоречивые данные (например, "Клиент хочет X, но бюджет Y, а руководитель говорит Z").

### OUTPUT STRUCTURE (JSON МАССИВ)
Верни СТРОГО массив JSON. Каждое задание должно иметь:
- "type": (pulse_test, true_false, flash_card, bug_hunter, fill_blank)
- "question": (Развернутый Контекст + Проблема + Задание)
- "options": (ОБЯЗАТЕЛЬНО: массив из 4 вариантов для тестов или 2 для True/False)
- "correctAnswerText": (СТРОГО ТЕКСТ верного ответа из массива options)
- "isTrue": (Только для true_false: true если правда, false если ложь)
- "explanation": (Подробное обоснование)

### CRITICAL RULES
- Для **true_false**: "options" ВСЕГДА **["Ложь", "Правда"]**. 
  - Если утверждение ЛОЖНО — "isTrue" = false, "correctAnswerText" = "Ложь".
  - Если утверждение ВЕРНО — "isTrue" = true, "correctAnswerText" = "Правда".
- Поле "correctAnswerText" ОБЯЗАТЕЛЬНО для сверки.

Верни ТОЛЬКО массив JSON: [ { ... }, ... ]`;

        try {
            const text = await this.callAI(prompt, "batch_tasks");
            const cleanedText = text
                .replace(/```json\s?/g, "")
                .replace(/```/g, "")
                .trim();

            const jsonStartIdx = cleanedText.indexOf('[');
            const jsonEndIdx = cleanedText.lastIndexOf(']');

            if (jsonStartIdx !== -1 && jsonEndIdx !== -1) {
                const jsonStr = cleanedText.substring(jsonStartIdx, jsonEndIdx + 1);
                let rawTasks = JSON.parse(jsonStr);

                // ВТОРОЙ ПРОХОД: AI-Валидация (Double-Pass)
                const refinedTasks = await this.refineTasksWithAI(rawTasks, topic, grade, jobTitle);
                return this.normalizeTasks(refinedTasks || rawTasks);
            }
            throw new Error(`JSON array indices not found.`);
        } catch (e) {
            console.error(`❌ [Batch Gen Error]: ${salt}`, e);
            throw e;
        }
    },

    /**
     * ВТОРОЙ ПРОХОД: Редактирование и проверка на дубли через AI
     */
    async refineTasksWithAI(tasks, topic, grade, jobTitle) {
        const gradeInfo = GRADE_DESCRIPTIONS[grade] || GRADE_DESCRIPTIONS.middle;
        const prompt = `### ROLE
Ты — Lead Content QA & Methodologist в Vibo Academy. Твоя задача — проводить глубокий аудит и рефакторинг учебных заданий. Ты не просто проверяешь текст, ты гарантируешь, что контент соответствует премиальному качеству обучения для ${jobTitle}.

### INPUT DATA
Тебе подан массив JSON с заданиями. 
- **Тема:** ${topic}
- **Целевой грейд:** ${grade}
- **Сложность:** ${gradeInfo.complexity}

### AUDIT ALGORITHM (Твой протокол проверки)

1. **Semantic De-duplication:** Сравни когнитивную нагрузку заданий. Если два задания проверяют один и тот же навык — это ошибка. 
   *ДЕЙСТВИЕ:* Перепиши дубликат, сместив фокус на другой аспект ${topic}.

2. **Grade Alignment Check:** Соответствует ли кейс уровню ${grade}? 
   - **Если это JUNIOR:** Убедись, что нет "умных" слов. Если видишь сложный термин — замени на простое описание или убери. Вопрос должен быть простейшим фундаментом.
   - **Если это MIDDLE/SENIOR:** Усложни вводные, добавь противоречивые данные или KPI. Сделай варианты ответов очень похожими.

3. **Terminology & Linguistic Integrity:**
   - **Strict Rule:** ${PROHIBITED_TRANSLATIONS.join(', ')} и профильные термины ${jobTitle} ДОЛЖНЫ оставаться на английском.
   - Текст — безупречный, деловой русский язык без канцеляризмов.

4. **Context Preservation (Anti-Shortening):** 
   Запрещено сокращать описание кейсов. Задание должно быть сформулировано как четкий призыв к действию.

5. **Logical Mapping Verification (ZERO ERROR TOLERANCE):**
   - Перечитай свой вопрос и варианты ответов. 
   - Убедись, что индекс 'correct' указывает ИМЕННО на тот вариант, который является верным. 
   - ОСОБОЕ ВНИМАНИЕ: Для True/False (Правда/Ложь), если ответ "Правда" — индекс ДОЛЖЕН БЫТЬ 0. Если ответ "Ложь" — индекс 1.

   - ПРОВЕРЬ ТЕКСТ ОТВЕТА: Убедись, что 'correctAnswerText' совпадает с одним из вариантов в 'options'.
   - ОБЯЗАТЕЛЬНО: Для True/False проверь поле 'isTrue'. Если утверждение ложно — это СТРОГО false.

### OUTPUT REQUIREMENTS
- Возвращай строго валидный JSON-массив.
- Сохраняй все исходные ключи (type, question, options, correctAnswerText, isTrue, explanation).

### CRITICAL ERROR LIST:
- Несоответствие 'correctAnswerText' верному варианту ответа (ФАТАЛЬНО).
- Перевод устойчивых профессиональных терминов на русский.
- Вопросы "Да/Нет" без глубокого контекста.

ВХОДНОЙ JSON:
${JSON.stringify(tasks, null, 2)}

Верни ТОЛЬКО исправленный массив JSON [ { ... }, ... ]`;

        try {
            const text = await this.callAI(prompt, "refine_tasks");
            const cleanedText = text.replace(/```json\s?/g, "").replace(/```/g, "").trim();

            const jsonStartIdx = cleanedText.indexOf('[');
            const jsonEndIdx = cleanedText.lastIndexOf(']');

            if (jsonStartIdx !== -1 && jsonEndIdx !== -1) {
                const jsonStr = cleanedText.substring(jsonStartIdx, jsonEndIdx + 1);
                return JSON.parse(jsonStr);
            }
            return tasks;
        } catch (e) {
            console.warn("AI Refinement failed, using raw tasks:", e);
            return tasks;
        }
    },

    // Ультра-надежная нормализация данных от AI (Версия 10: Semantic Unity)
    normalizeTasks(input) {
        if (!input) return null;

        const isArray = Array.isArray(input);
        const rawItems = isArray ? input : [input];

        const normalized = rawItems.map(item => {
            let t = { ...item };

            // 1. Нормализация типа
            let type = String(t.type || t.taskType || '').toLowerCase();
            if (type.includes('тест') || type.includes('pulse')) type = 'pulse_test';
            else if (type.includes('правда') || type.includes('true')) type = 'true_false';
            else if (type.includes('карточк') || type.includes('flash')) type = 'flash_card';
            else if (type.includes('баг') || type.includes('ошибк') || type.includes('bug')) type = 'bug_hunter';
            else if (type.includes('пробел') || type.includes('заполн') || type.includes('fill')) type = 'fill_blank';
            else type = 'pulse_test'; // Дефолт

            // 2. ИНТЕЛЛЕКТУАЛЬНЫЙ ПОИСК ТЕКСТА ВОПРОСА
            let mainText = t.question || t.statement || t.context || t.sentence || t.code || t.front || t.text || t.title || t.task || t.q || '';

            if (!mainText || mainText.length < 5) {
                const candidate = Object.values(t).find(v => typeof v === 'string' && v.length > 10);
                if (candidate) mainText = candidate;
            }

            // 3. ПОИСК ВАРИАНТОВ ОТВЕТОВ
            let options = t.options || t.answers || t.choices || t.variants || null;
            if (type === 'true_false') {
                options = ["Ложь", "Правда"];
            } else if (!options) {
                const possibleArrays = Object.values(t).find(v => Array.isArray(v) && v.length >= 2);
                if (possibleArrays) options = possibleArrays;
            }

            // 4. SMART CORRECT INDEX CALCULATION
            let correct = typeof t.correct === 'number' ? t.correct : parseInt(t.correct);
            const answerText = t.correctAnswerText || t.answerText || t.correctText || '';
            const explanation = t.explanation || t.back || '';

            if (type === 'true_false') {
                // ПРИОРИТЕТ 1: Явное булево поле (isTrue для фронта)
                const isTrueVal = typeof t.isTrue === 'boolean' ? t.isTrue : (typeof t.isCorrectTrue === 'boolean' ? t.isCorrectTrue : null);

                if (isTrueVal !== null) {
                    t.isTrue = isTrueVal;
                    correct = isTrueVal ? 1 : 0; // Ложь = 0, Правда = 1
                } else {
                    // ПРИОРИТЕТ 2: Текстовый фолбек
                    const textToCheck = (answerText + ' ' + explanation).toLowerCase();
                    const foundTrue = textToCheck.includes('правда') || textToCheck.includes('true') || textToCheck.includes('верно');
                    t.isTrue = foundTrue;
                    correct = foundTrue ? 1 : 0;
                }
            } else if (options && Array.isArray(options) && answerText) {
                // Ищем текст ответа в массиве вариантов.
                const foundIdx = options.findIndex(opt =>
                    opt === answerText ||
                    answerText.toLowerCase().includes(opt.toLowerCase()) ||
                    opt.toLowerCase().includes(answerText.toLowerCase())
                );
                if (foundIdx !== -1) correct = foundIdx;
            }

            if (isNaN(correct) || correct === null) correct = 0;
            const backText = t.back || t.explanation || t.answer || 'Решение внутри';

            // 5. SMART CONVERSION (Protect against empty options)
            if ((type === 'pulse_test' || type === 'bug_hunter' || type === 'fill_blank') && (!options || !Array.isArray(options) || options.length < 2)) {
                type = 'flash_card';
            }

            return {
                ...t,
                type,
                question: mainText,
                statement: mainText,
                context: mainText,
                front: mainText,
                sentence: mainText,
                code: mainText,
                options,
                back: backText,
                explanation: t.explanation || backText,
                correct
            };
        });

        return isArray ? normalized : normalized[0];
    },

    async generateTask(jobTitle, grade, topic, description = "", taskType = null, excluded = []) {
        const gradeInfo = GRADE_DESCRIPTIONS[grade] || GRADE_DESCRIPTIONS.middle;

        // Выбираем тип задания
        const type = taskType || this.getRandomTaskType();
        const taskConfig = TASK_TYPES[type] || TASK_TYPES.pulse_test;

        const excludePrompt = excluded.length > 0
            ? `\nКРИТИЧЕСКИ ВАЖНО: Не повторяйся! Ранее уже были заданы вопросы на темы: ${excluded.join(', ')}.Придумай совершенно новый вопрос.`
            : '';

        const prompt = `Ты — преподаватель Vibo Academy.

        КОНТЕКСТ:
- Ученик: ${jobTitle} (${grade.toUpperCase()})
- Тема: ${topic}
- Подробное описание: ${description}
- Тип задания: ${taskConfig.name}
${excludePrompt}

ПРАВИЛА:
1. ВСЁ НА РУССКОМ ЯЗЫКЕ!
2. Сложность для ${grade}: ${gradeInfo.complexity}
3. Задание должно СТРОГО соответствовать подробному описанию темы.
4. Избегай воды.Сразу к делу.

    ФОРМАТ:
${taskConfig.prompt}

Создай ОДНО задание.Верни ТОЛЬКО JSON.`;

        try {
            const text = await this.callAI(prompt, "single_task");
            const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();

            const jsonMatch = cleanedText.match(/\{[\s\S]*?\}/);
            if (jsonMatch) {
                const rawTask = JSON.parse(jsonMatch[0]);
                return this.normalizeTasks(rawTask);
            }
            throw new Error(`Single task JSON failed.`);
        } catch (e) {
            console.error(`❌ [Single Task Error]:`, e);
            throw e;
        }
    },


    // --- НОВОЕ: ГЕНЕРАЦИЯ ДОПОЛНИТЕЛЬНЫХ МАТЕРИАЛОВ ---

    /**
     * ОПТИМИЗИРОВАНО V3 (Single-Pass): Формирует структуру и контент презентации за ОДИН запрос.
     */
    async generatePresentation(jobTitle, grade, topic, description = "", subtopics = []) {
        const gradeInfo = GRADE_DESCRIPTIONS[grade] || GRADE_DESCRIPTIONS.middle;

        const prompt = `### ROLE
Ты — Senior Presentation Designer и эксперт в "${topic}". Создай структуру и наполнение глубокой презентации для ${jobTitle} (${grade.toUpperCase()}).

### CONTEXT
- Описание: ${description}
- Подтемы: ${subtopics.length > 0 ? subtopics.join(', ') : 'ключевые аспекты'}

### RULES (Single-Pass)
1. **Total Slides:** Сгенерируй от 10 до 15 слайдов.
2. **Dense Content:** Для каждого слайда напиши 3-5 экспертных тезисов. Никакой воды.
3. **Output:** Верни ТОЛЬКО JSON.
4. **No Visuals:** КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО добавлять идеи для картинок или поле visual_hint. Только текст.

### STRUCTURE
{
  "slides": [
    {
      "title": "Заголовок слайда",
      "content": ["Тезис 1", "Тезис 2", ...]
    }
  ]
}`;

        try {
            const text = await this.callAI(prompt, "presentation_single_pass");
            const jsonStart = text.indexOf('{');
            const jsonEnd = text.lastIndexOf('}');

            if (jsonStart !== -1 && jsonEnd !== -1) {
                const data = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
                if (data.slides) return data;
            }
            throw new Error("Pres JSON extraction failed");
        } catch (e) {
            console.error("Presentation Single-Pass Error:", e);
            return { slides: [{ title: "Введение", content: ["Материал временно недоступен"], visual_hint: "" }] };
        }
    },

    /**
     * ОПТИМИЗИРОВАНО V3 (Single-Pass): Пишет статью за ОДИН запрос.
     */
    async generateNotionArticle(jobTitle, grade, topic, description = "", subtopics = []) {
        const prompt = `### ROLE
Ты — Senior Tech Writer. Напиши масштабную, структурную статью в стиле Notion на тему "${topic}" для ${jobTitle} (${grade}).

### CONSTRAINTS
1. **Structure:** Минимум 5-6 разделов (Введение, Теория, Практика, Ошибки, Итог). 
2. **Format:** Используй заголовоки H1, H2, списки, жирный текст.
3. **Volume:** Минимум 3000-5000 символов экспертного текста. 
4. **Tone:** Деловой, без воды.
5. **No IT-bias:** Если роль не из IT, не упоминай код.

ВЕРНИ ТОЛЬКО ТЕКСТ СТАТЬИ.`;

        try {
            const content = await this.callAI(prompt, "article_single_pass");
            if (!content || content.length < 200) throw new Error("Article execution failed");
            return content;
        } catch (e) {
            console.error("Article Single-Pass Error:", e);
            return "# Ошибка генерации\nК сожалению, статья временно недоступна.";
        }
    },

    // Вспомогательная функция для проверки схожести строк (упрощенный алгоритм)
    getSimilarity(s1, s2) {
        let longer = s1.length > s2.length ? s1 : s2;
        let shorter = s1.length > s2.length ? s2 : s1;
        if (longer.length === 0) return 1.0;
        return (longer.length - this.editDistance(longer, shorter)) / parseFloat(longer.length);
    },

    editDistance(s1, s2) {
        s1 = s1.toLowerCase();
        s2 = s2.toLowerCase();
        let costs = new Array();
        for (let i = 0; i <= s1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= s2.length; j++) {
                if (i == 0) costs[j] = j;
                else {
                    if (j > 0) {
                        let newValue = costs[j - 1];
                        if (s1.charAt(i - 1) != s2.charAt(j - 1)) newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                        costs[j - 1] = lastValue;
                        lastValue = newValue;
                    }
                }
            }
            if (i > 0) costs[s2.length] = lastValue;
        }
        return costs[s2.length];
    },

    /**
     * Запускает генерацию всех материалов параллельно
     */
    async generateAllMaterials(jobTitle, grade, topic, description = "", subtopics = []) {
        const requestId = Math.random().toString(36).substring(7);

        // Запускаем всё параллельно
        const [presResult, artResult] = await Promise.allSettled([
            this.generatePresentation(jobTitle, grade, topic, description, subtopics),
            this.generateNotionArticle(jobTitle, grade, topic, description, subtopics)
        ]);

        const results = {
            presentation: presResult.status === 'fulfilled' ? presResult.value : null,
            article: artResult.status === 'fulfilled' ? artResult.value : null,
            timestamp: new Date().toISOString()
        };

        return results;
    }
};
