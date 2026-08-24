import initializeLocationSocket from "./sockets/location.socket.js";
import startHistoryConsumer from "./kafka/consumers/history.consumer.js";

const initializeLocationModule = async (httpServer) => {
  const io = await initializeLocationSocket(httpServer);

  await startHistoryConsumer();

  return io;
};

export default initializeLocationModule;
