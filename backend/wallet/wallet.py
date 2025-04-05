from flask import Flask, request, jsonify
import decimal
from decimal import Decimal
import os
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# PostgreSQL configuration
app.config['SQLALCHEMY_DATABASE_URI'] = "postgresql://postgres:postgres@postgres:5432/wallet_service"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Set up SQLAlchemy
db = SQLAlchemy(app)

# Define Wallet model
class Wallet(db.Model):
    __tablename__ = 'wallets'
    
    WalletID = db.Column(db.Integer, primary_key=True, autoincrement=True)
    Role = db.Column(db.String(50), nullable=False)
    Balance = db.Column(db.Numeric(precision=18, scale=2), nullable=False, default=0.00)
    
    # Add to_dict method for serialization
    def to_dict(self):
        return {
            "walletId": self.WalletID,
            "role": self.Role,
            "balance": float(self.Balance)
        }

# Create tables
with app.app_context():
    db.create_all()

@app.route('/wallet/<int:wallet_id>', methods=['GET'])
def get_wallet_balance(wallet_id):
    """
    Get the balance of a wallet by ID
    """
    try:
        wallet = Wallet.query.filter_by(WalletID=wallet_id).first()
        
        if not wallet:
            return jsonify({"error": "Wallet not found"}), 404
        
        return jsonify(wallet.to_dict())
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/wallet/<int:wallet_id>', methods=['POST'])
def update_wallet_balance(wallet_id):
    """
    Update the balance of a wallet
    Request body should contain:
    {
        "amount": float (positive for deposit, negative for withdrawal)
    }
    """
    try:
        data = request.get_json()
        if 'amount' not in data:
            return jsonify({"error": "Amount is required"}), 400
        
        amount = Decimal(str(data['amount']))
        
        wallet = Wallet.query.filter_by(WalletID=wallet_id).first()
        
        if not wallet:
            return jsonify({"error": "Wallet not found"}), 404
        
        current_balance = wallet.Balance
        new_balance = current_balance + amount
        
        # If withdrawal, check if sufficient balance
        if amount < 0 and new_balance < 0:
            return jsonify({"error": "Insufficient balance"}), 400
        
        # Update balance
        previous_balance = float(wallet.Balance)
        wallet.Balance = new_balance
        db.session.commit()
            
        result = {
            "walletId": wallet_id,
            "role": wallet.Role,
            "previousBalance": previous_balance,
            "newBalance": float(new_balance),
            "amount": float(amount)
        }
        
        return jsonify(result)
    except decimal.InvalidOperation:
        return jsonify({"error": "Invalid amount format"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# Route to create a wallet (now uses autoincrement)
@app.route('/wallet/create', methods=['POST'])
def create_wallet():
    """
    Create a new wallet.
    Request body should contain:
    {
        "role": string ("Employer" or "Freelancer")
    }
    Automatically initializes balance to 0.0 and generates a unique walletId via autoincrement.
    """
    try:
        data = request.get_json()

        # Validate presence of role
        if 'role' not in data:
            return jsonify({"error": "Missing required field: role"}), 400

        if data['role'] not in ['Employer', 'Freelancer']:
            return jsonify({"error": "Role must be 'Employer' or 'Freelancer'"}), 400

        new_wallet = Wallet(Role=data['role'], Balance=Decimal('0.0'))
        db.session.add(new_wallet)
        db.session.commit()
        
        wallet_id = new_wallet.WalletID

        return jsonify({
            "message": "Wallet created successfully",
            "walletId": wallet_id
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)