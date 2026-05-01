from services.dataset_sentiment_service import DatasetSentimentService
from services.gemini_service import GeminiService


class HybridService:
    def __init__(self):
        self.dataset_service = DatasetSentimentService()
        self.gemini_service = GeminiService()

    def analyze(self, text, mode):
        mode = mode.upper()
        dataset_result = None
        gemini_result = None
        gemini_error = None
        ai_available = False

        if mode in {"DATASET", "HYBRID"}:
            dataset_result = self.dataset_service.analyze(text)

        if mode in {"GEMINI", "HYBRID"}:
            gemini_response = self.gemini_service.analyze(text)
            ai_available = gemini_response["available"]
            if ai_available:
                gemini_result = gemini_response["data"]
            else:
                gemini_error = gemini_response["error"] or "AI tahlil vaqtincha mavjud emas"
                if dataset_result is None:
                    dataset_result = self.dataset_service.analyze(text)

        final_result = self._final_result(mode, dataset_result, gemini_result, ai_available)
        response = {
            "dataset_result": dataset_result,
            "gemini_result": gemini_result,
            "final_result": final_result,
        }
        if gemini_error:
            response["gemini_error"] = gemini_error
        return response

    def _final_result(self, mode, dataset_result, gemini_result, ai_available):
        if mode == "DATASET" or not gemini_result:
            return {
                "sentiment": dataset_result["sentiment"],
                "confidence": dataset_result["confidence"],
                "method": "DATASET" if mode == "DATASET" else "DATASET_FALLBACK",
                "ai_available": ai_available,
            }

        if mode == "GEMINI" and gemini_result:
            return {
                "sentiment": gemini_result["sentiment"],
                "confidence": gemini_result["confidence"],
                "method": "GEMINI",
                "ai_available": ai_available,
            }

        if dataset_result["sentiment"] == gemini_result["sentiment"]:
            confidence = min(100, int(round((dataset_result["confidence"] + gemini_result["confidence"]) / 2 + 8)))
            sentiment = gemini_result["sentiment"]
            method = "HYBRID_AGREEMENT"
        else:
            if gemini_result["confidence"] >= dataset_result["confidence"]:
                confidence = gemini_result["confidence"]
                sentiment = gemini_result["sentiment"]
                method = "GEMINI_CONFIDENCE"
            else:
                confidence = dataset_result["confidence"]
                sentiment = dataset_result["sentiment"]
                method = "DATASET_CONFIDENCE"

        return {
            "sentiment": sentiment,
            "confidence": confidence,
            "method": method,
            "ai_available": ai_available,
        }
