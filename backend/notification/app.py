from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
import pika
import json
import threading
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
    freelancer_id = db.Column(db.Integer, nullable=True)
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
    "Payment_Notifications": "payment.notifications",
    "Job_Accept_Notifications":"job-accept.notifications"
}

# Setup RabbitMQ Exchange and Queues
def setup_rabbitmq():
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

def send_notification(recipient_id, message):
    print(f"Sending notification to User {recipient_id}: {message}")

# Function to Save Notifications in DB
def save_notification(queue, job_id, application_id, employer_id, freelancer_id, escrow_id, message):
    with app.app_context():
        new_notification = Notification(
            queue=queue,
            job_id=job_id,
            application_id=application_id,
            employer_id=employer_id,
            freelancer_id=freelancer_id,
            escrow_id=escrow_id,
            message=message
        )
        db.session.add(new_notification)
        db.session.commit()
        
        # Determine the recipient of the notification
        recipient_id = employer_id if employer_id else freelancer_id
        if recipient_id:
            send_notification(recipient_id, message)

# RabbitMQ Consumer
def consume_notifications(app, queue_name, routing_key):
    with app.app_context():
        connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
        channel = connection.channel()

        def callback(ch, method, properties, body):
            data = json.loads(body)
            job_id = data.get("job_id")
            application_id = data.get("application_id")
            escrow_id = data.get("escrow_id")
            employer_id = data.get("employer_id")
            freelancer_id = data.get("freelancer_id")

            message = None
            recipient_id = None

            if routing_key == "job-completion.notifications":
                message = f"Job {job_id} completed. Employer {employer_id}, please approve."
                recipient_id = employer_id
            elif routing_key == "payment.notifications":
                message = f"Payment for Job {job_id} released to Escrow ID {escrow_id}."
                recipient_id = freelancer_id
            elif routing_key == "job-accept.notifications":
                message = f"Job {job_id} has been accepted by Freelancer {freelancer_id}."
                recipient_id = employer_id 


            if message and recipient_id:
                save_notification(queue_name, job_id, application_id, employer_id, freelancer_id, escrow_id, message)
                print(f"Saved notification for {queue_name}: {message}")

        channel.basic_consume(queue=queue_name, on_message_callback=callback, auto_ack=True)
        print(f"Listening for messages on {queue_name}...")
        channel.start_consuming()

# Run Consumers in Background Threads
def start_consumers(app):
    for queue_name, routing_key in QUEUES.items():
        thread=threading.Thread(target=consume_notifications, args=(app, queue_name, routing_key), daemon=True)
        thread.start()

# API to Fetch Notifications
@app.route('/notifications', methods=['GET'])
def get_notifications():
    with app.app_context():
        notifications = Notification.query.all()
        return jsonify([
            {
                "id": n.id,
                "queue": n.queue,
                "employer_id": n.employer_id,
                "freelancer_id": n.freelancer_id,
                "escrow_id": n.escrow_id,
                "job_id": n.job_id,
                "application_id": n.application_id,
                "message": n.message,
                "timestamp": n.timestamp.strftime('%Y-%m-%d %H:%M:%S')
            } for n in notifications
        ])

# @app.route('/notifications', methods=['POST'])
# def post_notification():
#     data = request.get_json()
#     queue = data.get("queue")
#     job_id = data.get("job_id")
#     application_id = data.get("application_id")
#     employer_id = data.get("employer_id")
#     freelancer_id = data.get("freelancer_id")
#     escrow_id = data.get("escrow_id")
#     if queue not in QUEUES:
#         return jsonify({"error": "Invalid queue"}), 400
#     message = f"Notification for {queue}: Job {job_id}, Employer {employer_id}, Escrow {escrow_id}."
#     save_notification(queue, job_id, application_id, employer_id, freelancer_id, escrow_id, message)
#     return jsonify({"message": "Notification saved", "queue": queue}), 201


if __name__ == '__main__':
    setup_rabbitmq()  # Ensure RabbitMQ setup runs when the Flask app starts
    start_consumers(app)  # Start consumers in separate threads
    app.run(debug=True, port=5000, host="0.0.0.0")
