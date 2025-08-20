from flask import Blueprint, jsonify


usuarios_bp = Blueprint('usuarios', __name__)


@usuarios_bp.route('/api/usuarios/ping')
def usuarios_ping():
    return jsonify({"usuarios": "ok"})

