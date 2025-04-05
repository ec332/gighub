from flask import Flask, request, jsonify
from kafka import KafkaProducer
import requests
import pika
import json
from flask_cors import CORS
app = Flask(__name__)
CORS(app)
# Update these URLs with actual service endpoints
JOB_RECORD_UPDATE_URL = "http://localhost:5100/job/{job_id}"
ESCROW_UPDATE_URL = "http://localhost:5200/escrow/{job_id}"
WALLET_UPDATE_URL = "http://localhost:5300/wallet/{wallet_id}"
RETRIEVE_WALLET_URL = "https://personal-byixijno.outsystemscloud.com/Freelancer/rest/v1/freelancer/byid"

# AMQP Configuration (Update this with actual credentials)
AMQP_URL = "amqp://guest:guest@localhost:5672/"
EXCHANGE_NAME = "user-job-accept-notifications"

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


def send_payment_notification(freelancer_id, amount):
    """ Sends a payment notification to the AMQP server and ensures the queue exists """
    try:
        # Connect to RabbitMQ
        params = pika.URLParameters(AMQP_URL)
        connection = pika.BlockingConnection(params)
        channel = connection.channel()

        # Ensure the exchange exists (topic type)
        channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type="topic", durable=True)

        # Define dynamic routing key and queue name
        routing_key = f"{freelancer_id}-job-accept-notification"
        queue_name = routing_key  # Queue name matches the routing key

        # Ensure the queue exists
        channel.queue_declare(queue=queue_name, durable=True)

        # Bind queue to exchange
        channel.queue_bind(exchange=EXCHANGE_NAME, queue=queue_name, routing_key=routing_key)

        # Prepare the message
        message = {
            "freelancer_id": freelancer_id,
            "amount": amount,
            "message": f"Payment of ${amount} successfully credited."
        }
        message_body = json.dumps(message)

        # Publish message to the exchange with the routing key
        channel.basic_publish(
            exchange=EXCHANGE_NAME,
            routing_key=routing_key,
            body=message_body,
            properties=pika.BasicProperties(
                delivery_mode=2 
            )
        )

        # Close the connection
        connection.close()
        print(f"Notification sent: {message} to queue {queue_name}")

    except Exception as e:
        print(f"Failed to send AMQP notification: {str(e)}")

@app.route('/approve-job', methods=['POST'])
def create_task():
    data = request.get_json()

    required_fields = [
        "ID", "FreelancerID", "Price"
    ]
    
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    job_id = data["ID"]
    freelancer_id = data["FreelancerID"]
    amount = data["Price"]

    # Step 1: Update Job Record Status to 'completed'
    job_update_payload = {"job_id": job_id, "status": "completed"}
    try:
        job_update_response = requests.put(JOB_RECORD_UPDATE_URL.format(job_id=job_id), json=job_update_payload)
        job_update_response.raise_for_status()
    except requests.exceptions.RequestException as e:    
    # Send error to your Flask error logging service
        log_error_to_kafka(str(e), topic="approve-job-errors")
        return jsonify({"error": "Failed to update job record", "details": str(e)}), 500


    # Step 2: Call Escrow Microservice to release funds
    escrow_update_payload = {"status": "released"}
    try:
        escrow_response = requests.put(ESCROW_UPDATE_URL.format(job_id=job_id), json=escrow_update_payload)
        escrow_response.raise_for_status()

    except requests.exceptions.RequestException as e:    
    # Send error to your Flask error logging service
        log_error_to_kafka(str(e), topic="approve-job-errors")
        return jsonify({"error": "Failed to update escrow status", "details": str(e)}), 500

    print("DONE")
    #Send
    try:
        url = f"{RETRIEVE_WALLET_URL}/{freelancer_id}"
        response = requests.get(url)
        response.raise_for_status()  # raises HTTPError for bad status
        data = response.json()
        print(data)
        wallet_id = data["Freelancer"]["WalletId"]
    except Exception as e:
        return jsonify({"error": "Failed to retrieve wallet ID", "message": str(e)}), 500

    print(wallet_id)

    # Step 2: Transfer funds to freelancer's wallet
    wallet_update_payload = {"amount": amount}
    try:
        wallet_response = requests.post(WALLET_UPDATE_URL.format(wallet_id=wallet_id), json=wallet_update_payload)
        wallet_response.raise_for_status()
    except requests.exceptions.RequestException as e:    
        log_error_to_kafka(str(e), topic="approve-job-errors")  # Make sure this function is defined
        return jsonify({"error": "Failed to transfer funds to wallet", "details": str(e)}), 500

    return jsonify({"message": "Payment processed successfully"}), 200

    # Step 4: Send AMQP Notification
    try:
        send_payment_notification(freelancer_id, amount)
    except Exception as e:
    # Send error to your Flask error logging service
        log_error_to_kafka(str(e), topic="approve-job-errors")
        return jsonify({"error": "Payment processed, but failed to send notification", "details": str(e)}), 500

    return jsonify({"message": "Task created, status updated to Pending, escrow released, payment processed, and notification sent"}), 201

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)
