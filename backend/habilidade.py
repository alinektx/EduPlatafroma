from flask import Blueprint, jsonify


habilidades_bp = Blueprint('habilidade', __name__)


@habilidades_bp.route('/api/habilidades/ping')
def habilidades_ping():
    return jsonify({"habilidades": "ok"})

