from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
import os
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
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

@app.route('/pendingapproval', methods=['POST'])
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

@app.route('/pendingapproval', methods=['GET'])
def get_jobs():
    employer_id = request.args.get('employerId')
    if employer_id:
        jobs = Job.query.filter_by(employer_id=employer_id).all()
    else:
        #TODO: Remove before deployment
        jobs = Job.query.all()

    job_list = [{"jobId": job.job_id, "employerId": job.employer_id} for job in jobs]
    return jsonify(job_list)

@app.route('/pendingapproval/<int:job_id>', methods=['DELETE'])
def delete_job(job_id):
    try:
        job = Job.query.get(job_id)
        if not job:
            return jsonify({"error": f"No job found with job_id {job_id}"}), 404

        db.session.delete(job)
        db.session.commit()
        return jsonify({"message": f"Job with job_id {job_id} deleted successfully"}), 200

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)