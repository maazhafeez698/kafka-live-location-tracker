import { realtimeConsumer } from "../kafka.client.js";
import LOCATION_TOPIC from "../topic.js";

const startRealtimeConsumer = async (io) => {
  await realtimeConsumer.connect();

  await realtimeConsumer.subscribe({
    topic: LOCATION_TOPIC,
    fromBeginning: false,
  });

  await realtimeConsumer.run({
    eachMessage: async ({ message }) => {
      try {
        const event = JSON.parse(message.value.toString());

        io.emit("server:location:update", event);

      } catch {}
    },
  });
};

export default startRealtimeConsumer;
