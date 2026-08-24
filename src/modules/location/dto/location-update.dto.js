const createLocationUpdateEvent = ({
  userId,
  latitude,
  longitude,
  timestamp,
}) => {
  return {
    eventType: "location.updated",
    userId,
    latitude,
    longitude,
    timestamp,
  };
};

export default createLocationUpdateEvent;
