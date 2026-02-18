"""LLM classification service using Google Gemini API."""
import json
import logging

from django.conf import settings

from .models import Ticket

logger = logging.getLogger(__name__)

FALLBACK_RESPONSE = {
    "suggested_category": "general",
    "suggested_priority": "low",
}

VALID_CATEGORIES = {c.value for c in Ticket.Category}
VALID_PRIORITIES = {p.value for p in Ticket.Priority}

SYSTEM_PROMPT = (
    "You are a support ticket classifier. "
    "Classify the issue into one of: billing, technical, account, general. "
    "Assign priority: low, medium, high, critical. "
    "Respond ONLY in JSON:\n"
    '{"category": "...", "priority": "..."}'
)


def classify_ticket(description: str) -> dict:
    """
    Classify a ticket description using Google Gemini API.

    Returns a dict with 'suggested_category' and 'suggested_priority'.
    Falls back to general/low on any failure.
    """
    api_key = getattr(settings, "GEMINI_API_KEY", None)

    if not api_key:
        logger.warning("GEMINI_API_KEY not configured, returning fallback classification.")
        return FALLBACK_RESPONSE.copy()

    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = f"{SYSTEM_PROMPT}\n\nTicket description:\n{description}"
        response = model.generate_content(prompt)

        content = response.text.strip()
        # Strip markdown code fences if present
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
