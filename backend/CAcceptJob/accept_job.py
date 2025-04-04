from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import pika
import os
import json
from kafka import KafkaProducer
import threading

#HOW RUN
# docker build -t accept-job-service .
# docker run --name accept-job-container -p 6000:5000 accept-job-service

app = Flask(__name__)
CORS(app)  # Enable CORS

# Configuration for external services
JOB_SERVICE_URL = 'http://localhost:5100/job'
ESCROW_SERVICE_URL = 'http://localhost:5200/api/escrow'
WALLET_SERVICE_URL = 'http://localhost:5300/wallet'
KAFKA_BROKER = 'localhost:29092'
AMQP_URL = 'amqp://guest:guest@localhost:5672/' #update with actual credentials
FREELANCER_SERVICE_URL = "https://personal-byixijno.outsystemscloud.com/Freelancer/rest/v1/freelancer"
EMPLOYER_SERVICE_URL = 'http://localhost:5400/api/employer'

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
        print(f"Failed to send error to Kafka: {str(e)}")

@app.route('/acceptjob', methods=['POST'])
def accept_job():
    try:
        # Parse the JSON payload from the request body
        job_details = request.json
        job_id = job_details.get('job_id')
        employer_id = job_details.get('employer_id')
        freelancer_email = job_details.get('freelancer_email')
        pay = job_details.get('pay')
        
        # Step 1: Call the OutSystems Freelancer API for freelancer ID
        print(f"Fetching freelancer details for email: {freelancer_email}")
        freelancer_response = requests.get(f'{FREELANCER_SERVICE_URL}/{freelancer_email}/')
        if freelancer_response.status_code != 200:
            raise Exception(f"Error invoking freelancer service: {freelancer_response.text}")
        freelancer_data = freelancer_response.json()
        freelancer_info = freelancer_data.get("Freelancer", {})
        freelancer_id = freelancer_info.get("Id")
        print(f"Freelancer ID fetched: {freelancer_data}")

        # Check if API call was successful
        if not freelancer_data.get("Result", {}).get("Success", False):
            error_message = freelancer_data.get("Result", {}).get("ErrorMessage", "Unknown error")
            raise Exception(f"Freelancer lookup failed: {error_message}")

        # Step 2: Get wallet ID from employer ID
        print(f"Fetching wallet ID for employer ID: {employer_id}")
        employer_response = requests.get(f'{EMPLOYER_SERVICE_URL}/{employer_id}')
        if employer_response.status_code != 200:
            raise Exception(f"Error fetching employer details: {employer_response.text}")
        employer_data = employer_response.json()
        wallet_id = employer_data.get("employer", {}).get("wallet_id")
        if not wallet_id:
            raise Exception(f"Wallet ID not found for employer ID: {employer_id}")
        print(f"Wallet ID fetched: {wallet_id}")

        # Step 3: Deduct money from wallet 
        print(f"Invoking wallet microservice to deduct money for job ID: {job_id}")
        wallet_response = requests.post(f'{WALLET_SERVICE_URL}/{wallet_id}', json={'amount': -pay})
        if wallet_response.status_code != 200:
            raise Exception(f"Error deducting money from wallet: {wallet_response.text}")
        wallet_data = wallet_response.json()
        print(f"Employer wallet deducted, details: {wallet_data}")

        # Step 4: Create escrow account (WORKS)
        print(f"Invoking escrow microservice to create escrow account for job ID: {job_id}")
        escrow_response = requests.post(f'{ESCROW_SERVICE_URL}', json={'job_id': job_id, 'employer_id': employer_id, 'freelancer_id': freelancer_id, 'amount': pay})
        if escrow_response.status_code != 201:
            raise Exception(f"Error creating escrow account: {escrow_response.text}")
        escrow_data = escrow_response.json()
        #ESCROW ID JUST TO TRACK THE ESCROW ACCOUNT, REMOVE AFTER
        escrow_id = escrow_data.get("escrow_id")
        print(f"Escrow account created, details: {escrow_data}")

        # Step 5: Update job status to Closed & freelancer ID
        print(f"Invoking job microservice to update job status to Closed for job ID: {job_id}")
        job_response = requests.put(f'{JOB_SERVICE_URL}/{job_id}', json={'status': 'close', 'freelancer_id': freelancer_id})
        if job_response.status_code != 200:
            raise Exception(f"Error updating job status: {job_response.text}")
        job_data = job_response.json()
        print(f"Job status updated, details: {job_data}")

        # Step 6: Send job accepted notification to employer via RabbitMQ (WORKS)
        try:
            connection = pika.BlockingConnection(pika.URLParameters(AMQP_URL))
            channel = connection.channel()

            channel.exchange_declare(exchange='user-job-accept-notification', exchange_type="topic", durable=True)
            
            queue_name = f"{employer_id}-job-accept-notification"
            
            # Declare the queue (ensure it exists)
            channel.queue_declare(queue=queue_name, durable=True)
            
            #Bind the queue to the exchange with binding key (in case it wasn't already bound)
            channel.queue_bind(exchange='user-job-accept-notification', queue=queue_name, routing_key=queue_name)

            message = {
                "message": f"JOB {job_id} has been ACCEPTED",
                #"application_id": application_id,
                "job_id": job_id,
                "freelancer_id": freelancer_id
            }

            # Publish message to the queue with routing key
            channel.basic_publish(
                exchange='user-job-accept-notification',  # Direct publishing to queue OR configure w credentials
                routing_key=queue_name,
                body=json.dumps(message),
                properties=pika.BasicProperties(delivery_mode=2)  # Make message persistent
            )

            print(f"Sent job acceptance notification to {queue_name}: {message}")

            # Close the connection
            connection.close()

        except Exception as e:
            raise Exception(f"Error invoking notification microservice: {str(e)}")

    except Exception as e:
        error_message = str(e)
        print("Error occured, Logging to kafka...")
        log_error_to_kafka(error_message, topic="accept-job-errors")
        return jsonify({"error": "An error occurred while accepting the job", "details": error_message}), 500
    
    #ESCROW ID JUST TO TRACK THE ESCROW ACCOUNT, REMOVE AFTER
    return jsonify({"message": f"Job accepted, escrow account {escrow_id} created, and notification sent"}), 201
    
if __name__ == '__main__':
    port = 5002
    app.run(host="0.0.0.0", port=port)