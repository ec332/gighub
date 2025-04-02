from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os
import json
from kafka import KafkaProducer

app = Flask(__name__)
CORS(app)

# OutSystems Freelancer API URL
FREELANCER_SERVICE_URL = "https://personal-byixijno.outsystemscloud.com/Freelancer/rest/v1/freelancer"
JOB_SERVICE_URL = 'http://localhost:5100/job'
# Kafka Producer setup
KAFKA_BROKER = 'localhost:29092'
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

@app.route('/matchjob', methods=['POST'])
def match_job():
    try:
        # Get request payload
        data = request.json
        freelancer_email = data.get('freelancer_email')

        if not freelancer_email:
            return jsonify({"error": "Freelancer email is required."}), 400

        # Step 1: Call the OutSystems Freelancer API for freelancer details
        print(f"Fetching freelancer details for email: {freelancer_email}")
        freelancer_response = requests.get(f'{FREELANCER_SERVICE_URL}/{freelancer_email}/')
        if freelancer_response.status_code != 200:
            raise Exception(f"Error invoking freelancer service: {freelancer_response.text}")
        freelancer_data = freelancer_response.json()
        print(f"Freelancer details fetched: {freelancer_data}")

        # Check if API call was successful
        if not freelancer_data.get("Result", {}).get("Success", False):
            error_message = freelancer_data.get("Result", {}).get("ErrorMessage", "Unknown error")
            raise Exception(f"Freelancer lookup failed: {error_message}")
            
        # Extract freelancer details
        freelancer_info = freelancer_data.get("Freelancer", {})
        skills = freelancer_info.get("Skills", "").split(",")  # Assuming skills are comma-separated

        # Step 2: Call the Job Service to find job matches

        # No skills found, invoke job service to get all jobs
        if not skills or skills == [""]:
            print("Fetching all jobs")
            job_response = requests.get(f'{JOB_SERVICE_URL}')
            if job_response.status_code != 200:
                raise Exception(f"Error invoking job service: {job_response.text}")
            job_data = job_response.json()
            print(f"Available jobs fetched: {job_data}")
            return jsonify(job_data), 200

        #skills found
        print(f"Matching freelancer skills: {skills}")
        job_response = requests.get(f'{JOB_SERVICE_URL}/skills', json={'skills': skills})
        if job_response.status_code != 200:
            raise Exception(f"Error invoking job service: {job_response.text}")
        job_data = job_response.json()
        print(f"Matching job listings fetched: {job_data}")

        return jsonify(job_data), 200

    except Exception as e:
        error_message = str(e)
        print("Error occured, Logging to kafka...")
        log_error_to_kafka(error_message, topic="match-job-errors")
        return jsonify({"error": "An error occurred while matching jobs", "details": error_message}), 500

if __name__ == '__main__':
    port = 5001
    app.run(host='0.0.0.0', port=port)
