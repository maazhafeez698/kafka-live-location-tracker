import { historyConsumer } from "../kafka.client.js";
import LOCATION_TOPIC from "../topic.js";

import LocationHistory from "../../models/location-history.model.js";

const startHistoryConsumer = async () => {
  await historyConsumer.connect();

  await historyConsumer.subscribe({
    topic: LOCATION_TOPIC,
    fromBeginning: true,
  });

  await historyConsumer.run({
    eachMessage: async ({ message }) => {
      try {
        const event = JSON.parse(message.value.toString());

        if (event.eventType !== "location.updated") {
          return;
        }

        await LocationHistory.create({
          userId: event.userId,
          latitude: event.latitude,
          longitude: event.longitude,
          timestamp: event.timestamp,
        });

      } catch {}
    },
  });
};

export default startHistoryConsumer;
