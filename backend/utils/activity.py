import json

from extensions import db
from models import AppLog


def log_activity(level, message, context=None):
    db.session.add(
        AppLog(
            level=str(level).upper(),
            message=str(message),
            context_json=json.dumps(context or {}, ensure_ascii=False),
        )
    )
