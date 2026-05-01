import json

from flask import Blueprint, current_app, g, request

from extensions import db
from models import AnalysisHistory
from services.hybrid_service import HybridService
from utils.auth import jwt_required
from utils.response import error_response, success_response
from utils.text_normalizer import normalize_text
from utils.validators import VALID_MODES, validate_text


analysis_bp = Blueprint("analysis", __name__)


@analysis_bp.post("/analyze")
@jwt_required
def analyze():
    payload = request.get_json(silent=True) or {}
    text = payload.get("text")
    mode = str(payload.get("mode", "HYBRID")).upper()

    error = validate_text(text, current_app.config["MAX_TEXT_LENGTH"])
    if error:
        return error_response(error)
    if mode not in VALID_MODES:
        return error_response("mode DATASET, GEMINI yoki HYBRID bo'lishi kerak")

    result = HybridService().analyze(str(text).strip(), mode)
    dataset = result.get("dataset_result") or {}
    gemini = result.get("gemini_result") or {}
    final = result["final_result"]

    history = AnalysisHistory(
        user_id=g.current_user.id,
        legacy_text=str(text).strip(),
        original_text=str(text).strip(),
        normalized_text=normalize_text(text),
        mode=mode,
        dataset_sentiment=dataset.get("sentiment"),
        dataset_score=dataset.get("score"),
        dataset_confidence=dataset.get("confidence"),
        dataset_positive_count=dataset.get("positive_count", 0),
        dataset_negative_count=dataset.get("negative_count", 0),
        dataset_neutral_count=dataset.get("neutral_count", 0),
        gemini_sentiment=gemini.get("sentiment"),
        gemini_confidence=gemini.get("confidence"),
        gemini_emotion=gemini.get("emotion"),
        gemini_reason=gemini.get("reason"),
        final_sentiment=final.get("sentiment"),
        final_confidence=final.get("confidence"),
        final_method=final.get("method"),
        ai_available=bool(final.get("ai_available")),
        detected_words_json=json.dumps(dataset.get("detected_words", []), ensure_ascii=False),
        explanation_json=json.dumps(dataset.get("explanation", []), ensure_ascii=False),
        gemini_result_json=json.dumps(gemini if gemini else {}, ensure_ascii=False),
    )
    db.session.add(history)
    db.session.commit()

    return success_response(result)
