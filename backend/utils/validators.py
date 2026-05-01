import re


VALID_WORD_TYPES = {"POSITIVE", "NEGATIVE", "NEUTRAL", "NEGATION", "INTENSIFIER"}
VALID_MODES = {"DATASET", "GEMINI", "HYBRID"}
VALID_SENTIMENTS = {"IJOBIY", "SALBIY", "NEYTRAL"}
VALID_ROLES = {"USER", "ADMIN"}


def normalize_email(email):
    return (email or "").strip().lower()


def is_valid_email(email):
    if not email:
        return False
    return re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email) is not None


def require_fields(payload, fields):
    missing = [field for field in fields if payload.get(field) in (None, "")]
    if missing:
        return f"Majburiy maydonlar to'ldirilmagan: {', '.join(missing)}"
    return None


def validate_text(text, max_length):
    if text is None or not str(text).strip():
        return "Matn bo'sh bo'lishi mumkin emas"
    if len(str(text)) > max_length:
        return f"Matn uzunligi {max_length} belgidan oshmasligi kerak"
    return None
