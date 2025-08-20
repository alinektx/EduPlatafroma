from flask import Blueprint, jsonify


escolas_bp = Blueprint('escolas', __name__)


@escolas_bp.route('/api/escolas/ping')
def escolas_ping():
    return jsonify({"escolas": "ok"})

