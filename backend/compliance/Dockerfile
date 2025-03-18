# Use an official Python runtime as the base image
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

# Expose port 5002 for Flask app
EXPOSE 5002

# Set environment variables for database connection (update credentials accordingly)
ENV SQLALCHEMY_DATABASE_URI="mysql+mysqlconnector://root:rootpassword@db:3306/gighub"
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0

# Command to run the application
CMD ["python", "app.py"]
