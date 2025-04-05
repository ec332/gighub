from flask import Flask, request, jsonify
import requests
import json
from kafka import KafkaProducer
import os
from dotenv import load_dotenv
from flask_cors import CORS

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# Kafka Configuration
COMPLIANCE_SERVICE_URL = os.getenv('COMPLIANCE_SERVICE_URL', 'http://localhost:5600')
CHATGPT_SERVICE_URL = os.getenv('CHATGPT_SERVICE_URL', 'http://localhost:5700')
WALLET_SERVICE_URL = os.getenv('CHATGPT_SERVICE_URL', 'http://localhost:5300')
JOBRECORD_SERVICE_URL = os.getenv('JOBRECORD_SERVICE_URL', 'http://localhost:5100')
ESCROW_SERVICE_URL = 'http://localhost:5200/api/escrow'

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

@app.route('/job-listing', methods=['POST'])
def create_job_listing():
    try:
        # Get job data from the request
        job_data = request.json

        # Validate basic job data structure
        if not job_data or 'job' not in job_data:
            return jsonify({"error": "Invalid job data format"}), 400
        skills = job_data['job'].get("skills")

        #####1. CALLING COMPLIANCE MICROSERVICE######
        try:
            # Call Compliance Microservice
            compliance_url = f"{COMPLIANCE_SERVICE_URL}/compliance"

            compliance_response = requests.post(
                compliance_url, 
                json=job_data, 
                headers={'Content-Type': 'application/json'}
            )
            # Check the compliance and raise an error if not compliant
            response_data = compliance_response.json()
            if not response_data['compliance']['is_compliant']:
                raise ValueError(f"Compliance error: {response_data['compliance']['remarks']}")


            # Check compliance service response
            if compliance_response.status_code != 201:
                # Log error and return compliance service error
                error_message = f"Compliance check failed: {compliance_response.text}"
                log_error_to_kafka(error_message, topic="publish-job-errors")
                return jsonify({"error": "Compliance check failed"}), compliance_response.status_code
            
            compliance_result = compliance_response.json()

        except requests.exceptions.RequestException as e:
            # Network or request-related errors
            error_message = f"Request to Compliance Service failed: {str(e)}"
            log_error_to_kafka(error_message, topic="publish-job-errors")
            return jsonify({"error": "Failed to process job listing due to compliance errors"}), 500
        except ValueError as e:
            # Handle the case where the response is not valid JSON
            error_message = f"Invalid JSON response from Compliance Service: {str(e)}"
            log_error_to_kafka(error_message, topic="publish-job-errors")
            return jsonify({"error": str(e)}), 400  # Return 400 Bad Request with the remarks as the error message
        


        #####2. CALLING WALLET TO SEE ENOUGH MONEY######
        try:
            wallet_id = job_data['job']['wallet']

            # Construct the URL for the wallet service
            wallet_url = f"{WALLET_SERVICE_URL}/wallet/{wallet_id}"
            
            # Call the Wallet Service to get the balance
            response = requests.get(wallet_url)
            
            # Check the response from the wallet service
            if response.status_code == 200:
                balance = response.json().get('balance')
        
                if balance < job_data['job']['price']:
                    raise ValueError("Wallet error: Insufficient balance")
            else:
                return jsonify({"error": f"Failed to fetch wallet balance. Status Code: {response.status_code}"}), response.status_code

        except requests.exceptions.RequestException as e:
            # Catch request-related errors
            return jsonify({"error": f"Error calling wallet service: {str(e)}"}), 500

        except ValueError as e:
            # Catch the "Insufficient balance" error
            return jsonify({"error": str(e)}), 400  # Return 400 Bad Request for insufficient balance



        #####3. CALLING CHATGPT MICROSERVICE######
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
                log_error_to_kafka(error_message, topic="publish-job-errors")
                return jsonify({"error": "Failed to generate job description"}), chatgpt_response.status_code
            
            job_description = chatgpt_response.json()
        except requests.exceptions.RequestException as e:
            # Network or request-related errors
            error_message = f"Request to ChatGPT Service failed: {str(e)}"
            log_error_to_kafka(error_message, topic="publish-job-errors")
            return jsonify({"error": "Failed to process job listing due to CGPT failure"}), 500
        


        #####4. CALLING JOB RECORD MICROSERVICE######
        try:
            jobrecord_url = f"{JOBRECORD_SERVICE_URL}/job"
            job_data['job']['description'] = job_description['description']
            jobrecord_response = requests.post(
                jobrecord_url, 
                json={
                    "job": job_data['job'],
                    "compliance": compliance_result,
                }, 
                headers={'Content-Type': 'application/json'}
            )
            job_data['job_id'] = jobrecord_response.json()['job_id']

            # Check job record service response
            if jobrecord_response.status_code != 201:
                error_message = f"Job record creation failed: {jobrecord_response.text}"
                log_error_to_kafka(error_message, topic="publish-job-errors")
                return jsonify({"error": "Failed to create job record"}), jobrecord_response.status_code
            
        except requests.exceptions.RequestException as e:
            # Network or request-related errors
            error_message = f"Request to Job Record Service failed: {str(e)}"
            log_error_to_kafka(error_message, topic="publish-job-errors")
            return jsonify({"error": "Failed to process job listing"}), 500
        

        # Step 5: Deduct money from wallet 
        try:
            print(f"Invoking wallet microservice to deduct money for job ID: {job_data['job_id']}")
            wallet_response = requests.post(
                f"{WALLET_SERVICE_URL}/wallet/{job_data['job']['wallet']}", 
                json={"amount": -job_data['job']['price']},
                headers={'Content-Type': 'application/json'
            })

            if wallet_response.status_code != 200:
                raise ValueError(f"Error deducting money from wallet: {wallet_response.text}")
            wallet_data = wallet_response.json()

        except ValueError as e:
            # Catch the "Insufficient balance" error
            return jsonify({"error": str(e)}), 400  # Return 400 Bad Request for insufficient balance

        print(job_data)
        # Step 6: Create escrow account
        try:
            print(f"Invoking escrow microservice to create escrow account for job ID: {job_data['job_id']}")
            escrow_response = requests.post(f'{ESCROW_SERVICE_URL}', json={'job_id': job_data['job_id'], 'employer_id': job_data['job']['employer_id'], 'amount': job_data['job']['price']})
            if escrow_response.status_code != 201:
                raise ValueError(f"Error creating escrow account: {escrow_response.text}")
            escrow_data = escrow_response.json()
            #ESCROW ID JUST TO TRACK THE ESCROW ACCOUNT, REMOVE AFTER
            escrow_id = escrow_data.get("escrow_id")
            print(f"Escrow account created, details: {escrow_data}")
            job_data['escrow_id'] = escrow_id
        except ValueError as e:
            return jsonify({"error": str(e)}), 400  

        # print(job_data)
    # Update return to include job record
        return jsonify({
            "status": "success"
            # "message": "Job listing processed successfully",
            # "compliance": compliance_result,
            # "description": job_description,
            # "job_record": job_record
        }), 201
    
    except Exception as e:
        # Catch-all for unexpected errors
        error_message = f"Unexpected error in job listing creation: {str(e)}"
        log_error_to_kafka(error_message, topic="publish-job-errors")
        return jsonify({"error": "Internal server error"}), 500

@app.errorhandler(500)
def handle_500(error):
    error_message = f"Internal server error: {str(error)}"
    log_error_to_kafka(error_message, topic="publish-job-errors")
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5003, debug=True)