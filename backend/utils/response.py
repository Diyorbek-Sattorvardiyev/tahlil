from flask import jsonify


def success_response(data=None, status_code=200):
    return jsonify({"success": True, "data": data if data is not None else {}}), status_code


def error_response(message, status_code=400):
    return jsonify({"success": False, "message": message}), status_code
