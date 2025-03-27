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

# Job Matching Service URL (Assuming it's another microservice)
JOB_SERVICE_URL = os.getenv('JOB_SERVICE_URL', 'http://localhost:5100/job')

# Kafka Producer setup
KAFKA_BROKER = os.getenv('KAFKA_BROKER', 'localhost:29092')
producer = KafkaProducer(
    bootstrap_servers=KAFKA_BROKER,
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

def log_error_to_kafka(error_message, topic="error-logs"):
    """ Send errors to Kafka for logging """
    try:
        producer.send(topic, {"error_message": error_message})
        producer.flush()
    except Exception as e:
        print(f"Failed to send error to Kafka: {error_message}")

@app.route('/matchjob', methods=['POST'])
def match_job():
    try:
        # Get request payload
        data = request.json
        freelancer_email = data.get('freelancer_email')

        if not freelancer_email:
            return jsonify({"error": "Freelancer email is required."}), 400

        print(f"Fetching freelancer details for email: {freelancer_email}")

        # Call the OutSystems Freelancer API
        freelancer_response = requests.get(f'{FREELANCER_SERVICE_URL}/{freelancer_email}')
        freelancer_response.raise_for_status()  # Raise exception if request fails
        freelancer_data = freelancer_response.json()

        # Check if API call was successful
        if not freelancer_data.get("Result", {}).get("Success", False):
            error_message = freelancer_data.get("Result", {}).get("ErrorMessage", "Unknown error")
            return jsonify({"error": f"Freelancer lookup failed: {error_message}"}), 404

        # Extract freelancer details
        freelancer_info = freelancer_data.get("Freelancer", {})
        skills = freelancer_info.get("Skills", "").split(",")  # Assuming skills are comma-separated

        if not skills or skills == [""]:
            return jsonify({"message": "No skills found for this freelancer."}), 200

        print(f"Matching freelancer skills: {skills}")

        # Call the Job Service to find job matches
        job_response = requests.post(f'{JOB_SERVICE_URL}/skills', json={'skills': skills})
        job_response.raise_for_status()
        job_data = job_response.json()

        print(f"Matching job listings: {job_data}")

        return jsonify(job_data), 200

    except requests.exceptions.RequestException as e:
        error_message = f"Request failed: {str(e)}"
        log_error_to_kafka(error_message, "match-job-errors")
        return jsonify({"error": "Failed to communicate with external services"}), 500

    except Exception as e:
        error_message = str(e)
        log_error_to_kafka(error_message, "match-job-errors")
        return jsonify({"error": "An unexpected error occurred"}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 6100))
    app.run(host='0.0.0.0', port=port)
