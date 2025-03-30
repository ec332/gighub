from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

with app.app_context():
    db.create_all()

@app.errorhandler(500)
def internal_server_error(error):
    return jsonify({"error": "Internal server error"}), 500

class Compliance(db.Model):
    __tablename__ = 'compliance'

    id = db.Column('ID', db.Integer, primary_key=True, autoincrement=True)
    job_id = db.Column('JobID', db.Integer, nullable=False, unique=False)
    is_compliant = db.Column('IsCompliant', db.Boolean, default=False)
    checked_at = db.Column('CheckedAt', db.DateTime, default=db.func.current_timestamp())
    remarks = db.Column('Remarks', db.Text, nullable=True)

    def __init__(self, job_id, is_compliant=False, remarks=""):
        self.job_id = job_id
        self.is_compliant = is_compliant
        self.remarks = remarks

    def json(self):
        return {
            "id": self.id,
            "job_id": self.job_id,
            "is_compliant": self.is_compliant,
            "checked_at": datetime.now(),
            "remarks": self.remarks
        }

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

    new_compliance = Compliance(
        job_id=job_id,
        is_compliant=is_compliant,
        remarks=remarks
    )

    db.session.add(new_compliance)
    db.session.commit()

    return jsonify({
        "message": "Compliance check completed",
        "compliance": {
            "job_id": job_id,
            "is_compliant": is_compliant,
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

    # # Rule 2: Description must be at least 50 characters
    # if not job.get("description") or len(job["description"].strip()) < 50:
    #     remarks.append("Description must be at least 50 characters.")
    #     is_compliant = False

    # Rule 3: Category must be valid
    valid_categories = {"IT", "Finance", "Marketing", "Healthcare", "Education", "Engineering","Retail","F&B","Logistics"}
    if not job.get("category") or job["category"] not in valid_categories:
        remarks.append(f"Invalid category. Must be one of {valid_categories}.")
        is_compliant = False

    # Rule 4: Price must be greater than zero
    if job.get("price") is None or job["price"] <= 0:
        remarks.append("Price must be greater than zero.")
        is_compliant = False

    # Rule 5: At least one skill must be listed
    if not job.get("skills") or job["skills"].strip() == "":
        remarks.append("At least one skill is required.")
        is_compliant = False

    return is_compliant, ", ".join(remarks) if remarks else "Job is compliant."

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0", port=5200, debug=True)