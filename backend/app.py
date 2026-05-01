import os

from flask import Flask, send_from_directory

from config import Config
from extensions import cors, db
from routes.admin_routes import admin_bp
from routes.analysis_routes import analysis_bp
from routes.auth_routes import auth_bp
from routes.dictionary_routes import dictionary_bp
from routes.history_routes import history_bp
from routes.rule_routes import rule_bp
from routes.stats_routes import stats_bp
from utils.response import error_response, success_response


BASE_DIR = os.path.abspath(os.path.dirname(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, os.pardir, "frontend"))


def _ensure_sqlite_schema(app):
    if not app.config["SQLALCHEMY_DATABASE_URI"].startswith("sqlite"):
        return
    from sqlalchemy import inspect, text

    inspector = inspect(db.engine)
    tables = set(inspector.get_table_names())
    if "users" not in tables:
        return

    additions = {
        "users": [("active", "BOOLEAN NOT NULL DEFAULT 1")],
        "dictionary_words": [
            ("normalized_word", "VARCHAR(120)"),
            ("source", "VARCHAR(30) NOT NULL DEFAULT 'ADMIN'"),
            ("updated_at", "DATETIME"),
        ],
        "analysis_history": [
            ("original_text", "TEXT"),
            ("normalized_text", "TEXT"),
            ("dataset_positive_count", "INTEGER NOT NULL DEFAULT 0"),
            ("dataset_negative_count", "INTEGER NOT NULL DEFAULT 0"),
            ("dataset_neutral_count", "INTEGER NOT NULL DEFAULT 0"),
            ("gemini_emotion", "VARCHAR(80)"),
            ("gemini_reason", "TEXT"),
            ("final_method", "VARCHAR(40)"),
        ],
        "rules": [("updated_at", "DATETIME")],
    }

    with db.engine.begin() as conn:
        for table, columns in additions.items():
            if table not in tables:
                continue
            existing = {column["name"] for column in inspector.get_columns(table)}
            for name, ddl in columns:
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
        if "dictionary_words" in tables:
            conn.execute(
                text("UPDATE dictionary_words SET normalized_word = lower(word) WHERE normalized_word IS NULL OR normalized_word = ''")
            )
        if "analysis_history" in tables:
            existing = {column["name"] for column in inspector.get_columns("analysis_history")}
            if "text" in existing:
                conn.execute(text("UPDATE analysis_history SET original_text = text WHERE original_text IS NULL"))
                conn.execute(text("UPDATE analysis_history SET normalized_text = lower(text) WHERE normalized_text IS NULL"))


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", "*")}},
        supports_credentials=True,
    )

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(analysis_bp, url_prefix="/api")
    app.register_blueprint(dictionary_bp, url_prefix="/api/dictionary")
    app.register_blueprint(rule_bp, url_prefix="/api/rules")
    app.register_blueprint(history_bp, url_prefix="/api/history")
    app.register_blueprint(stats_bp, url_prefix="/api")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")

    with app.app_context():
        db.create_all()
        _ensure_sqlite_schema(app)

    @app.get("/api/health")
    def health():
        return success_response({"status": "ok"})

    @app.get("/")
    def root():
        return send_from_directory(FRONTEND_DIR, "index.html")

    @app.get("/<path:filename>")
    def frontend_file(filename):
        if os.path.isfile(os.path.join(FRONTEND_DIR, filename)):
            return send_from_directory(FRONTEND_DIR, filename)
        return error_response("Endpoint topilmadi", 404)

    @app.errorhandler(404)
    def not_found(_):
        return error_response("Endpoint topilmadi", 404)

    @app.errorhandler(405)
    def method_not_allowed(_):
        return error_response("HTTP metod ruxsat etilmagan", 405)

    @app.errorhandler(Exception)
    def internal_error(error):
        app.logger.exception(error)
        return error_response("Serverda ichki xatolik yuz berdi", 500)

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=os.getenv("FLASK_DEBUG", "1") == "1")
