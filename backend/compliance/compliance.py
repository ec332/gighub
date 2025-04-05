from flask import Flask, request, jsonify
from datetime import datetime

app = Flask(__name__)

@app.errorhandler(500)
def internal_server_error(error):
    return jsonify({"error": "Internal server error"}), 500

@app.route('/compliance/<int:job_id>', methods=['POST'])
def submit_compliance_check(job_id):
    # Get job data directly from the POST request
    job_data = request.json.get("job")

    if not job_data:
        return jsonify({"error": "Invalid job data in request"}), 400

    # Ensure the job_id in the URL matches the job_id in the payload
    if job_data.get("id") != job_id:
        return jsonify({"error": "Job ID in URL does not match job ID in payload"}), 400

    is_compliant, remarks = check_job_compliance(job_data)

    return jsonify({
        "message": "Compliance check completed",
        "compliance": {
            "job_id": job_id,
            "is_compliant": is_compliant,
            "checked_at": datetime.utcnow().isoformat(),
            "remarks": remarks
        }
    }), 201

def check_job_compliance(job):
    """
    Evaluates if a job listing meets compliance standards.

    :param job: Job dictionary (from request JSON)
    :return: (is_compliant, remarks)
    """
    remarks = []
    is_compliant = True  

    # Rule 1: Title must not be empty
    if not job.get("title") or job["title"].strip() == "":
        remarks.append("Title is missing.")
        is_compliant = False

    # Rule 2: Category must be valid
    valid_categories = {
        "IT", "Finance", "Marketing", "Healthcare",
        "Education", "Engineering", "Retail", "F&B", "Logistics"
    }
    if not job.get("category") or job["category"] not in valid_categories:
        remarks.append(f"Invalid category. Must be one of {valid_categories}.")
        is_compliant = False

    # Rule 3: Price must be greater than zero
    if job.get("price") is None or job["price"] <= 0:
        remarks.append("Price must be greater than zero.")
        is_compliant = False

    # Rule 4: At least one skill must be listed
    if not job.get("skills") or job["skills"].strip() == "":
        remarks.append("At least one skill is required.")
        is_compliant = False

    return is_compliant, ", ".join(remarks) if remarks else "Job is compliant."

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5600, debug=True)
