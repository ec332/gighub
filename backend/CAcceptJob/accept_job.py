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
ESCROW_SERVICE_URL = 'http://localhost:5200/escrow/acceptedjob'
KAFKA_BROKER = 'localhost:29092'
AMQP_URL = 'amqp://guest:guest@localhost:5672/' #update with actual credentials

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
        freelancer_id = job_details.get('freelancer_id')
        employer_id = job_details.get('employer_id')

        # Step 4: Update freelancer ID in Escrow Service
        job_response = requests.put(ESCROW_SERVICE_URL, json={'job_id': job_id, 'freelancer_id' : freelancer_id})
        if job_response.status_code != 200:
            raise Exception(f"Error updating job status: {job_response.text}")
        job_data = job_response.json()
        print(f"Job status updated, details: {job_data}")


        # Step 5: Update job status to Closed & freelancer ID
        print(f"Invoking job microservice to update job status to Closed for job ID: {job_id}")
        job_response = requests.put(f'{JOB_SERVICE_URL}/{job_id}', json={'status': 'close', 'freelancer_id': freelancer_id})
        if job_response.status_code != 200:
            raise Exception(f"Error updating job status & freelancer ID: {job_response.text}")
        job_data = job_response.json()
        print(f"Job status updated, details: {job_data}")

        # Step 2: Send job accepted notification to employer via RabbitMQ (WORKS)
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
                "message": f"JOB has been ACCEPTED",
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
    
    return jsonify({"message": f"Job accepted, and notification sent"}), 200
    
if __name__ == '__main__':
    port = 5002
    app.run(host="0.0.0.0", port=port)