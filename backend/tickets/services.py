"""LLM classification service using OpenAI API."""
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
    Classify a ticket description using OpenAI API.

    Returns a dict with 'suggested_category' and 'suggested_priority'.
    Falls back to general/low on any failure.
    """
    api_key = settings.OPENAI_API_KEY

    if not api_key:
        logger.warning("OPENAI_API_KEY not configured, returning fallback classification.")
        return FALLBACK_RESPONSE.copy()

    try:
        import openai

        client = openai.OpenAI(api_key=api_key)

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": description},
            ],
            temperature=0.1,
            max_tokens=100,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content.strip()
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
