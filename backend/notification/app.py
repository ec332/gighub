import threading
import pika
import sys
from flask import Flask, jsonify

app = Flask(__name__)

RABBITMQ_HOST = "rabbitmq"  # Update this if needed
consumed_messages = []  # A list to store the consumed messages

def consume_notifications(user_id):
    """
    Start consuming notifications for a specific user.
    If a queue does not exist, it is skipped.
    """
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
    channel = connection.channel()

    queue_names = [
        f"{user_id}-payment-notification",
        f"{user_id}-job-accept-notification",
        f"{user_id}-job-completion-notification"
    ]

    valid_queues = []  # Stores only queues that exist

    # Check for queue existence before consuming
    for queue_name in queue_names:
        try:
            channel.queue_declare(queue=queue_name, passive=True)  # Only check existence
            valid_queues.append(queue_name)  # Add only existing queues
        except pika.exceptions.ChannelClosedByBroker as e:
            if e.reply_code == 404:  # Queue does not exist
                print(f"Skipping non-existent queue: {queue_name}")
                channel = connection.channel()  # Reopen channel after exception
            else:
                raise  # Raise other unexpected errors

    # Callback function to handle messages
    def callback(ch, method, properties, body):
        message = body.decode()
        print(f"User {user_id} received message: {message}")
        consumed_messages.append(message)
        sys.stdout.flush()

    # Start consuming only from valid queues
    for queue_name in valid_queues:
        consumer_tag = f"user_{user_id}_{queue_name}_consumer"
        channel.basic_consume(queue=queue_name, on_message_callback=callback, auto_ack=True, consumer_tag=consumer_tag)

    if valid_queues:
        print(f"User {user_id} is now consuming messages from: {valid_queues}")
        try:
            channel.start_consuming()
        except KeyboardInterrupt:
            print("Consumer stopped.")
    else:
        print(f"No valid queues found for user {user_id}. Closing connection.")
        connection.close()

# Endpoint to start consuming messages
@app.route('/consume_notifications/<int:user_id>', methods=['GET'])
def start_user_consumer(user_id):
    threading.Thread(target=consume_notifications, args=(user_id,), daemon=True).start()
    return jsonify({"status": f"Started consuming notifications for user {user_id}", "received_messages": f"{consumed_messages}"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
