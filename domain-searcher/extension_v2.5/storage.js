/**
 * Storage module — CRUD wrapper over chrome.storage.local.
 * Replaces SQLite (models.py) for search history persistence.
 *
 * Data schema in chrome.storage.local:
 *   "tasks"   -> Array of { id, targetCount, foundCount, status, createdAt }
 *   "results" -> Array of { name, bl, ageYears, status, sourcePage, foundAt, taskId }
 */

const StorageKeys = {
    TASKS: "ds_tasks",
    RESULTS: "ds_results",
};

/**
 * Create a new search task and return its ID.
 * @param {number} targetCount
 * @returns {Promise<number>} taskId
 */
async function createTask(targetCount) {
    const data = await chrome.storage.local.get(StorageKeys.TASKS);
    const tasks = data[StorageKeys.TASKS] || [];

    const taskId = Date.now();
    tasks.unshift({
        id: taskId,
        targetCount,
        foundCount: 0,
        status: "running",
        createdAt: new Date().toISOString(),
    });

    // Keep only 50 most recent tasks
    if (tasks.length > 50) tasks.length = 50;

    await chrome.storage.local.set({ [StorageKeys.TASKS]: tasks });
    return taskId;
}

/**
 * Update a task's status and found count.
 * @param {number} taskId
 * @param {string} status
 * @param {number} [foundCount]
 */
async function updateTask(taskId, status, foundCount) {
    const data = await chrome.storage.local.get(StorageKeys.TASKS);
    const tasks = data[StorageKeys.TASKS] || [];
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.status = status;
        if (foundCount !== undefined) task.foundCount = foundCount;
        await chrome.storage.local.set({ [StorageKeys.TASKS]: tasks });
    }
}

/**
 * Save a single domain result (upsert: update if exists, insert if not).
 * BUG-6 fix: prevents duplicate entries for the same domain in one task.
 * @param {number} taskId
 * @param {object} domain - { name, bl, ageYears, status, sourcePage }
 */
async function saveDomainResult(taskId, domain) {
    const data = await chrome.storage.local.get(StorageKeys.RESULTS);
    const results = data[StorageKeys.RESULTS] || [];

    // BUG-6 fix: Check for existing entry with same name + taskId
    const existingIndex = results.findIndex(
        r => r.name === domain.name && r.taskId === taskId
    );

    if (existingIndex >= 0) {
        // Update existing entry (e.g. status change from pending → available)
        results[existingIndex].status = domain.status;
        results[existingIndex].bl = domain.bl;
        results[existingIndex].ageYears = domain.ageYears;
    } else {
        // Insert new entry
        results.unshift({
            name: domain.name,
            bl: domain.bl,
            ageYears: domain.ageYears,
            status: domain.status,
            sourcePage: domain.sourcePage,
            foundAt: new Date().toISOString(),
            taskId,
        });

        // Keep only 2000 most recent results to stay within storage limits
        if (results.length > 2000) results.length = 2000;
    }

    await chrome.storage.local.set({ [StorageKeys.RESULTS]: results });
}

/**
 * Get recent domain results.
 * @param {number} [limit=50]
 * @returns {Promise<object[]>}
 */
async function getHistory(limit = 50) {
    const data = await chrome.storage.local.get(StorageKeys.RESULTS);
    const results = data[StorageKeys.RESULTS] || [];
    return results.slice(0, limit);
}

/**
 * Clear all search history.
 */
async function clearHistory() {
    await chrome.storage.local.remove([StorageKeys.TASKS, StorageKeys.RESULTS]);
}
