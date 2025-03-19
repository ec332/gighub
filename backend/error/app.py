from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from kafka import KafkaConsumer, KafkaProducer
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

# Kafka Producer (sends error logs)
producer = KafkaProducer(
    bootstrap_servers=KAFKA_BROKER,
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

# ErrorLog Model
class ErrorLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    topic = db.Column(db.String(50), nullable=False)
    message = db.Column(db.String(255), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

# Create DB Tables
with app.app_context():
    db.create_all()

# Send Error to Kafka
@app.route('/api/errors', methods=['POST'])
def send_error():
    data = request.get_json()
    topic = data.get("topic")
    error_message = data.get("error_message")

    if not topic or not error_message:
        return jsonify({"message": "Missing topic or error_message"}), 400

    producer.send(topic, {"error_message": error_message})
    producer.flush()

    return jsonify({"message": f"Error sent to {topic}"}), 201

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
