# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose the port the app runs on
EXPOSE 6000

# Set environment variables (default values from the current file)
ENV JOB_SERVICE_URL=http://localhost:5100/job
ENV ESCROW_SERVICE_URL=http://localhost:5200/api/escrow
ENV WALLET_SERVICE_URL=http://localhost:5300/wallet
ENV NOTIFICATION_SERVICE_URL=http://localhost:5000/consume_notifications
ENV KAFKA_BROKER=kafka:9092
ENV AMQP_URL=amqp://guest:guest@rabbitmq:5672/

# Run the application
CMD ["python", "accept_job.py"]