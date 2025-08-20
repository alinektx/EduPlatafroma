from flask import Blueprint, jsonify


alunos_bp = Blueprint('alunos', __name__)


@alunos_bp.route('/api/alunos/ping')
def alunos_ping():
    return jsonify({"alunos": "ok"})

