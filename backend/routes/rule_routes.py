from flask import Blueprint, request

from extensions import db
from models import Rule
from utils.auth import admin_required, jwt_required
from utils.response import error_response, success_response
from utils.validators import require_fields


rule_bp = Blueprint("rules", __name__)


@rule_bp.get("")
@jwt_required
def list_rules():
    rules = Rule.query.order_by(Rule.id.asc()).all()
    return success_response([rule.to_dict() for rule in rules])


@rule_bp.post("")
@admin_required
def create_rule():
    payload = request.get_json(silent=True) or {}
    error = require_fields(payload, ["name", "description", "rule_type"])
    if error:
        return error_response(error)

    rule = Rule(
        name=str(payload["name"]).strip(),
        description=str(payload["description"]).strip(),
        rule_type=str(payload["rule_type"]).strip().upper(),
        active=bool(payload.get("active", True)),
    )
    db.session.add(rule)
    db.session.commit()
    return success_response(rule.to_dict(), 201)


@rule_bp.put("/<int:rule_id>")
@admin_required
def update_rule(rule_id):
    rule = Rule.query.get_or_404(rule_id)
    payload = request.get_json(silent=True) or {}

    for field in ("name", "description", "rule_type"):
        if field in payload:
            setattr(rule, field, str(payload[field]).strip())
    if "active" in payload:
        rule.active = bool(payload["active"])

    db.session.commit()
    return success_response(rule.to_dict())


@rule_bp.delete("/<int:rule_id>")
@admin_required
def delete_rule(rule_id):
    rule = Rule.query.get_or_404(rule_id)
    db.session.delete(rule)
    db.session.commit()
    return success_response({"deleted": True})
