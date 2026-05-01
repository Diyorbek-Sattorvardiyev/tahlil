from flask import Blueprint, request

from models import AnalysisHistory
from routes.history_routes import _history_payload
from services.stats_service import StatsService
from utils.auth import admin_required
from utils.response import success_response


admin_bp = Blueprint("admin", __name__)


@admin_bp.get("/history")
@admin_required
def admin_history():
    query = AnalysisHistory.query
    user_id = request.args.get("user_id")
    if user_id:
        query = query.filter(AnalysisHistory.user_id == int(user_id))
    return success_response(_history_payload(query))


@admin_bp.get("/stats/summary")
@admin_required
def admin_summary():
    return success_response(StatsService().admin_summary())


@admin_bp.get("/stats/users")
@admin_required
def admin_user_stats():
    return success_response(StatsService().admin_user_stats())
