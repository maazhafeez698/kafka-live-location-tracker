import { Kafka, logLevel } from "kafkajs";

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID,
  brokers: [process.env.KAFKA_BROKER],
  logLevel: logLevel.ERROR,
});

export default kafka;
