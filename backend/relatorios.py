from flask import Blueprint, jsonify


relatorios_bp = Blueprint('relatorios', __name__)


@relatorios_bp.route('/api/relatorios/ping')
def relatorios_ping():
    return jsonify({"relatorios": "ok"})

