from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
import pika
import json
import threading
import time
from datetime import datetime

app = Flask(__name__)

# Database Configuration
app.config['SQLALCHEMY_DATABASE_URI'] = "postgresql://user:password@postgres:5432/notifications"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Notification Model
class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employer_id = db.Column(db.Integer, nullable=True)
    queue = db.Column(db.String(50), nullable=False)
    job_id = db.Column(db.Integer, nullable=False)
    application_id = db.Column(db.Integer, nullable=True)
    escrow_id = db.Column(db.Integer, nullable=True)
    message = db.Column(db.String(255), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

# Create DB Tables
with app.app_context():
    db.create_all()

# RabbitMQ Connection Settings
RABBITMQ_HOST = "rabbitmq"
EXCHANGE_NAME = "notification_topic"
EXCHANGE_TYPE = "topic"
QUEUES = {
    "Job_Completion_Notifications": "job-completion.notifications",
    "Payment_Notifications": "payment.notifications"
}

# Setup RabbitMQ Exchange and Queues
def setup_rabbitmq():
    retries = 5
    for i in range(retries):
        try:
            connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
            channel = connection.channel()

            # Declare Exchange
            channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type=EXCHANGE_TYPE, durable=True)

            # Declare Queues and Bind to Exchange
            for queue_name, routing_key in QUEUES.items():
                channel.queue_declare(queue=queue_name, durable=True)
                channel.queue_bind(exchange=EXCHANGE_NAME, queue=queue_name, routing_key=routing_key)

            connection.close()
            print("RabbitMQ setup completed.")
            return
        except pika.exceptions.AMQPConnectionError:
            print(f"RabbitMQ not available yet. Retrying... ({i+1}/{retries})")
            time.sleep(1)

    print("Could not connect to RabbitMQ. Exiting...")
    exit(1)

# Function to Save Notifications in DB
def save_notification(queue, job_id, application_id, employer_id, escrow_id, message):
    new_notification = Notification(
        queue=queue,
        job_id=job_id,
        application_id=application_id,
        employer_id=employer_id,
        escrow_id=escrow_id,
        message=message
    )
    db.session.add(new_notification)
    db.session.commit()

# RabbitMQ Consumer
def consume_notifications(queue_name, routing_key):
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
    channel = connection.channel()

    def callback(ch, method, properties, body):
        data = json.loads(body)
        job_id = data.get("job_id")
        application_id = data.get("application_id")
        escrow_id = data.get("escrow_id")
        employer_id = data.get("employer_id")

        if routing_key == "job-completion.notifications":
            message = f"Job {job_id} completed. Employer {employer_id}, please approve."
        elif routing_key == "payment.notifications":
            message = f"Payment for Job {job_id} released to Escrow ID {escrow_id}."

        save_notification(queue_name, job_id, application_id, employer_id, escrow_id, message)
        print(f"Saved notification for {queue_name}: {message}")

    channel.basic_consume(queue=queue_name, on_message_callback=callback, auto_ack=True)
    print(f"Listening for messages on {queue_name}...")
    channel.start_consuming()

# Run Consumers in Background Threads
def start_consumers():
    for queue_name, routing_key in QUEUES.items():
        threading.Thread(target=consume_notifications, args=(queue_name, routing_key), daemon=True).start()

# API to Fetch Notifications
@app.route('/notifications', methods=['GET'])
def get_notifications():
    notifications = Notification.query.all()
    return jsonify([
        {
            "id": n.id,
            "queue": n.queue,
            "employer_id": n.employer_id,
            "escrow_id": n.escrow_id,
            "job_id": n.job_id,
            "application_id": n.application_id,
            "message": n.message,
            "timestamp": n.timestamp.strftime('%Y-%m-%d %H:%M:%S')
        } for n in notifications
    ])

@app.route('/notifications', methods=['POST'])
def post_notification():
    data = request.get_json()
    queue = data.get("queue")
    job_id = data.get("job_id")
    application_id = data.get("application_id")
    employer_id = data.get("employer_id")
    escrow_id = data.get("escrow_id")

    if queue not in QUEUES:
        return jsonify({"error": "Invalid queue"}), 400

    message = f"Notification for {queue}: Job {job_id}, Employer {employer_id}, Escrow {escrow_id}."
    save_notification(queue, job_id, application_id, employer_id, escrow_id, message)

    return jsonify({"message": "Notification saved", "queue": queue}), 201

if __name__ == '__main__':
    setup_rabbitmq()  # Ensure RabbitMQ setup runs when the Flask app starts
    start_consumers()  # Start consumers in separate threads
    app.run(debug=True, port=5000, host="0.0.0.0")
