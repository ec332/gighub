FROM python:3.9

ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

COPY .env .env

EXPOSE 5001

CMD ["python", "job_record.py"]
