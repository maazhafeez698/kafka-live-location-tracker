import initializeLocationSocket from "./sockets/location.socket.js";
import startHistoryConsumer from "./kafka/consumers/history.consumer.js";

const initializeLocationModule = async (httpServer) => {
  const io = initializeLocationSocket(httpServer);

  startHistoryConsumer().catch((error) => {
    console.error("History Kafka consumer failed:", error);
  });

  return io;
};

export default initializeLocationModule;
