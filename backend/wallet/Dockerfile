FROM python:3.9-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set environment variables
ENV FLASK_APP=wallet.py
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1

# Expose the port the app will run on
EXPOSE 5300

# Run the application
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "wallet:app"]