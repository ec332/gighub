from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
import json
from kafka import KafkaProducer

app = Flask(__name__)
CORS(app)  # Enable CORS

# Configuration for external services
FREELANCER_SERVICE_URL = os.getenv('FREELANCER_SERVICE_URL', 'http://localhost:5001/freelancer')
JOB_SERVICE_URL = os.getenv('JOB_SERVICE_URL', 'http://localhost:5002/job')
KAFKA_BROKER = os.getenv('KAFKA_BROKER', 'localhost:29092')

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

@app.route('/matchjob', methods=['POST'])
def match_job():
    try:
        # Parse the JSON payload from the request body
        data = request.json
        freelancer_id = data.get('freelancer_id')

        if not freelancer_id:
            raise ValueError("Freelancer ID is required.")

        print(f"Invoking freelancer microservice for freelancer ID: {freelancer_id}")
        freelancer_response = requests.get(f'{FREELANCER_SERVICE_URL}/{freelancer_id}')
        freelancer_response.raise_for_status()  
        freelancer_data = freelancer_response.json()
        print(f"Freelancer details: {freelancer_data}")

        skills = freelancer_data.get('skills')
        if not skills:
            return jsonify({"message": "No skills found for freelancer."}), 200

        print("Invoking job microservice to fetch matching job listings")
        # Correct GET request with query parameters
        job_response = requests.post(f'{JOB_SERVICE_URL}/skills', json={'skills': skills})
        job_response.raise_for_status()
        job_data = job_response.json()
        
        print(f"Matching job listings: {job_data}")

        return jsonify(job_data), 200

    except Exception as e:
        error_message = str(e)
        topic = 'match-job-errors'
        log_error_to_kafka(error_message, topic)
        print(f"Error occurred: {error_message} - Sending to Kafka topic: {topic}")

        
        # Send the error to Kafka with exception handling

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(port=port)
