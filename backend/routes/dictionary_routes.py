from flask import Blueprint, request

from extensions import db
from models import DictionaryWord
from services.import_service import DictionaryImportService
from utils.auth import admin_required, jwt_required
from utils.response import error_response, success_response
from utils.text_normalizer import normalize_word
from utils.validators import VALID_WORD_TYPES, require_fields


dictionary_bp = Blueprint("dictionary", __name__)


@dictionary_bp.get("")
@jwt_required
def list_words():
    query = DictionaryWord.query
    word_type = request.args.get("type")
    search = request.args.get("search")

    if word_type:
        word_type = word_type.upper()
        if word_type not in VALID_WORD_TYPES:
            return error_response("Noto'g'ri lug'at turi")
        query = query.filter(DictionaryWord.type == word_type)
    if search:
        query = query.filter(DictionaryWord.normalized_word.ilike(f"%{normalize_word(search)}%"))

    page_arg = request.args.get("page")
    size_arg = request.args.get("size")
    query = query.order_by(DictionaryWord.type.asc(), DictionaryWord.normalized_word.asc())

    if not page_arg and not size_arg:
        return success_response([word.to_dict() for word in query.all()])

    page = max(int(page_arg or 1), 1)
    size = min(max(int(size_arg or 20), 1), 100)
    pagination = query.paginate(page=page, per_page=size, error_out=False)
    return success_response(
        {
            "items": [word.to_dict() for word in pagination.items],
            "pagination": {
                "page": page,
                "size": size,
                "total": pagination.total,
                "pages": pagination.pages,
            },
        }
    )


@dictionary_bp.post("")
@admin_required
def create_word():
    payload = request.get_json(silent=True) or {}
    error = require_fields(payload, ["word", "type"])
    if error:
        return error_response(error)

    normalized = normalize_word(payload["word"])
    word_type = str(payload["type"]).upper()
    if word_type not in VALID_WORD_TYPES:
        return error_response("Noto'g'ri lug'at turi")
    if DictionaryWord.query.filter_by(normalized_word=normalized).first():
        return error_response("Bu so'z lug'atda mavjud", 409)

    item = DictionaryWord(
        word=str(payload["word"]).strip().lower(),
        normalized_word=normalized,
        type=word_type,
        weight=float(payload.get("weight", 0)),
        active=bool(payload.get("active", True)),
        source="ADMIN",
    )
    db.session.add(item)
    db.session.commit()
    return success_response(item.to_dict(), 201)


@dictionary_bp.put("/<int:word_id>")
@admin_required
def update_word(word_id):
    item = DictionaryWord.query.get_or_404(word_id)
    payload = request.get_json(silent=True) or {}

    if "word" in payload:
        normalized = normalize_word(payload["word"])
        duplicate = DictionaryWord.query.filter(
            DictionaryWord.normalized_word == normalized, DictionaryWord.id != word_id
        ).first()
        if duplicate:
            return error_response("Bu so'z lug'atda mavjud", 409)
        item.word = str(payload["word"]).strip().lower()
        item.normalized_word = normalized
    if "type" in payload:
        word_type = str(payload["type"]).upper()
        if word_type not in VALID_WORD_TYPES:
            return error_response("Noto'g'ri lug'at turi")
        item.type = word_type
    if "weight" in payload:
        item.weight = float(payload["weight"])
    if "active" in payload:
        item.active = bool(payload["active"])
    item.source = payload.get("source", item.source or "ADMIN")

    db.session.commit()
    return success_response(item.to_dict())


@dictionary_bp.delete("/<int:word_id>")
@admin_required
def delete_word(word_id):
    item = DictionaryWord.query.get_or_404(word_id)
    db.session.delete(item)
    db.session.commit()
    return success_response({"deleted": True})


@dictionary_bp.post("/import-csv")
@admin_required
def import_csv():
    if "file" not in request.files:
        return error_response("CSV fayl yuborilmadi")
    try:
        data = DictionaryImportService().import_csv(request.files["file"])
    except ValueError as error:
        return error_response(str(error))
    return success_response(data)
