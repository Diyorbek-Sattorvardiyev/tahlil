from datetime import datetime, timedelta
from functools import wraps

import jwt
from flask import current_app, g, request
from werkzeug.security import check_password_hash, generate_password_hash

from models import User
from utils.response import error_response


def hash_password(password):
    return generate_password_hash(password)


def verify_password(password_hash, password):
    return check_password_hash(password_hash, password)


def create_token(user):
    now = datetime.utcnow()
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "iat": now,
        "exp": now + current_app.config.get("JWT_EXPIRATION_DELTA", timedelta(hours=24)),
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET_KEY"], algorithm=current_app.config["JWT_ALGORITHM"])


def _extract_token():
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    return header.split(" ", 1)[1].strip()


def jwt_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = _extract_token()
        if not token:
            return error_response("Authorization token topilmadi", 401)
        try:
            payload = jwt.decode(
                token,
                current_app.config["JWT_SECRET_KEY"],
                algorithms=[current_app.config["JWT_ALGORITHM"]],
            )
        except jwt.ExpiredSignatureError:
            return error_response("Token muddati tugagan", 401)
        except jwt.InvalidTokenError:
            return error_response("Token noto'g'ri", 401)

        user = User.query.get(payload.get("sub"))
        if not user or not user.active:
            return error_response("Foydalanuvchi topilmadi", 401)
        g.current_user = user
        return fn(*args, **kwargs)

    return wrapper


def admin_required(fn):
    @wraps(fn)
    @jwt_required
    def wrapper(*args, **kwargs):
        if g.current_user.role != "ADMIN":
            return error_response("Bu amal uchun ADMIN huquqi kerak", 403)
        return fn(*args, **kwargs)

    return wrapper
