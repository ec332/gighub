FROM python:3.9

ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt update && apt install -y default-mysql-client
RUN apt update && apt install -y curl

COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5002

ENV FLASK_APP=compliance.py
ENV FLASK_RUN_HOST=0.0.0.0

CMD ["python", "compliance.py"]
