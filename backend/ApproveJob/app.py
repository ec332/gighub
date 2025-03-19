from flask import Flask, request, jsonify
import requests
import pika
import json

app = Flask(__name__)

# Update these URLs with actual service endpoints
JOB_RECORD_UPDATE_URL = "http://localhost:5000/job/{job_id}"
ESCROW_UPDATE_URL = "http://localhost:5000/escrow/{job_id}"
WALLET_UPDATE_URL = "http://localhost:5000/wallet/{freelancer_id}"

# AMQP Configuration (Update this with actual credentials)
AMQP_URL = "amqp://guest:guest@localhost:5672/"
EXCHANGE_NAME = "user-payment-exchange"
ROUTING_KEY = "user*-payment-notifications"

def send_payment_notification(freelancer_id, amount):
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
            "freelancer_id": freelancer_id,
            "amount": amount,
            "message": f"Payment of ${amount} successfully credited."
        }
        message_body = json.dumps(message)

        # Publish message to the exchange with the routing key
        channel.basic_publish(exchange=EXCHANGE_NAME, routing_key=ROUTING_KEY, body=message_body)

        # Close the connection
        connection.close()

    except Exception as e:
        print(f"Failed to send AMQP notification: {str(e)}")

@app.route('/approve-job', methods=['POST'])
def create_task():
    data = request.get_json()

    required_fields = [
        "ID", "EmployerID", "FreelancerID", "Title", "Description", 
        "Category", "Price", "Status", "isCompliant", "ComplianceID"
    ]
    
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    job_id = data["ID"]
    freelancer_id = data["FreelancerID"]
    amount = data["Price"]

    # Step 1: Update Job Record Status to 'Pending'
    job_update_payload = {"ID": job_id, "Status": "Pending"}
    try:
        job_update_response = requests.put(JOB_RECORD_UPDATE_URL.format(job_id=job_id), json=job_update_payload)
        job_update_response.raise_for_status()
    except requests.exceptions.RequestException as e:
         # TODO: Update Kafka Error Handler


        return jsonify({"error": "Failed to update job status", "details": str(e)}), 500

    # Step 2: Call Escrow Microservice to release funds
    escrow_update_payload = {"Status": "Released"}
    try:
        escrow_response = requests.put(ESCROW_UPDATE_URL.format(job_id=job_id), json=escrow_update_payload)
        escrow_response.raise_for_status()
    except requests.exceptions.RequestException as e:
         # TODO: Update Kafka Error Handler


        return jsonify({"error": "Failed to update escrow status", "details": str(e)}), 500

    # Step 3: Transfer funds to freelancer's wallet
    wallet_update_payload = {"amount": amount}
    try:
        wallet_response = requests.post(WALLET_UPDATE_URL.format(freelancer_id=freelancer_id), json=wallet_update_payload)
        wallet_response.raise_for_status()
    except requests.exceptions.RequestException as e:
         # TODO: Update Kafka Error Handler


        return jsonify({"error": "Failed to transfer funds to wallet", "details": str(e)}), 500

    # Step 4: Send AMQP Notification
    try:
        send_payment_notification(freelancer_id, amount)
    except Exception as e:
         # TODO: Update Kafka Error Handler

         
        return jsonify({"error": "Payment processed, but failed to send notification", "details": str(e)}), 500

    return jsonify({"message": "Task created, status updated to Pending, escrow released, payment processed, and notification sent"}), 201

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0", port=5000)
