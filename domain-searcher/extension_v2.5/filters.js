/**
 * Domain name filtering engine.
 * Direct port from Python filters.py — stop-word lists + validation.
 */

const ADULT_WORDS = [
    "porn", "xxx", "sex", "nude", "naked", "mature", "milf",
    "tube", "cam", "escort", "fetish", "hentai", "erotic",
    "onlyfans", "stripper", "hookup", "booty", "busty",
];

const GAMBLING_WORDS = [
    "casino", "bet", "poker", "slots", "jackpot", "gamble",
    "roulette", "blackjack", "lottery", "bingo", "wager",
    "sportbet", "betting", "1xbet", "stake",
];

const DRUG_WORDS = [
    "weed", "cannabis", "marijuana", "drug", "pill", "pharma",
    "opioid", "cocaine", "meth", "heroin", "kratom", "cbd",
    "thc", "vape", "smoke", "tobacco",
];

const PROFANITY_EN = [
    "fuck", "shit", "ass", "damn", "bitch", "crap",
    "dick", "cock", "cunt", "whore", "slut",
];

const PROFANITY_RU = [
    "\u0431\u043b\u044f\u0442", "\u0445\u0443\u0439", "\u043f\u0438\u0437\u0434", "\u0435\u0431\u0430\u0442", "\u0441\u0443\u043a\u0430", "\u043c\u0443\u0434\u0430\u043a",
    "\u0436\u043e\u043f", "\u0434\u0435\u0440\u044c\u043c", "\u0448\u043b\u044e\u0445",
];

const SPAM_PATTERNS = [
    "buy-", "cheap-", "free-", "best-", "top-",
    "click", "deal", "discount", "promo",
];

const ALL_STOP_WORDS = [
    ...ADULT_WORDS, ...GAMBLING_WORDS, ...DRUG_WORDS,
    ...PROFANITY_EN, ...PROFANITY_RU, ...SPAM_PATTERNS,
];

/**
 * Check if a domain name is free of trigger/stop words.
 * @param {string} domainName - e.g. "example.com"
 * @param {string[]} [extraStopWords] - optional additional words
 * @returns {boolean} true if the domain is clean
 */
function isCleanDomain(domainName, extraStopWords = []) {
    const nameLower = domainName.toLowerCase().replace(".com", "").replace(/\./g, "");
    const stopList = [...ALL_STOP_WORDS, ...extraStopWords];

    for (const word of stopList) {
        if (nameLower.includes(word)) {
            return false;
        }
    }
    return true;
}

/**
 * Basic validation that the string looks like a .com domain.
 * @param {string} domainName
 * @returns {boolean}
 */
function isValidDomainFormat(domainName) {
    return /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.com$/.test(domainName);
}
