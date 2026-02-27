"""
Domain name filtering engine.
@analyst: Grounding source for stop-word lists.
@developer: Pure functions, no side effects. Easy to unit-test.
"""

import re
from typing import List

# --- Stop-word categories (expandable) ---
ADULT_WORDS = [
    "porn", "xxx", "sex", "nude", "naked", "mature", "milf",
    "tube", "cam", "escort", "fetish", "hentai", "erotic",
    "onlyfans", "stripper", "hookup", "booty", "busty",
]

GAMBLING_WORDS = [
    "casino", "bet", "poker", "slots", "jackpot", "gamble",
    "roulette", "blackjack", "lottery", "bingo", "wager",
    "sportbet", "betting", "1xbet", "stake",
]

DRUG_WORDS = [
    "weed", "cannabis", "marijuana", "drug", "pill", "pharma",
    "opioid", "cocaine", "meth", "heroin", "kratom", "cbd",
    "thc", "vape", "smoke", "tobacco",
]

PROFANITY_EN = [
    "fuck", "shit", "ass", "damn", "bitch", "crap",
    "dick", "cock", "cunt", "whore", "slut",
]

PROFANITY_RU = [
    "блят", "хуй", "пизд", "ебат", "сука", "мудак",
    "жоп", "дерьм", "шлюх",
]

SPAM_PATTERNS = [
    "buy-", "cheap-", "free-", "best-", "top-",
    "click", "deal", "discount", "promo",
]

# Combined master list
ALL_STOP_WORDS: List[str] = (
    ADULT_WORDS + GAMBLING_WORDS + DRUG_WORDS
    + PROFANITY_EN + PROFANITY_RU + SPAM_PATTERNS
)


def is_clean_domain(domain_name: str, extra_stop_words: List[str] | None = None) -> bool:
    """
    Check if a domain name is free of trigger/stop words.

    Args:
        domain_name: The domain to check (e.g., "example.com").
        extra_stop_words: Optional additional words to filter.

    Returns:
        True if the domain is clean, False if it contains a trigger word.
    """
    name_lower = domain_name.lower().replace(".com", "").replace(".", "")
    stop_list = ALL_STOP_WORDS + (extra_stop_words or [])

    for word in stop_list:
        if word in name_lower:
            return False

    return True


def is_valid_domain_format(domain_name: str) -> bool:
    """Basic validation that the string looks like a domain."""
    pattern = r"^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.com$"
    return bool(re.match(pattern, domain_name))


def filter_candidates(domains: List[str], extra_stop_words: List[str] | None = None) -> List[str]:
    """
    Filter a list of domain names, removing those with stop words
    and invalid formats.

    Returns:
        List of clean, valid domain names.
    """
    return [
        d for d in domains
        if is_valid_domain_format(d) and is_clean_domain(d, extra_stop_words)
    ]
