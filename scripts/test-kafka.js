import "dotenv/config";

import { producer } from "../src/modules/location/kafka/kafka.client.js";
import LOCATION_TOPIC from "../src/modules/location/kafka/topic.js";

const run = async () => {
  await producer.connect();

  await producer.send({
    topic: LOCATION_TOPIC,
    messages: [
      {
        key: "test-user",
        value: JSON.stringify({
          eventType: "location.updated",
          userId: "test-user",
          latitude: 30.1575,
          longitude: 71.5249,
          timestamp: new Date().toISOString(),
        }),
      },
    ],
  });

  console.log("Test location event published");

  await producer.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
    