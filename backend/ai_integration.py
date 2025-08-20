from flask import Blueprint, jsonify


ai_bp = Blueprint('ai', __name__)


@ai_bp.route('/api/ai/ping')
def ai_ping():
    return jsonify({"ai": "ok"})

