/opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --topic publish-job-errors --from-beginning

/opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --topic match-job-errors --from-beginning

/opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --topic accept-job-errors --from-beginning

/opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --topic complete-job-errors --from-beginning

/opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --topic approve-job-errors --from-beginning

/opt/kafka/bin/kafka-console-consumer.sh --bootstrap-server localhost:9092 \
  --topic error-logs --from-beginning

