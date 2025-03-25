from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import pika
import os
import json
from kafka import KafkaProducer

app = Flask(__name__)
CORS(app)  # Enable CORS

# Configuration for external services
WALLET_SERVICE_URL = os.getenv('WALLET_SERVICE_URL', 'http://localhost:5004/wallet')
ESCROW_SERVICE_URL = os.getenv('ESCROW_SERVICE_URL', 'http://localhost:5005/api/escrow')
JOB_SERVICE_URL = os.getenv('JOB_SERVICE_URL', 'http://localhost:5002/job')

AMQP_URL = os.getenv('AMQP_URL', 'amqp://guest:guest@localhost:5672/')
KAFKA_BROKER = os.getenv('KAFKA_BROKER', 'localhost:29092')

# AMQP setup
connection = pika.BlockingConnection(pika.URLParameters(AMQP_URL))
channel = connection.channel()
channel.queue_declare(queue='accept-job-errors', durable=True)

# Kafka Producer setup
producer = KafkaProducer(
    bootstrap_servers=KAFKA_BROKER,
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

def log_error_to_kafka(error_message, topic="error-logs"):
    """ Send errors to Kafka for logging """
    try:
        producer.send(topic, {"error_message": error_message})
        producer.flush()  # Ensure the message is sent
    except Exception as e:
        print(f"Failed to send error to Kafka: {error_message}")

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

        # Step 4: Send job accepted notification to employer via RabbitMQ
        
        print(f"Sending job accepted notification to employer for job ID: {job_id}")
        notification_message = {
            'queue': 'Job_Accept_Notifications',  # Updated queue name
            'job_id': job_id,
            'employer_id': employer_id,
            'freelancer_id': freelancer_id,
            'escrow_id': escrow_data.get('escrow_id'),  # Add the escrow_id from the escrow response
            'application_id': job_details.get('application_id')  # Add the application_id from job details
        }
        channel.basic_publish(
            exchange='notification_topic',
            routing_key='job-accept.notifications',  # Updated routing key
            body=json.dumps(notification_message),
            properties=pika.BasicProperties(
                delivery_mode=2,  # Make message persistent
            )
        )
        print(f"Notification sent to RabbitMQ, details: {notification_message}")
    except Exception as e:
        error_message = str(e)
        topic='accept-job-errors'
        log_error_to_kafka(error_message, topic)
        print(f"Error occurred: {error_message} - Invoking error microservice with topic: {topic}")

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(port=port)