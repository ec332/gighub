# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy the current directory contents into the container at /app
COPY . /app

# Set environment variable to tell Flask to run in development mode
ENV FLASK_ENV=development

# Make port 5100 available to the world outside this container
EXPOSE 5100

# Define the command to run your app using gunicorn
CMD ["flask", "run", "--host=0.0.0.0", "--port=5000"]
