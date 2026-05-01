import json
import re

from flask import current_app


class GeminiService:
    def analyze(self, text):
        api_key = current_app.config.get("GEMINI_API_KEY")
        if not api_key:
            return self._unavailable("Gemini API key sozlanmagan")

        prompt = self._build_prompt(text)
        try:
            try:
                from google import genai

                client = genai.Client(api_key=api_key)
                response = client.models.generate_content(
                    model=current_app.config.get("GEMINI_MODEL", "gemini-2.5-flash"),
                    contents=prompt,
                )
                raw_text = getattr(response, "text", "") or ""
            except ImportError:
                import google.generativeai as genai_legacy

                genai_legacy.configure(api_key=api_key)
                model = genai_legacy.GenerativeModel(current_app.config.get("GEMINI_MODEL", "gemini-2.5-flash"))
                response = model.generate_content(prompt)
                raw_text = getattr(response, "text", "") or ""

            data = self._parse_json(raw_text)
            return {"available": True, "data": self._normalize(data), "error": None}
        except Exception as exc:
            current_app.logger.warning("Gemini analysis failed: %s", exc, exc_info=True)
            return self._unavailable(f"AI tahlil vaqtincha mavjud emas: {exc}")

    def _build_prompt(self, text):
        return f"""O'zbek tilidagi quyidagi matnni his-hayajon bo'yicha tahlil qil.
Faqat valid JSON formatda javob qaytar. Markdown, izoh yoki ```json ishlatma.

JSON structure:
{{
  "sentiment": "IJOBIY | SALBIY | NEYTRAL",
  "confidence": 0,
  "emotion": "xursandlik | g'azab | xafalik | hayrat | qo'rquv | qoniqish | norozilik | neytral",
  "reason": "qisqa izoh",
  "positive_phrases": [],
  "negative_phrases": [],
  "suggestion": "qisqa tavsiya"
}}

Qoidalar:
- Matn o'zbek tilida.
- Sarkazm, inkor, kuchaytiruvchi so'zlar va umumiy kontekstni hisobga ol.
- confidence 0 dan 100 gacha bo'lsin.
- Faqat JSON qaytar.

Matn:
{text}"""

    def _parse_json(self, raw_text):
        cleaned = raw_text.strip()
        cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()
        return json.loads(cleaned)

    def _normalize(self, data):
        sentiment = str(data.get("sentiment", "NEYTRAL")).upper().strip()
        if sentiment not in {"IJOBIY", "SALBIY", "NEYTRAL"}:
            sentiment = "NEYTRAL"
        confidence = data.get("confidence", 0)
        try:
            confidence = int(round(float(confidence)))
        except (TypeError, ValueError):
            confidence = 0
        confidence = max(0, min(confidence, 100))

        return {
            "sentiment": sentiment,
            "confidence": confidence,
            "emotion": str(data.get("emotion", "neytral")),
            "reason": str(data.get("reason", "")),
            "positive_phrases": data.get("positive_phrases") if isinstance(data.get("positive_phrases"), list) else [],
            "negative_phrases": data.get("negative_phrases") if isinstance(data.get("negative_phrases"), list) else [],
            "suggestion": str(data.get("suggestion", "")),
        }

    def _unavailable(self, message):
        return {"available": False, "data": None, "error": message}
