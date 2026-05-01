import json
from datetime import datetime

from flask import Blueprint, g, request

from extensions import db
from models import AnalysisHistory
from utils.auth import jwt_required
from utils.response import error_response, success_response


history_bp = Blueprint("history", __name__)


@history_bp.get("")
@jwt_required
def list_history():
    return success_response(_history_payload(AnalysisHistory.query.filter_by(user_id=g.current_user.id)))


@history_bp.get("/<int:history_id>")
@jwt_required
def get_history(history_id):
    item = AnalysisHistory.query.filter_by(id=history_id, user_id=g.current_user.id).first()
    if not item:
        return error_response("Tahlil tarixi topilmadi", 404)
    return success_response(_history_detail(item))


@history_bp.delete("/<int:history_id>")
@jwt_required
def delete_history(history_id):
    item = AnalysisHistory.query.filter_by(id=history_id, user_id=g.current_user.id).first()
    if not item:
        return error_response("Tahlil tarixi topilmadi", 404)
    db.session.delete(item)
    db.session.commit()
    return success_response({"deleted": True})


def _history_payload(query):
    sentiment = request.args.get("sentiment")
    mode = request.args.get("mode")
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")
    search = request.args.get("search")

    if sentiment:
        query = query.filter(AnalysisHistory.final_sentiment == sentiment.upper())
    if mode:
        query = query.filter(AnalysisHistory.mode == mode.upper())
    if date_from:
        parsed = _parse_date(date_from)
        if not parsed:
            return {"items": [], "pagination": {"page": 1, "size": 0, "total": 0, "pages": 0}}
        query = query.filter(AnalysisHistory.created_at >= parsed)
    if date_to:
        parsed = _parse_date(date_to)
        if not parsed:
            return {"items": [], "pagination": {"page": 1, "size": 0, "total": 0, "pages": 0}}
        query = query.filter(AnalysisHistory.created_at <= parsed.replace(hour=23, minute=59, second=59))
    if search:
        query = query.filter(AnalysisHistory.original_text.ilike(f"%{search}%"))

    page = max(int(request.args.get("page", 1)), 1)
    size = min(max(int(request.args.get("size", 10)), 1), 100)
    pagination = query.order_by(AnalysisHistory.created_at.desc()).paginate(page=page, per_page=size, error_out=False)
    return {
        "items": [item.to_dict() for item in pagination.items],
        "pagination": {"page": page, "size": size, "total": pagination.total, "pages": pagination.pages},
    }


def _history_detail(item):
    data = item.to_dict(include_details=True)
    data["detected_words"] = json.loads(item.detected_words_json or "[]")
    data["explanation"] = json.loads(item.explanation_json or "[]")
    data["gemini_result"] = json.loads(item.gemini_result_json or "{}")
    return data


def _parse_date(value):
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        return None
