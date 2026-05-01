from flask import Blueprint, g, request

from services.stats_service import StatsService
from utils.auth import jwt_required
from utils.response import success_response


stats_bp = Blueprint("stats", __name__)


@stats_bp.get("/stats/summary")
@jwt_required
def summary():
    return success_response(StatsService().user_summary(g.current_user.id))


@stats_bp.get("/stats/daily")
@jwt_required
def daily():
    days = min(max(int(request.args.get("days", 30)), 1), 365)
    return success_response(StatsService().daily(user_id=g.current_user.id, days=days))


@stats_bp.get("/stats/sentiment-distribution")
@jwt_required
def sentiment_distribution():
    return success_response(StatsService().distribution(g.current_user.id))


@stats_bp.get("/stats/top-words")
@jwt_required
def top_words():
    limit = min(max(int(request.args.get("limit", 20)), 1), 100)
    return success_response(StatsService().top_words(user_id=g.current_user.id, limit=limit))


@stats_bp.get("/stats/recent-analyses")
@jwt_required
def recent_analyses():
    limit = min(max(int(request.args.get("limit", 10)), 1), 50)
    return success_response(StatsService().recent(g.current_user.id, limit=limit))
