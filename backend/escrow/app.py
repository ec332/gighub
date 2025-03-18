from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URL", "postgresql://escrow_user:escrow_pass@localhost:5432/escrow_db")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class Escrow(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employer_id = db.Column(db.Integer, nullable=False)
    freelancer_id = db.Column(db.Integer, nullable=False)
    job_id = db.Column(db.Integer, nullable=False)
    amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default="Pending")  # "Pending", "Released", "Cancelled"
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Create Escrow
@app.route('/api/escrow', methods=['POST'])
def create_escrow():
    data = request.get_json()
    employer_id = data.get("employer_id")
    freelancer_id = data.get("freelancer_id")
    job_id = data.get("job_id")
    amount = data.get("amount")

    if not all([employer_id, freelancer_id, job_id, amount]):
        return jsonify({"message": "Missing required fields"}), 400
    
    if not isinstance(amount, (int, float)) or amount <= 0:
        return jsonify({"message": "Amount must be a positive number"}), 400

    new_escrow = Escrow(
        employer_id=employer_id, freelancer_id=freelancer_id, 
        job_id=job_id, amount=amount
    )
    db.session.add(new_escrow)
    db.session.commit()

    return jsonify({"message": "Escrow created", "escrow_id": new_escrow.id, "status": new_escrow.status}), 201

# Retrieve Escrow
@app.route('/api/escrow/<int:id>', methods=['GET'])
def get_escrow(id):
    escrow = Escrow.query.get(id)
    if not escrow:
        return jsonify({"message": "Escrow not found"}), 404
    
    return jsonify({"message": "Escrow retrieved",
        "data": {
            "escrow_id": escrow.id,
            "employer_id": escrow.employer_id,
            "freelancer_id": escrow.freelancer_id,
            "job_id": escrow.job_id,
            "amount": escrow.amount,
            "status": escrow.status,
            "created_at": escrow.created_at.isoformat(),
            "updated_at": escrow.updated_at.isoformat()
        }
    }), 200

# Release Escrow
@app.route('/api/escrow/<int:id>/release', methods=['PUT'])
def release_escrow(id):
    escrow = Escrow.query.get(id)
    if not escrow or escrow.status != "Pending":
        return jsonify({"message": "Escrow not found or already processed"}), 400
    
    escrow.status = "Released"
    db.session.commit()
    return jsonify({"message": "Escrow released", "escrow_id": escrow.id, "status": escrow.status}), 200

# Cancel Escrow
@app.route('/api/escrow/<int:id>/cancel', methods=['PUT'])
def cancel_escrow(id):
    escrow = Escrow.query.get(id)
    if not escrow or escrow.status != "Pending":
        return jsonify({"message": "Escrow not found or already processed"}), 400
    
    escrow.status = "Cancelled"
    db.session.commit()
    return jsonify({"message": "Escrow cancelled", "escrow_id": escrow.id, "status": escrow.status}), 200

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=int(os.getenv("PORT", 5000)), debug=True)
