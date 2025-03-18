from flask import Flask, request, jsonify
import openai
import requests

app = Flask(__name__)

# Set up OpenAI API key
OPENAI_API_KEY = ""
# JOB_RECORD_SERVICE_URL = ""

openai.api_key = OPENAI_API_KEY

def generate_job_description(job_info):
    """Send job information to ChatGPT to generate a job description."""
    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",  # Use the latest available model
            messages=[
                {"role": "system", "content": "You are an assistant that generates job descriptions."},
                {"role": "user", "content": f"Generate a job listing for the following job: {job_info}"}
            ]
        )
        return response["choices"][0]["message"]["content"].strip()
    except Exception as e:
        return str(e)

# def record_job(job_info, description):
#     """Send job information along with the generated description to the job record service."""
#     data = {"job_info": job_info, "description": description}
#     response = requests.post(JOB_RECORD_SERVICE_URL, json=data)
#     return response.json()

@app.route("/generate_job_description", methods=["POST"])
def handle_generate_job_description():
    """API endpoint to receive job info and return a generated job description."""
    job_info = request.json.get("job_info")
    if not job_info:
        return jsonify({"error": "Missing job_info field"}), 400
    
    job_description = generate_job_description(job_info)
    return jsonify({"job_description": job_description})

@app.route("/create_job_record", methods=["POST"])
def handle_create_job_record():
    """API endpoint to generate a job description and record the job."""
    job_info = request.json.get("job_info")
    if not job_info:
        return jsonify({"error": "Missing job_info field"}), 400
    
    job_description = generate_job_description(job_info)
    job_record_response = record_job(job_info, job_description)
    return jsonify(job_record_response)

if __name__ == "__main__":
    app.run(debug=True)
