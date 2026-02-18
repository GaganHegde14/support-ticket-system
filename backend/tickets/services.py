"""LLM classification service using Groq API.

Uses Groq (Llama 3.3 70B) for fast, cost-effective ticket classification.
The prompt instructs the model to return a JSON object with category and priority.
All failures are handled gracefully — the system falls back to safe defaults.
"""
import json
import logging

from django.conf import settings

logger = logging.getLogger(__name__)

FALLBACK_RESPONSE = {
    "suggested_category": "general",
    "suggested_priority": "low",
}

VALID_CATEGORIES = {"billing", "technical", "account", "general"}
VALID_PRIORITIES = {"low", "medium", "high", "critical"}

# Prompt design:
# - Explicit list of valid categories and priorities to constrain output
# - JSON-only response format to simplify parsing
# - Clear role assignment for consistent behavior
CLASSIFICATION_PROMPT = (
    "You are a support ticket classifier for a software company.\n"
    "Given a ticket description, classify it into exactly one category "
    "and assign a priority level.\n\n"
    "Categories (pick one): billing, technical, account, general\n"
    "Priority levels (pick one): low, medium, high, critical\n\n"
    "Rules:\n"
    "- billing: payment issues, invoices, charges, subscriptions, refunds\n"
    "- technical: bugs, errors, crashes, performance, API issues\n"
    "- account: login problems, password resets, profile, permissions\n"
    "- general: everything else\n"
    "- critical: system down, data loss, security breach\n"
    "- high: major feature broken, blocking issue\n"
    "- medium: degraded functionality, workaround exists\n"
    "- low: minor issue, cosmetic, feature request\n\n"
    "Respond with ONLY a JSON object (no markdown, no explanation):\n"
    '{"category": "...", "priority": "..."}'
)


def classify_ticket(description: str) -> dict:
    """
    Classify a ticket description using Groq API (Llama 3.3 70B).

    Returns a dict with 'suggested_category' and 'suggested_priority'.
    Falls back to general/low on any failure.
    """
    api_key = getattr(settings, "GROQ_API_KEY", None)

    if not api_key:
        logger.warning("GROQ_API_KEY not configured, returning fallback classification.")
        return FALLBACK_RESPONSE.copy()

    try:
        from groq import Groq

        client = Groq(api_key=api_key)

        prompt = f"{CLASSIFICATION_PROMPT}\n\nTicket description:\n{description}"
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=100,
        )

        content = response.choices[0].message.content.strip()
        # Strip markdown code fences if the model wraps its response
        if content.startswith("```"):
            content = content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        parsed = json.loads(content)

        category = parsed.get("category", "").lower().strip()
        priority = parsed.get("priority", "").lower().strip()

        # Validate returned values against allowed choices
        if category not in VALID_CATEGORIES:
            logger.warning(
                "LLM returned invalid category '%s', falling back to 'general'.",
                category,
            )
            category = "general"

        if priority not in VALID_PRIORITIES:
            logger.warning(
                "LLM returned invalid priority '%s', falling back to 'low'.",
                priority,
            )
            priority = "low"

        return {
            "suggested_category": category,
            "suggested_priority": priority,
        }

    except json.JSONDecodeError:
        logger.exception("Failed to parse LLM JSON response.")
        return FALLBACK_RESPONSE.copy()
    except Exception:
        logger.exception("LLM classification failed.")
        return FALLBACK_RESPONSE.copy()
