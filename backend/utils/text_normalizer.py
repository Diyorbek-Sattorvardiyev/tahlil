import re
import unicodedata


APOSTROPHE_TRANSLATION = str.maketrans(
    {
        "‘": "'",
        "’": "'",
        "`": "'",
        "ʼ": "'",
        "ʻ": "'",
        "ʽ": "'",
    }
)

TOKEN_PATTERN = re.compile(r"[a-z0-9']+", re.IGNORECASE)


def normalize_text(value):
    text = unicodedata.normalize("NFKC", str(value or "")).lower()
    text = text.replace("oʻ", "o'").replace("gʻ", "g'")
    text = text.replace("o‘", "o'").replace("g‘", "g'")
    text = text.translate(APOSTROPHE_TRANSLATION)
    text = re.sub(r"[^a-z0-9'\s-]", " ", text)
    text = re.sub(r"[-_]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def normalize_word(value):
    return normalize_text(value).replace(" ", "")


def tokenize(value):
    return TOKEN_PATTERN.findall(normalize_text(value))
