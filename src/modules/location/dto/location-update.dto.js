const createLocationUpdateEvent = ({
  userId,
  username,
  latitude,
  longitude,
  timestamp,
}) => {
  return {
    eventType: "location.updated",
    userId,
    username,
    latitude,
    longitude,
    timestamp,
  };
};

export default createLocationUpdateEvent;
