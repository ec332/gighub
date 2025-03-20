import os
import openai
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from openai import OpenAIError

load_dotenv()

app = Flask(__name__)

# Retrieve OpenAI API Key
api_key = os.getenv("OPENAI_API_KEY")
client = openai.OpenAI(api_key=api_key)  

@app.route('/generate-job-description', methods=['POST'])
def generate_job_description():
    data = request.json

    if not data or "title" not in data or "category" not in data or "skills" not in data:
        return jsonify({"error": "Missing job information"}), 400

    job_title = data["title"]
    category = data["category"]
    skills = ", ".join(data["skills"])

    prompt = f"""
    Generate a professional job listing description for a position titled "{job_title}" in the "{category}" industry.
    The job requires the following skills: {skills}.
    """

    try:
        response = client.chat.completions.create(  # ✅ Updated method
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}]
        )

        job_description = response.choices[0].message.content  # ✅ Updated response parsing

        return jsonify({
            "title": job_title,
            "category": category,
            "skills": skills,
            "description": job_description
        })

    except OpenAIError as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5004, debug=True)
