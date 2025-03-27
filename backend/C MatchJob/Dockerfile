# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose the correct port
EXPOSE 6100

# Set environment variables
ENV FREELANCER_SERVICE_URL=https://personal-byixijno.outsystemscloud.com/Freelancer/rest/v1/freelancer
ENV JOB_SERVICE_URL=http://localhost:5100/job
ENV KAFKA_BROKER=localhost:29092
ENV PORT=6100

# Run the application on port 6100
CMD ["python", "match_job.py"]
