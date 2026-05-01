import csv
import io

from extensions import db
from models import DictionaryWord
from utils.text_normalizer import normalize_word
from utils.validators import VALID_WORD_TYPES


class DictionaryImportService:
    def import_csv(self, file_storage):
        stream = io.StringIO(file_storage.stream.read().decode("utf-8-sig"))
        reader = csv.DictReader(stream)
        if not reader.fieldnames or not {"word", "type", "weight"}.issubset(set(reader.fieldnames)):
            raise ValueError("CSV ustunlari word,type,weight formatida bo'lishi kerak")

        inserted = 0
        updated = 0
        skipped = 0
        errors = []

        for line_number, row in enumerate(reader, start=2):
            raw_word = str(row.get("word", "")).strip()
            normalized = normalize_word(raw_word)
            word_type = str(row.get("type", "")).strip().upper()
            try:
                weight = float(row.get("weight", 0))
            except (TypeError, ValueError):
                weight = 0

            if not normalized or word_type not in VALID_WORD_TYPES:
                skipped += 1
                errors.append({"line": line_number, "word": raw_word, "error": "word yoki type noto'g'ri"})
                continue

            item = DictionaryWord.query.filter_by(normalized_word=normalized).first()
            if item:
                item.word = raw_word.lower()
                item.normalized_word = normalized
                item.type = word_type
                item.weight = weight
                item.active = True
                item.source = "CSV_IMPORT"
                updated += 1
            else:
                db.session.add(
                    DictionaryWord(
                        word=raw_word.lower(),
                        normalized_word=normalized,
                        type=word_type,
                        weight=weight,
                        active=True,
                        source="CSV_IMPORT",
                    )
                )
                inserted += 1

        db.session.commit()
        return {"inserted": inserted, "updated": updated, "skipped": skipped, "errors": errors}
