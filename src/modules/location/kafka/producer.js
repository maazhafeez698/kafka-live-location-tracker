import { producer } from "./kafka.client.js";
import LOCATION_TOPIC from "./topic.js";

let isConnected = false;

const connectProducer = async () => {
  if (isConnected) return;

  await producer.connect();

  isConnected = true;

  console.log("Kafka producer connected");
};

const publishLocationUpdate = async (event) => {
  await connectProducer();

  await producer.send({
    topic: LOCATION_TOPIC,
    messages: [
      {
        key: event.userId,
        value: JSON.stringify(event),
      },
    ],
  });
};

export { connectProducer, publishLocationUpdate };
