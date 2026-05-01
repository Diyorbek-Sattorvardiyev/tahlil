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


@admin_bp.get("/stats/daily")
@admin_required
def admin_daily():
    days = min(max(int(request.args.get("days", 30)), 1), 365)
    return success_response(StatsService().daily(days=days))


@admin_bp.get("/logs")
@admin_required
def admin_logs():
    limit = min(max(int(request.args.get("limit", 20)), 1), 100)
    return success_response(StatsService().admin_logs(limit=limit))
