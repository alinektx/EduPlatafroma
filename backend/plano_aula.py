from flask import Blueprint, jsonify


plano_aula_bp = Blueprint('plano_aula', __name__)


@plano_aula_bp.route('/api/plano-aula/ping')
def plano_aula_ping():
    return jsonify({"plano_aula": "ok"})

