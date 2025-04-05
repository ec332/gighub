from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os
from flask_cors import CORS


app = Flask(__name__)
CORS(app) 
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URL", "postgresql://escrow_user:escrow_pass@localhost:5433/escrow_db")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class Escrow(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employer_id = db.Column(db.Integer, nullable=False)
    freelancer_id = db.Column(db.Integer, nullable=True)
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
    job_id = data.get("job_id")
    amount = data.get("amount")

    if not all([employer_id, job_id, amount]):
        return jsonify({"message": "Missing required fields"}), 400
    
    if not isinstance(amount, (int, float)) or amount <= 0:
        return jsonify({"message": "Amount must be a positive number"}), 400

    new_escrow = Escrow(
        employer_id=employer_id, 
        freelancer_id=-1,  # Can be None
        job_id=job_id, 
        amount=amount
    )
    db.session.add(new_escrow)
    db.session.commit()

    return jsonify({
        "message": "Escrow created", 
        "escrow_id": new_escrow.id, 
        "status": new_escrow.status
    }), 201

@app.route('/escrow/acceptedjob', methods=['PUT'])
def accept_job():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    
    # Validate required fields
    if not data or "job_id" not in data or "freelancer_id" not in data:
        return jsonify({"error": "Missing required fields: job_id and freelancer_id"}), 400

    try:
        # Find the escrow record by job_id
        escrow = Escrow.query.filter_by(job_id=data["job_id"]).first()
        
        if not escrow:
            return jsonify({"error": "Escrow not found for this job"}), 404
            
        # Update freelancer_id
        escrow.freelancer_id = data["freelancer_id"]
        db.session.commit()
        
        return jsonify({
            "message": "Freelancer assigned to job successfully",
            "job_id": data["job_id"],
            "freelancer_id": escrow.freelancer_id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# Retrieve Escrow
@app.route('/escrow/<int:id>', methods=['GET'])
def get_escrow(id):
    escrow = Escrow.query.get(id)
    if not escrow:
        return jsonify({"message": "Escrow not found"}), 404
    
    return jsonify({"message": "Escrow retrieved",
        "data": {
            "escrow_id": escrow.id,
            "employer_id": escrow.employer_id,
            # "freelancer_id": escrow.freelancer_id,
            "job_id": escrow.job_id,
            "amount": escrow.amount,
            "status": escrow.status,
            "created_at": escrow.created_at.isoformat(),
            "updated_at": escrow.updated_at.isoformat()
        }
    }), 200

# Escrow Status Update
@app.route('/escrow/<int:id>', methods=['PUT'])
def update_escrow(id):
    data = request.get_json()

    if "status" not in data:
        return jsonify({"message": "Missing required field: status"}), 469

    escrow = Escrow.query.filter_by(job_id=id).first()

    if not escrow or escrow.status != "Pending":
        return jsonify({"message": "Escrow not found or already processed"}), 496

    if data["status"] not in ["released", "cancelled"]:
        return jsonify({"message": "Invalid status. Allowed: 'released' or 'cancelled'"}), 444

    # Update escrow status based on the request
    escrow.status = data["status"]
    db.session.commit()

    return jsonify({
        "message": f"Escrow {data['status'].lower()} successfully",
        "escrow_id": escrow.id,
        "status": escrow.status
    }), 200

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=int(os.getenv("PORT", 5200)), debug=True)


