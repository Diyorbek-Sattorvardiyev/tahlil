from flask import Blueprint, g, request

from extensions import db
from models import User
from utils.auth import create_token, hash_password, jwt_required, verify_password
from utils.response import error_response, success_response
from utils.validators import is_valid_email, normalize_email, require_fields


auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/register")
def register():
    payload = request.get_json(silent=True) or {}
    error = require_fields(payload, ["full_name", "email", "password"])
    if error:
        return error_response(error)

    email = normalize_email(payload["email"])
    if not is_valid_email(email):
        return error_response("Email formati noto'g'ri")
    if len(str(payload["password"])) < 6:
        return error_response("Parol kamida 6 ta belgidan iborat bo'lishi kerak")
    if User.query.filter_by(email=email).first():
        return error_response("Bu email allaqachon ro'yxatdan o'tgan", 409)

    role = str(payload.get("role", "USER")).upper()
    if role not in {"USER", "ADMIN"}:
        role = "USER"

    user = User(
        full_name=str(payload["full_name"]).strip(),
        email=email,
        password_hash=hash_password(str(payload["password"])),
        role=role,
    )
    db.session.add(user)
    db.session.commit()

    return success_response({"user": user.to_dict(), "token": create_token(user)}, 201)


@auth_bp.post("/login")
def login():
    payload = request.get_json(silent=True) or {}
    error = require_fields(payload, ["email", "password"])
    if error:
        return error_response(error)

    user = User.query.filter_by(email=normalize_email(payload["email"])).first()
    if not user or not user.active or not verify_password(user.password_hash, str(payload["password"])):
        return error_response("Email yoki parol noto'g'ri", 401)

    return success_response({"user": user.to_dict(), "token": create_token(user)})


@auth_bp.get("/me")
@jwt_required
def me():
    return success_response({"user": g.current_user.to_dict()})
