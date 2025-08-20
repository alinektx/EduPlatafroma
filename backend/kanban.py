from flask import Blueprint, jsonify


kanban_bp = Blueprint('kanban', __name__)


@kanban_bp.route('/api/kanban/ping')
def kanban_ping():
    return jsonify({"kanban": "ok"})

