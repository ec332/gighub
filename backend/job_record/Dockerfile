# Use official Python image as base
FROM python:3.9

# Set environment variables to prevent Python from buffering output
ENV PYTHONUNBUFFERED=1

# Set the working directory inside the container
WORKDIR /app

# Copy requirements.txt and install dependencies
COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose port 5001 for Flask app
EXPOSE 5001

# Define environment variables for database connection
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0

# Start the application
CMD ["python", "app.py"]
