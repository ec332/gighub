from flask import Flask, request, jsonify
import decimal
from pymongo import MongoClient
from bson.decimal128 import Decimal128
from decimal import Decimal
from bson.objectid import ObjectId
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# MongoDB configuration
# MONGO_URI = env.MONGODB_URI
# DB_NAME = "wallet_service"
# COLLECTION_NAME = "wallets"
MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
DB_NAME = os.getenv("DB_NAME", "wallet_service")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "wallets")

# Get MongoDB client
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
wallet_collection = db[COLLECTION_NAME]

# Helper functions for Decimal conversion
def decimal_to_decimal128(dec_value):
    return Decimal128(dec_value)

def decimal128_to_decimal(dec128_value):
    return Decimal(str(dec128_value))

@app.route('/wallet/<int:wallet_id>', methods=['GET'])
def get_wallet_balance(wallet_id):
    """
    Get the balance of a wallet by ID
    """
    try:
        # Find wallet by ID
        wallet = wallet_collection.find_one({"WalletID": wallet_id})
        
        if not wallet:
            return jsonify({"error": "Wallet not found"}), 404
        
        # Convert Decimal128 to regular decimal for JSON serialization
        balance = decimal128_to_decimal(wallet['Balance'])
        
        return jsonify({
            "walletId": wallet['WalletID'],
            "role": wallet['Role'],
            "balance": float(balance)
        })
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
        
        # Find wallet by ID
        wallet = wallet_collection.find_one({"WalletID": wallet_id})
        
        if not wallet:
            return jsonify({"error": "Wallet not found"}), 404
        
        current_balance = decimal128_to_decimal(wallet['Balance'])
        new_balance = current_balance + amount
        
        # If withdrawal, check if sufficient balance
        if amount < 0 and new_balance < 0:
            return jsonify({"error": "Insufficient balance"}), 400
        
        # Update balance
        result = wallet_collection.update_one(
            {"WalletID": wallet_id},
            {"$set": {"Balance": decimal_to_decimal128(new_balance)}}
        )
        
        if result.modified_count == 0:
            return jsonify({"error": "Failed to update balance"}), 500
            
        return jsonify({
            "walletId": wallet_id,
            "role": wallet['Role'],
            "previousBalance": float(current_balance),
            "newBalance": float(new_balance),
            "amount": float(amount)
        })
    except decimal.InvalidOperation:
        return jsonify({"error": "Invalid amount format"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Helper route to initialize a wallet (for testing)
@app.route('/wallet/create', methods=['POST'])
def create_wallet():
    """
    Create a new wallet
    Request body should contain:
    {
        "walletId": int,
        "role": string ("Employer" or "Freelancer"),
        "balance": float
    }
    """
    try:
        data = request.get_json()
        
        if not all(key in data for key in ['walletId', 'role', 'balance']):
            return jsonify({"error": "Missing required fields"}), 400
            
        if data['role'] not in ['Employer', 'Freelancer']:
            return jsonify({"error": "Role must be 'Employer' or 'Freelancer'"}), 400
        
        # Check if wallet already exists
        existing_wallet = wallet_collection.find_one({"WalletID": data['walletId']})
        if existing_wallet:
            return jsonify({"error": "Wallet with this ID already exists"}), 409
        
        # Create new wallet document
        new_wallet = {
            "WalletID": data['walletId'],
            "Role": data['role'],
            "Balance": decimal_to_decimal128(Decimal(str(data['balance'])))
        }
        
        result = wallet_collection.insert_one(new_wallet)
        
        return jsonify({
            "message": "Wallet created successfully",
            "walletId": data['walletId']
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8080)