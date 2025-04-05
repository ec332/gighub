import pika
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

RABBITMQ_HOST = "rabbitmq"

@app.route('/consume_notifications/<string:usertype>/<int:user_id>', methods=['GET'])
def consume_and_get_notifications(usertype, user_id):
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
    channel = connection.channel()

    # Select queue names based on user type
    if usertype.lower() == "employer":
        queue_names = [
            f"{user_id}-job-accept-notification",
            f"{user_id}-job-completion-notification"
        ]
    elif usertype.lower() == "freelancer":
        queue_names = [
            f"{user_id}-payment-notification"
        ]
    else:
        return jsonify({"error": "Invalid user type"}), 400

    notifications = []

    for queue_name in queue_names:
        try:
            # Only try to consume if the queue exists
            channel.queue_declare(queue=queue_name, passive=True)

            while True:
                method_frame, header_frame, body = channel.basic_get(queue=queue_name, auto_ack=True)
                if method_frame:
                    notifications.append(body.decode())
                else:
                    break  # No more messages in this queue

        except pika.exceptions.ChannelClosedByBroker as e:
            if e.reply_code == 404:
                # Queue does not exist
                channel = connection.channel()  # Reopen after passive failure
                continue
            else:
                raise

    connection.close()
    return jsonify({
        "status": f"Fetched {len(notifications)} notifications for {usertype} {user_id}",
        "notifications": notifications
    }), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
