from flask import Blueprint, jsonify


auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/api/auth/ping')
def auth_ping():
    return jsonify({"auth": "ok"})

