from flask import Flask, request, jsonify
from kafka import KafkaProducer
import requests
import pika
import json

app = Flask(__name__)

# Update these URLs with actual service endpoints
JOB_RECORD_UPDATE_URL = "http://localhost:5100/job/{job_id}"
CREATE_PENDING_APPROVAL_URL = "http://localhost:5500/jobs"

# AMQP Configuration (Update this with actual credentials)
AMQP_URL = "amqp://guest:guest@localhost:5672/"
EXCHANGE_NAME = "user-payment-exchange"
ROUTING_KEY = "user*-payment-notifications"

# Kafka Configuration
KAFKA_BROKER = 'localhost:29092'

# Kafka Producer (sends error logs)
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
        print(f"Failed to send error to Kafka: {str(e)}")

def send_job_complete_notification(employer_id, job_id):
    """ Sends a payment notification to the AMQP server """
    try:
        # Connect to RabbitMQ
        params = pika.URLParameters(AMQP_URL)
        connection = pika.BlockingConnection(params)
        channel = connection.channel()

        # Ensure the exchange exists (topic type)
        channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type="topic", durable=True)

        # Prepare the message
        message = {
            "employer_id": employer_id,
            "job_id": job_id,
            "message": f"${job_id} has been completed!"
        }
        message_body = json.dumps(message)

        # Publish message to the exchange with the routing key
        channel.basic_publish(exchange=EXCHANGE_NAME, routing_key=ROUTING_KEY, body=message_body)

        # Close the connection
        connection.close()

    except Exception as e:
        print(f"Failed to send AMQP notification: {str(e)}")

@app.route('/complete-job', methods=['POST'])
def create_task():
    data = request.get_json()

    required_fields = [
        "ID", "EmployerID", "FreelancerID", "Title", "Description", 
        "Category", "Price", "Status", "isCompliant", "ComplianceID"
    ]
    
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    job_id = data["ID"]
    employer_id = data["EmployerID"]

    # Step 1: Update Job Record Status to 'finished'
    job_update_payload = {"job_id": job_id, "status": "finished"}
    try:
        job_update_response = requests.put(JOB_RECORD_UPDATE_URL.format(job_id=job_id), json=job_update_payload)
        job_update_response.raise_for_status()

    except requests.exceptions.RequestException as e:    
    # Send error to Flask error logging service
        log_error_to_kafka(str(e), topic="complete-job-errors")
        return jsonify({"error": "Failed to update job record", "details": str(e)}), 500
    
    # Step 2: Send AMQP Notification
    try:
        send_job_complete_notification(employer_id, job_id)

    except Exception as e:
    # Send error to Flask error logging service
        log_error_to_kafka(str(e), topic="complete-job-errors")
        return jsonify({"error": "Job completed, but failed to send notification", "details": str(e)}), 500

    # Step 3: Create job in Pending Approval
    create_request_payload = {"employerId" : employer_id, "jobId" : job_id}
    try:
        create_pending_approval_response = requests.post(CREATE_PENDING_APPROVAL_URL, json=create_request_payload)
        create_pending_approval_response.raise_for_status()

    except requests.exceptions.RequestException as e:
    # Send error to Flask error logging service
        log_error_to_kafka(str(e), topic="complete-job-errors")
        return jsonify({"error": "Failed to create Job Request", "details": str(e)}), 500

    return jsonify({"message": "Pending approval job request created, and notification sent"}), 201


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)