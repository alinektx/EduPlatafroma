from flask import Blueprint, jsonify


newsletter_bp = Blueprint('newsletter', __name__)


@newsletter_bp.route('/api/newsletter/ping')
def newsletter_ping():
    return jsonify({"newsletter": "ok"})

