FROM python:3.9

ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

COPY .env .env

EXPOSE 5004

CMD ["python", "chatgpt_wrapper.py"]
