import threading
import pika
import sys
from flask import Flask, jsonify

app = Flask(__name__)

RABBITMQ_HOST = "rabbitmq"  # Update this if needed
consumed_messages = []  # A list to store the consumed messages

def consume(channel, callback, queue, consumer_tag):
    """Runs RabbitMQ consumer in a separate thread."""
    if not channel or not callback or not queue:
        return None
    try:
        # Start consuming with a unique consumer tag
        channel.basic_consume(queue=queue, on_message_callback=callback, auto_ack=True, consumer_tag=consumer_tag)
        
        # Start consuming in a separate thread
        t1 = threading.Thread(target=channel.start_consuming)
        t1.start()
        t1.join(0)  # Non-blocking join to allow other threads to run
    except pika.exceptions.AMQPChannelError as e:
        # If the queue does not exist, catch the exception and print a message
        print(f"Queue '{queue}' does not exist or is empty. No messages to consume.")
        return None

def consume_notifications(user_id):
    """
    Start consuming notifications for a specific user.
    We assume the queue already exists, so we don't declare it.
    """
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
    channel = connection.channel()

    # Dynamic queue names per user
    queue_names = [
        f"{user_id}-payment-notification",
        f"{user_id}-job-accept-notification",
        f"{user_id}-job-completion-notification"
    ]

    # Callback function to handle the message
    def callback(ch, method, properties, body):
        message = body.decode()
        print(f"User {user_id} received message: {message}")
        consumed_messages.append(message)  # Store the message
        sys.stdout.flush()  # Ensure that print statements are flushed

    # Start consuming from each queue with a unique consumer tag
    for queue_name in queue_names:
        consumer_tag = f"user_{user_id}_{queue_name}_consumer"  # Unique tag for each queue
        consume(channel=channel, callback=callback, queue=queue_name, consumer_tag=consumer_tag)

    # Close the connection when done consuming
    connection.close()

# Endpoint to start consuming messages when a user comes online
@app.route('/consume_notifications/<int:user_id>', methods=['GET'])
def start_user_consumer(user_id):
    threading.Thread(target=consume_notifications, args=(user_id,), daemon=True).start()
    return jsonify({"status": f"Started consuming notifications for user {user_id}"}), 200

# Endpoint to get the list of consumed messages
@app.route('/get_notifications/<int:user_id>', methods=['GET'])
def get_notifications(user_id):
    return jsonify({"user_id": user_id, "messages": consumed_messages}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
