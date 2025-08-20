from flask import Blueprint, jsonify


turmas_bp = Blueprint('turmas', __name__)


@turmas_bp.route('/api/turmas/ping')
def turmas_ping():
    return jsonify({"turmas": "ok"})

