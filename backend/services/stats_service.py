import json
from collections import Counter
from datetime import datetime, timedelta

from sqlalchemy import func

from extensions import db
from models import AnalysisHistory, AppLog, DictionaryWord, Rule, User


class StatsService:
    def user_summary(self, user_id):
        base = AnalysisHistory.query.filter_by(user_id=user_id)
        total = base.count()
        avg = db.session.query(func.avg(AnalysisHistory.final_confidence)).filter_by(user_id=user_id).scalar() or 0
        return {
            "total_analyses": total,
            "positive": base.filter_by(final_sentiment="IJOBIY").count(),
            "negative": base.filter_by(final_sentiment="SALBIY").count(),
            "neutral": base.filter_by(final_sentiment="NEYTRAL").count(),
            "dataset_used": base.filter_by(mode="DATASET").count(),
            "gemini_used": base.filter_by(mode="GEMINI").count(),
            "hybrid_used": base.filter_by(mode="HYBRID").count(),
            "average_confidence": int(round(avg)),
        }

    def daily(self, user_id=None, days=30):
        since = datetime.utcnow() - timedelta(days=days)
        query = db.session.query(func.date(AnalysisHistory.created_at), func.count(AnalysisHistory.id)).filter(
            AnalysisHistory.created_at >= since
        )
        if user_id is not None:
            query = query.filter(AnalysisHistory.user_id == user_id)
        rows = query.group_by(func.date(AnalysisHistory.created_at)).order_by(func.date(AnalysisHistory.created_at)).all()
        return [{"date": str(date), "count": count} for date, count in rows]

    def distribution(self, user_id):
        summary = self.user_summary(user_id)
        total = summary["total_analyses"] or 1
        return {
            "IJOBIY": round(summary["positive"] * 100 / total, 2),
            "SALBIY": round(summary["negative"] * 100 / total, 2),
            "NEYTRAL": round(summary["neutral"] * 100 / total, 2),
        }

    def top_words(self, user_id=None, limit=20):
        query = AnalysisHistory.query
        if user_id is not None:
            query = query.filter_by(user_id=user_id)
        counter = Counter()
        for history in query.all():
            for item in json.loads(history.detected_words_json or "[]"):
                if item.get("type") in {"POSITIVE", "NEGATIVE"}:
                    counter[item.get("word")] += 1
        return [{"word": word, "count": count} for word, count in counter.most_common(limit)]

    def recent(self, user_id, limit=10):
        rows = AnalysisHistory.query.filter_by(user_id=user_id).order_by(AnalysisHistory.created_at.desc()).limit(limit).all()
        return [row.to_dict() for row in rows]

    def admin_summary(self):
        today = datetime.utcnow().date()
        today_start = datetime(today.year, today.month, today.day)
        avg = db.session.query(func.avg(AnalysisHistory.final_confidence)).scalar() or 0
        return {
            "total_users": User.query.count(),
            "active_users": User.query.filter_by(active=True).count(),
            "total_analyses": AnalysisHistory.query.count(),
            "today_analyses": AnalysisHistory.query.filter(AnalysisHistory.created_at >= today_start).count(),
            "gemini_used": AnalysisHistory.query.filter_by(mode="GEMINI").count(),
            "dataset_used": AnalysisHistory.query.filter_by(mode="DATASET").count(),
            "hybrid_used": AnalysisHistory.query.filter_by(mode="HYBRID").count(),
            "average_confidence": int(round(avg)),
            "dictionary_words": DictionaryWord.query.count(),
            "active_rules": Rule.query.filter_by(active=True).count(),
            "top_users": self.admin_user_stats(limit=5),
        }

    def admin_user_stats(self, limit=None):
        query = (
            db.session.query(
                User.id,
                User.full_name,
                User.email,
                User.role,
                User.active,
                func.count(AnalysisHistory.id).label("analysis_count"),
            )
            .outerjoin(AnalysisHistory, AnalysisHistory.user_id == User.id)
            .group_by(User.id)
            .order_by(func.count(AnalysisHistory.id).desc())
        )
        if limit:
            query = query.limit(limit)
        return [
            {
                "id": row.id,
                "full_name": row.full_name,
                "email": row.email,
                "role": row.role,
                "active": row.active,
                "analysis_count": row.analysis_count,
            }
            for row in query.all()
        ]

    def admin_logs(self, limit=20):
        rows = AppLog.query.order_by(AppLog.created_at.desc()).limit(limit).all()
        return [row.to_dict() for row in rows]
