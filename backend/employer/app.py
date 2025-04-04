from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS  
from dotenv import load_dotenv
import os

# Initialize the Flask app and database connection
app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = "postgresql://employer_user:password@db/employer_db"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Define the Employer model
class Employer(db.Model):
    __tablename__ = 'employer'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    company = db.Column(db.String(100), nullable=False)
    wallet_id = db.Column(db.Integer, nullable=True)  # Assuming a Wallet model exists

    def __repr__(self):
        return f'<Employer {self.name}, {self.company}>'

# Initialize the database (you may want to run this manually before launching)
with app.app_context():
    db.create_all()

# POST route to add a new employer
@app.route('/api/employer', methods=['POST'])
def add_employer():
    data = request.get_json()

    # Extract required fields
    name = data.get('name')
    email = data.get('email')
    company = data.get('company')
    wallet_id = data.get('wallet')

    # Validate required fields
    if not name or not email or not company:
        return jsonify({"message": "Missing required fields"}), 400

    # Check if the email already exists
    existing_employer = Employer.query.filter_by(email=email).first()
    if existing_employer:
        return jsonify({"message": "Employer with this email already exists"}), 400

    # Create new employer and add to DB
    new_employer = Employer(name=name, email=email, company=company, wallet_id=wallet_id)
    db.session.add(new_employer)
    db.session.commit()

    return jsonify({
        "message": "Employer added",
        "data": {
            "id": new_employer.id,
            "name": new_employer.name,
            "email": new_employer.email,
            "company": new_employer.company,
            "wallet_id": new_employer.wallet_id
        }
    }), 201

# GET route to retrieve an employer by ID
@app.route('/api/employer/<int:employer_id>', methods=['GET'])
def get_employer(employer_id):
    employer = Employer.query.get(employer_id)

    if employer is None:
        return jsonify({"message": "Employer not found"}), 404

    return jsonify({
        "employer": {
            "id": employer.id,
            "name": employer.name,
            "email": employer.email,
            "company": employer.company,
            "wallet_id": employer.wallet_id
        }
    })

# GET route to retrieve an employer by email
@app.route('/api/employer/<string:email>', methods=['GET'])
def get_employer_by_email(email):
    employer = Employer.query.filter_by(email=email).first()

    if employer is None:
        return jsonify({"message": "Employer not found"}), 404

    return jsonify({
        "employer": {
            "id": employer.id,
            "name": employer.name,
            "email": employer.email,
            "company": employer.company,
            "wallet_id": employer.wallet_id
        }
    })

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
