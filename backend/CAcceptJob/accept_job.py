from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import pika
import os
import json
from kafka import KafkaProducer
import threading

app = Flask(__name__)
CORS(app)  # Enable CORS

# Configuration for external services
JOB_SERVICE_URL = os.getenv('JOB_SERVICE_URL', 'http://localhost:5100/job')
ESCROW_SERVICE_URL = os.getenv('ESCROW_SERVICE_URL', 'http://localhost:5200/api/escrow')
WALLET_SERVICE_URL = os.getenv('WALLET_SERVICE_URL', 'http://localhost:5300/wallet')
NOTIFICATION_SERVICE_URL = os.getenv('NOTIFICATION_SERVICE_URL', 'http://localhost:5000/consume_notifications')
KAFKA_BROKER = os.getenv('KAFKA_BROKER', 'localhost:29092')
AMQP_URL = os.getenv('AMQP_URL', 'amqp://guest:guest@rabbitmq:5672/')

# Initialize Kafka Producer
producer = KafkaProducer(
    bootstrap_servers=KAFKA_BROKER,
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

def log_error_to_kafka(error_message, topic="error-logs"):
    """ Send errors to Kafka for logging """
    try:
        producer.send(topic, {"error_message": error_message})
        producer.flush()
        print(f"Logged error to Kafka: {error_message}")
    except Exception as e:
        print(f"Failed to send error to Kafka: {error_message}")

def ensure_rabbitmq_connection():
    """Establish a RabbitMQ connection and return channel"""
    connection = pika.BlockingConnection(pika.URLParameters(AMQP_URL))
    channel = connection.channel()
    return connection, channel

@app.route('/acceptjob', methods=['POST'])
def accept_job():
    try:
        # Parse the JSON payload from the request body
        job_details = request.json
        job_id = job_details.get('job_id')
        employer_id = job_details.get('employer_id')
        freelancer_id = job_details.get('freelancer_id')
        pay = job_details.get('pay')
        wallet_id = job_details.get('wallet_id')

        # Step 1: Deduct money from wallet
        print(f"Invoking wallet microservice to deduct money for job ID: {job_id}")
        wallet_response = requests.post(f'{WALLET_SERVICE_URL}/{wallet_id}', json={'amount': -pay})
        if wallet_response.status_code != 200:
            raise Exception(f"Error deducting money from wallet: {wallet_response.text}")
        wallet_data = wallet_response.json()
        print(f"Employer wallet deducted, details: {wallet_data}")

        # Step 2: Create escrow account
        print(f"Invoking escrow microservice to create escrow account for job ID: {job_id}")
        escrow_response = requests.post(f'{ESCROW_SERVICE_URL}', json={'job_id': job_id, 'employer_id': employer_id, 'freelancer_id': freelancer_id, 'amount': pay})
        if escrow_response.status_code != 200:
            raise Exception(f"Error creating escrow account: {escrow_response.text}")
        escrow_data = escrow_response.json()
        print(f"Escrow account created, details: {escrow_data}")

        # Step 3: Update job status to Closed
        print(f"Invoking job microservice to update job status to Closed for job ID: {job_id}")
        job_response = requests.put(f'{JOB_SERVICE_URL}/{job_id}', json={'status': 'Closed'})
        if job_response.status_code != 200:
            raise Exception(f"Error updating job status: {job_response.text}")
        job_data = job_response.json()
        print(f"Job status updated, details: {job_data}")

        # Step 4: Ensure employer is consuming notifications
        try:
            print(f"Ensuring employer {employer_id} is subscribed to notifications")
            response = requests.get(f"{NOTIFICATION_SERVICE_URL}/{employer_id}")
            if response.status_code != 200:
                raise Exception(f"Failed to start notification consumer: {response.text}")
            response_data = response.json()
            if "status" not in response_data or "received_messages" not in response_data:
                raise Exception(f"Unexpected response from notification microservice: {response_data}")
            print(f"Notification consumer started for employer {employer_id}, response: {response_data}")
        except Exception as e:
            raise Exception(f"Error invoking notification microservice: {str(e)}")

        # Step 5: Send job accepted notification to employer via RabbitMQ
        try:
            print(f"Sending job accepted notification to employer for job ID: {job_id}")
            notification_message = {
                'queue': f"{employer_id}-job-accept-notification",
                'job_id': job_id,
                'employer_id': employer_id,
                'freelancer_id': freelancer_id,
                'escrow_id': escrow_data.get('escrow_id'),
                'application_id': job_details.get('application_id')
            }

            # Establish RabbitMQ connection
            connection, channel = ensure_rabbitmq_connection()

            # Declare the queue explicitly
            queue_name = f"{employer_id}-job-accept-notification"
            channel.queue_declare(queue=queue_name, durable=True)

            # Publish the message
            channel.basic_publish(
                exchange='',  # Direct publishing to queue
                routing_key=queue_name,
                body=json.dumps(notification_message),
                properties=pika.BasicProperties(delivery_mode=2)  # Make message persistent
            )
            print(f"Notification sent to RabbitMQ, details: {notification_message}")
        except Exception as e:
            raise Exception(f"Error sending notification to RabbitMQ: {str(e)}")
        finally:
            # Ensure the connection is closed
            if 'connection' in locals() and connection.is_open:
                connection.close()

        return jsonify({
            "message": "Job successfully accepted",
            "job_id": job_id,
            "escrow_id": escrow_data.get("escrow_id")
        }), 200

    except Exception as e:
        error_message = str(e)
        log_error_to_kafka(error_message, topic="accept-job-errors")
        print(f"Error occurred: {error_message} - Logged to Kafka")
        return jsonify({"error": "An error occurred while accepting the job", "details": error_message}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 6000))
    app.run(host="0.0.0.0", port=port)