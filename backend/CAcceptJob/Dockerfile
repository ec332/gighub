# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose the port the app runs on
EXPOSE 5000

# Set environment variables
ENV WALLET_SERVICE_URL=http://localhost:5004/wallet
ENV ESCROW_SERVICE_URL=http://localhost:5005/api/escrow
ENV JOB_SERVICE_URL=http://localhost:5002/job
ENV EMPLOYER_NOTIFICATION_URL=http://localhost:5007/notify
ENV AMQP_URL=amqp://guest:guest@localhost:5672/
ENV KAFKA_BROKER=kafka:9092

# Run the application
CMD ["python", "accept_job.py"]
