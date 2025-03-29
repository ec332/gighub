import os
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import or_
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+mysqlconnector://root:rootpassword@gighub-db:3306/gighub'
# app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

class Job(db.Model):
    __tablename__ = 'job_records'
    
    id = db.Column('ID', db.Integer, primary_key=True, autoincrement=True)
    employer_id = db.Column('EmployerID', db.Integer, nullable=False)
    freelancer_id = db.Column('FreelancerID', db.Integer, nullable=True)
    title = db.Column('Title', db.String(255), nullable=False)
    description = db.Column('Description', db.Text, nullable=True)
    category = db.Column('Category', db.String(100), nullable=True)
    skills = db.Column('Skills', db.Text, nullable=True) 
    price = db.Column('Price', db.Numeric(10, 2), nullable=True)
    status = db.Column('Status', db.Enum('hiring', 'close', 'ongoing', 'finished', 'completed'), default='hiring')

    def __init__(self, employer_id, freelancer_id, title, description, category, skills, price, status):
            self.employer_id = employer_id
            self.freelancer_id = freelancer_id
            self.title = title
            self.description = description
            self.category = category
            self.skills = skills
            self.price = price if price else None
            self.status = status
        

    def json(self):
        return {
        "id": self.id,
        "employer_id": self.employer_id,
        "freelancer_id": self.freelancer_id,
        "title": self.title,
        "description": self.description,
        "category": self.category,
        "skills": self.skills.split(", ") if self.skills else [],
        "price": float(self.price) if self.price else None,
        "status": self.status
    }

@app.errorhandler(500)
def internal_server_error(error):
    return jsonify({"error": "Internal server error"}), 500

# create new job listing (scenario 1: publish job list)
@app.route('/job', methods=['POST'])
def create_job():
    try:
        data = request.json
        if not data or 'employer_id' not in data or 'title' not in data:
            return jsonify({"error": "Invalid job data"}), 400

        skills_str = ", ".join(data.get('skills', [])) if isinstance(data.get('skills'), list) else None

        new_job = Job(
            employer_id=data['employer_id'],
            freelancer_id=data.get('freelancer_id'),
            title=data['title'],
            description=data.get('description'),
            category=data.get('category'),
            skills=skills_str,
            price=data.get('price'),
            status=data.get('status', 'hiring')
        )

        db.session.add(new_job)
        db.session.commit()

        return jsonify({"message": "Job recorded successfully", "job": new_job.json()}), 201

    except Exception as e:
        return jsonify({"error": "Error while creating job", "details": str(e)}), 500

# view matching job listings according to skills (scenario2: match job)
@app.route('/jobs/skills', methods=['GET'])
def get_jobs_by_skills():
    data = request.json

    if not data or 'skills' not in data or not isinstance(data['skills'], list):
        return jsonify({"error": "A list of skills is required"}), 400

    skills = data['skills']

    jobs = Job.query.filter(
        or_(*[Job.skills.ilike(f"%{skill}%") for skill in skills])
    ).all()

    if not jobs:
        return jsonify({"message": "No matching jobs found"}), 200

    return jsonify({"jobs": [job.json() for job in jobs]}), 200

# update job details (scenario 3: update job status to finished/completed and compliance!)
@app.route('/job/<int:job_id>', methods=['PUT'])
def update_job_details(job_id):
    data = request.json

    if not data:
        return jsonify({"error": "Request body is empty"}), 400

    job = Job.query.get(job_id)

    if not job:
        return jsonify({"error": "Job not found"}), 404

    if 'status' in data:
        valid_statuses = {"hiring", "close", "ongoing", "finished", "completed"}
        new_status = data['status']
        if new_status not in valid_statuses:
            return jsonify({"error": f"Invalid status. Must be one of {valid_statuses}"}), 400
        job.status = new_status

    db.session.commit()

    return jsonify({
        "message": "Job status updated successfully",
        "job": job.json(),
    }), 200

# browse available job listings
@app.route('/job', methods=['GET'])
def get_jobs():
    jobs = Job.query.all()
    return jsonify({"jobs": [job.json() for job in jobs]}), 200

# view details of one specific job
@app.route('/job/<int:job_id>', methods=['GET'])
def get_job(job_id):
    job = Job.query.get(job_id)

    if not job:
        return jsonify({"error": "Job not found"}), 404

    return jsonify({"job": job.json()}), 200

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print("Tables have been created!") 
    app.run(host="0.0.0.0", port=5000, debug=True)



    
    
