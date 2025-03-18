# Use an official Python image as the base
FROM python:3.9

# Set environment variables to prevent Python output buffering
ENV PYTHONUNBUFFERED=1

# Set the working directory inside the container
WORKDIR /app

# Copy requirements.txt and install dependencies
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose port 5004 for Flask app
EXPOSE 5004

# Set environment variables for API key (ensure .env is used in production)
ENV FLASK_APP=chatgpt_wrapper.py
ENV FLASK_RUN_HOST=0.0.0.0

# Command to start the Flask application
CMD ["python", "chatgpt_wrapper.py"]
