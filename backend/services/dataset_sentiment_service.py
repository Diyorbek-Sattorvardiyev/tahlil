from models import DictionaryWord, Rule
from utils.text_normalizer import tokenize


class DatasetSentimentService:
    def analyze(self, text):
        words = tokenize(text)
        dictionary = {
            item.normalized_word: item
            for item in DictionaryWord.query.filter_by(active=True).all()
        }
        active_rules = {rule.rule_type for rule in Rule.query.filter_by(active=True).all()}

        score = 0.0
        positive_count = 0
        negative_count = 0
        neutral_count = 0
        detected_words = []
        explanation = []
        pending_negation = None
        pending_intensifier = None

        for index, word in enumerate(words):
            entry = dictionary.get(word)
            if not entry:
                neutral_count += 1
                continue

            word_type = entry.type.upper()

            if word_type == "NEGATION":
                detected_words.append(
                    {
                        "word": word,
                        "type": "NEGATION",
                        "position": index,
                        "effect": "keyingi sentiment so'z teskari baholanadi",
                    }
                )
                if "NEGATION" in active_rules:
                    pending_negation = word
                    explanation.append(f"'{word}' inkor so'z sifatida aniqlandi")
                continue

            if word_type == "INTENSIFIER":
                detected_words.append(
                    {
                        "word": word,
                        "type": "INTENSIFIER",
                        "position": index,
                        "effect": "keyingi sentiment so'z kuchayadi",
                    }
                )
                if "INTENSIFIER" in active_rules:
                    pending_intensifier = word
                    explanation.append(f"'{word}' kuchaytiruvchi so'z sifatida aniqlandi")
                continue

            if word_type == "NEUTRAL":
                neutral_count += 1
                detected_words.append({"word": word, "type": "NEUTRAL", "position": index, "score": 0})
                continue

            if word_type == "POSITIVE" and "POSITIVE_SCORE" not in active_rules:
                continue
            if word_type == "NEGATIVE" and "NEGATIVE_SCORE" not in active_rules:
                continue

            base_score = abs(float(entry.weight or 1))
            if word_type == "NEGATIVE":
                base_score *= -1
            original_score = base_score

            if pending_negation:
                base_score *= -1
                explanation.append(f"'{pending_negation}' sabab '{word}' qiymati teskari baholandi")
                pending_negation = None

            if pending_intensifier:
                multiplier = self._intensifier_multiplier(dictionary.get(pending_intensifier))
                base_score *= multiplier
                explanation.append(f"'{word}' '{pending_intensifier}' ta'sirida {multiplier:g} marta kuchaydi")
                pending_intensifier = None

            score += base_score
            if base_score > 0:
                positive_count += 1
            elif base_score < 0:
                negative_count += 1

            detected_words.append(
                {
                    "word": word,
                    "type": word_type,
                    "position": index,
                    "score": self._clean_number(base_score),
                    "base_score": self._clean_number(original_score),
                }
            )
            label = "ijobiy" if base_score > 0 else "salbiy"
            explanation.append(f"'{word}' {label} signal sifatida {self._clean_number(base_score)} ball berdi")

        sentiment = self._sentiment_from_score(score, active_rules)
        confidence = self._confidence(score, positive_count, negative_count, len(words))
        explanation.append(f"Umumiy score {self._clean_number(score)} bo'lgani uchun natija {sentiment}")

        return {
            "sentiment": sentiment,
            "score": self._clean_number(score),
            "confidence": confidence,
            "positive_count": positive_count,
            "negative_count": negative_count,
            "neutral_count": neutral_count,
            "detected_words": detected_words,
            "explanation": explanation,
        }

    def _intensifier_multiplier(self, entry):
        if not entry or not entry.weight:
            return 2
        return max(1, abs(float(entry.weight)))

    def _sentiment_from_score(self, score, active_rules):
        if score > 0:
            return "IJOBIY"
        if score < 0:
            return "SALBIY"
        return "NEYTRAL" if "NEUTRAL_SCORE" in active_rules else "NEYTRAL"

    def _confidence(self, score, positive_count, negative_count, total_words):
        if total_words == 0:
            return 0
        sentiment_hits = positive_count + negative_count
        if sentiment_hits == 0:
            return 50
        strength = min(abs(score) / max(sentiment_hits, 1), 3) / 3
        coverage = min(sentiment_hits / max(total_words, 1), 1)
        return int(round(55 + (strength * 30) + (coverage * 15)))

    def _clean_number(self, value):
        value = float(value)
        if value.is_integer():
            return int(value)
        return round(value, 2)
