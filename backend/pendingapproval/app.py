from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
import os

app = Flask(__name__)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:password@db:5432/jobs_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Define the model
class Job(db.Model):
    job_id = db.Column(db.Integer, primary_key=True)
    employer_id = db.Column(db.Integer, nullable=False)

# Ensure the tables are created within the application context
with app.app_context():
    db.create_all()

@app.route('/jobs', methods=['POST'])
def add_job():
    data = request.get_json()
    employer_id = data.get('employerId')
    job_id = data.get('jobId')

    if not employer_id or not job_id:
        return jsonify({"error": "Missing employerId or jobId"}), 400

    try:
        new_job = Job(job_id=job_id, employer_id=employer_id)
        db.session.add(new_job)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": f"A job with job_id {job_id} already exists."}), 409
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

    return jsonify({"message": "Job added successfully!"}), 201

@app.route('/jobs', methods=['GET'])
def get_jobs():
    jobs = Job.query.all()
    job_list = [{"jobId": job.job_id, "employerId": job.employer_id} for job in jobs]
    return jsonify(job_list)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
