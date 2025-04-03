from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from kafka import KafkaConsumer
from datetime import datetime
import json
import os
import threading

app = Flask(__name__)

# Database Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = "postgresql://admin:password@postgres:5432/error_logs"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Kafka Configuration
KAFKA_BROKER = 'kafka:9092'

# ErrorLog Model
class ErrorLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    topic = db.Column(db.String(50), nullable=False)
    message = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

# Create DB Tables
with app.app_context():
    db.create_all()

# Retrieve Stored Errors from PostgreSQL
@app.route('/api/errors', methods=['GET'])
def get_errors():
    logs = ErrorLog.query.all()
    return jsonify([
        {"id": log.id, "topic": log.topic, "message": log.message, "timestamp": log.timestamp.isoformat()}
        for log in logs
    ]), 200

# Kafka Consumer (Background Thread)
def consume_errors():
    consumer = KafkaConsumer(
        'publish-job-errors',
        'complete-job-errors',
        'approve-job-errors',
        'match-job-errors',
        'accept-job-errors',
        'error-logs',
        bootstrap_servers=KAFKA_BROKER,
        value_deserializer=lambda m: json.loads(m.decode('utf-8'))
    )

    with app.app_context():
        for msg in consumer:
            error_log = ErrorLog(topic=msg.topic, message=msg.value["error_message"])
            db.session.add(error_log)
            db.session.commit()
            print(f"Stored error from {msg.topic}: {msg.value['error_message']}")

# Start Consumer in Background Thread
threading.Thread(target=consume_errors, daemon=True).start()

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=int(os.getenv("PORT", 5000)), debug=True)
