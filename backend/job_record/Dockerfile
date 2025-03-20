FROM python:3.9

ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt update && apt install -y default-mysql-client

COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5001

ENV FLASK_APP=job_record.py
ENV FLASK_RUN_HOST=0.0.0.0

CMD ["python", "job_record.py"]