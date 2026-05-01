from datetime import datetime

from extensions import db


class TimestampMixin:
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(180), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="USER")
    active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    histories = db.relationship("AnalysisHistory", backref="user", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "role": self.role,
            "active": self.active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class DictionaryWord(db.Model):
    __tablename__ = "dictionary_words"

    id = db.Column(db.Integer, primary_key=True)
    word = db.Column(db.String(120), nullable=False, index=True)
    normalized_word = db.Column(db.String(120), nullable=False, unique=True, index=True)
    type = db.Column(db.String(30), nullable=False, index=True)
    weight = db.Column(db.Float, nullable=False, default=0)
    active = db.Column(db.Boolean, nullable=False, default=True, index=True)
    source = db.Column(db.String(30), nullable=False, default="ADMIN")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "word": self.word,
            "normalized_word": self.normalized_word,
            "type": self.type,
            "weight": self.weight,
            "active": self.active,
            "source": self.source,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class AnalysisHistory(db.Model):
    __tablename__ = "analysis_history"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    legacy_text = db.Column("text", db.Text)
    original_text = db.Column(db.Text, nullable=False)
    normalized_text = db.Column(db.Text, nullable=False)
    mode = db.Column(db.String(20), nullable=False, index=True)

    dataset_sentiment = db.Column(db.String(20))
    dataset_score = db.Column(db.Float)
    dataset_confidence = db.Column(db.Integer)
    dataset_positive_count = db.Column(db.Integer, nullable=False, default=0)
    dataset_negative_count = db.Column(db.Integer, nullable=False, default=0)
    dataset_neutral_count = db.Column(db.Integer, nullable=False, default=0)

    gemini_sentiment = db.Column(db.String(20))
    gemini_confidence = db.Column(db.Integer)
    gemini_emotion = db.Column(db.String(80))
    gemini_reason = db.Column(db.Text)

    final_sentiment = db.Column(db.String(20), index=True)
    final_confidence = db.Column(db.Integer)
    final_method = db.Column(db.String(40))
    ai_available = db.Column(db.Boolean, nullable=False, default=False)

    detected_words_json = db.Column(db.Text)
    explanation_json = db.Column(db.Text)
    gemini_result_json = db.Column(db.Text)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)

    def to_dict(self, include_details=False):
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "original_text": self.original_text,
            "normalized_text": self.normalized_text,
            "text": self.original_text,
            "mode": self.mode,
            "dataset_sentiment": self.dataset_sentiment,
            "dataset_score": self.dataset_score,
            "dataset_confidence": self.dataset_confidence,
            "dataset_positive_count": self.dataset_positive_count,
            "dataset_negative_count": self.dataset_negative_count,
            "dataset_neutral_count": self.dataset_neutral_count,
            "gemini_sentiment": self.gemini_sentiment,
            "gemini_confidence": self.gemini_confidence,
            "gemini_emotion": self.gemini_emotion,
            "gemini_reason": self.gemini_reason,
            "final_sentiment": self.final_sentiment,
            "final_confidence": self.final_confidence,
            "final_method": self.final_method,
            "ai_available": self.ai_available,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_details:
            data.update(
                {
                    "detected_words_json": self.detected_words_json,
                    "explanation_json": self.explanation_json,
                    "gemini_result_json": self.gemini_result_json,
                }
            )
        return data


class Rule(db.Model):
    __tablename__ = "rules"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=False)
    rule_type = db.Column(db.String(50), nullable=False, index=True)
    active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "rule_type": self.rule_type,
            "active": self.active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class AppLog(db.Model):
    __tablename__ = "app_logs"

    id = db.Column(db.Integer, primary_key=True)
    level = db.Column(db.String(20), nullable=False, index=True)
    message = db.Column(db.Text, nullable=False)
    context_json = db.Column(db.Text)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "level": self.level,
            "message": self.message,
            "context_json": self.context_json,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
