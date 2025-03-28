from flask import Flask, request, jsonify
import requests
import json
from kafka import KafkaProducer
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Kafka Configuration
KAFKA_BROKER = os.getenv('KAFKA_BROKER', 'localhost:29092')
COMPLIANCE_SERVICE_URL = os.getenv('COMPLIANCE_SERVICE_URL', 'http://localhost:5002')
CHATGPT_SERVICE_URL = os.getenv('CHATGPT_SERVICE_URL', 'http://localhost:5004')
JOBRECORD_SERVICE_URL = os.getenv('JOBRECORD_SERVICE_URL', 'http://localhost:5100')


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

@app.route('/job-listing', methods=['POST'])
def create_job_listing():
    try:
        # Get job data from the request
        job_data = request.json

        # Validate basic job data structure
        if not job_data or 'job' not in job_data:
            return jsonify({"error": "Invalid job data format"}), 400

        # Extract job ID from the job data
        job_id = job_data['job'].get('id')
        if not job_id:
            return jsonify({"error": "Job ID is required"}), 400

        #####1. CALLING COMPLIANCE MICROSERVICE######
        try:
            # Call Compliance Microservice
            compliance_url = f"{COMPLIANCE_SERVICE_URL}/compliance/{job_id}"
            compliance_response = requests.post(
                compliance_url, 
                json=job_data, 
                headers={'Content-Type': 'application/json'}
            )

            # Check compliance service response
            if compliance_response.status_code != 201:
                # Log error and return compliance service error
                error_message = f"Compliance check failed: {compliance_response.text}"
                log_error_to_kafka(error_message, topic="job-listing-errors")
                return jsonify({"error": "Compliance check failed"}), compliance_response.status_code
            
            compliance_result = compliance_response.json()

        except requests.exceptions.RequestException as e:
            # Network or request-related errors
            error_message = f"Request to Compliance Service failed: {str(e)}"
            log_error_to_kafka(error_message, topic="job-listing-errors")
            return jsonify({"error": "Failed to process job listing due to compliance errors"}), 500
        
        #####2. CALLING CHATGPT MICROSERVICE######
        try:
            chatgpt_url = f"{CHATGPT_SERVICE_URL}/generate-job-description"
            chatgpt_response = requests.post(
                chatgpt_url, 
                json=job_data['job'], 
                headers={'Content-Type': 'application/json'}
            )

            # Check ChatGPT service response
            if chatgpt_response.status_code != 200:
                error_message = f"ChatGPT description generation failed: {chatgpt_response.text}"
                log_error_to_kafka(error_message, topic="job-listing-errors")
                return jsonify({"error": "Failed to generate job description"}), chatgpt_response.status_code
            
            job_description = chatgpt_response.json()


        except requests.exceptions.RequestException as e:
            # Network or request-related errors
            error_message = f"Request to ChatGPT Service failed: {str(e)}"
            log_error_to_kafka(error_message, topic="job-listing-errors")
            return jsonify({"error": "Failed to process job listing due to CGPT failure"}), 500
        

        #####3. CALLING JOB RECORD MICROSERVICE######
        try:
            jobrecord_url = f"{JOBRECORD_SERVICE_URL}/job"
            jobrecord_response = requests.post(
                jobrecord_url, 
                json={
                    "job": job_data['job'],
                    "compliance": compliance_result,
                    "description": job_description
                }, 
                headers={'Content-Type': 'application/json'}
            )

            # Check job record service response
            print({
                    "job": job_data['job'],
                    "compliance": compliance_result,
                    "description": job_description
                })
            if jobrecord_response.status_code != 201:
                error_message = f"Job record creation failed: {jobrecord_response.text}"
                log_error_to_kafka(error_message, topic="job-listing-errors")
                return jsonify({"error": "Failed to create job record"}), jobrecord_response.status_code
            
            job_record = jobrecord_response.json()

            # Update return to include job record
            return jsonify({
                "message": "Job listing processed successfully",
                "compliance": compliance_result,
                "description": job_description,
                "job_record": job_record
            }), 201

        except requests.exceptions.RequestException as e:
            # Network or request-related errors
            error_message = f"Request to Job Record Service failed: {str(e)}"
            log_error_to_kafka(error_message, topic="job-listing-errors")
            return jsonify({"error": "Failed to process job listing"}), 500

    except Exception as e:
        # Catch-all for unexpected errors
        error_message = f"Unexpected error in job listing creation: {str(e)}"
        log_error_to_kafka(error_message, topic="job-listing-errors")
        return jsonify({"error": "Internal server error"}), 500

@app.errorhandler(500)
def handle_500(error):
    error_message = f"Internal server error: {str(error)}"
    log_error_to_kafka(error_message, topic="job-listing-errors")
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5003, debug=True)