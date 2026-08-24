import kafka from "../../../common/config/kafka.js";

const producer = kafka.producer();

const realtimeConsumer = kafka.consumer({
  groupId: "location-realtime",
});

const historyConsumer = kafka.consumer({
  groupId: "location-history",
});

export { producer, realtimeConsumer, historyConsumer };
