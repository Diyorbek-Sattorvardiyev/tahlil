from app import create_app
from extensions import db
from models import DictionaryWord, Rule, User
from utils.auth import hash_password
from utils.text_normalizer import normalize_word


DICTIONARY_DATA = {
    "POSITIVE": [
        "yaxshi",
        "zo'r",
        "ajoyib",
        "chiroyli",
        "qulay",
        "foydali",
        "mukammal",
        "xursand",
        "yoqimli",
        "tez",
        "sifatli",
        "ishonchli",
        "omadli",
        "ma'qul",
        "a'lo",
    ],
    "NEGATIVE": [
        "yomon",
        "xato",
        "sekin",
        "muammo",
        "qiyin",
        "dahshat",
        "yoqimsiz",
        "yaramaydi",
        "achinarli",
        "asabiy",
        "noqulay",
        "sifatsiz",
        "noroziman",
        "xafa",
        "zararli",
        "uzoq",
    ],
    "NEUTRAL": [
        "bugun",
        "kecha",
        "ertaga",
        "odam",
        "vaqt",
        "matn",
        "tizim",
        "xizmat",
        "foydalanuvchi",
    ],
    "NEGATION": ["emas", "yo'q", "hech", "zinhor", "aslo"],
    "INTENSIFIER": ["juda", "nihoyatda", "g'oyat", "o'ta", "ancha", "haddan", "tashqari"],
}


RULES = [
    ("Ijobiy so'z", "Ijobiy so'z topilsa +1", "POSITIVE_SCORE"),
    ("Salbiy so'z", "Salbiy so'z topilsa -1", "NEGATIVE_SCORE"),
    ("Inkor", "Inkor so'zdan keyin kelgan sentiment teskari baholansin", "NEGATION"),
    ("Kuchaytiruvchi", "Kuchaytiruvchi so'zdan keyin kelgan sentiment kuchliroq baholansin", "INTENSIFIER"),
    ("Neytral", "Agar score 0 bo'lsa, natija NEYTRAL", "NEUTRAL_SCORE"),
]


def seed_dictionary():
    for word_type, words in DICTIONARY_DATA.items():
        for word in words:
            weight = default_weight(word_type)
            normalized = normalize_word(word)
            item = DictionaryWord.query.filter_by(normalized_word=normalized).first()
            if item:
                item.type = word_type
                item.weight = weight
                item.normalized_word = normalized
                item.active = True
                item.source = "SEED"
            else:
                db.session.add(
                    DictionaryWord(
                        word=word,
                        normalized_word=normalized,
                        type=word_type,
                        weight=weight,
                        active=True,
                        source="SEED",
                    )
                )


def seed_rules():
    for name, description, rule_type in RULES:
        item = Rule.query.filter_by(rule_type=rule_type).first()
        if item:
            item.name = name
            item.description = description
            item.active = True
        else:
            db.session.add(Rule(name=name, description=description, rule_type=rule_type, active=True))


def seed_admin():
    admin = User.query.filter_by(email="admin@example.com").first()
    if not admin:
        db.session.add(
            User(
                full_name="Admin",
                email="admin@example.com",
                password_hash=hash_password("admin123"),
                role="ADMIN",
                active=True,
            )
        )


def default_weight(word_type):
    if word_type == "POSITIVE":
        return 1
    if word_type == "NEGATIVE":
        return -1
    if word_type == "INTENSIFIER":
        return 2
    return 0


def main():
    app = create_app()
    with app.app_context():
        db.create_all()
        seed_dictionary()
        seed_rules()
        seed_admin()
        db.session.commit()
        print("Seed tugadi. Admin: admin@example.com / admin123")


if __name__ == "__main__":
    main()
