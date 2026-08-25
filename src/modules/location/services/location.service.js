import ApiError from "../../../common/utils/api-error.js";
import createLocationUpdateEvent from "../dto/location-update.dto.js";
import { publishLocationUpdate } from "../kafka/producer.js";

const validateCoordinates = (latitude, longitude) => {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    throw ApiError.badRequest("Latitude and longitude must be numbers");
  }

  if (latitude < -90 || latitude > 90) {
    throw ApiError.badRequest("Invalid latitude");
  }

  if (longitude < -180 || longitude > 180) {
    throw ApiError.badRequest("Invalid longitude");
  }
};

const publishUserLocation = async ({
  userId,
  username,
  latitude,
  longitude,
}) => {
  validateCoordinates(
    latitude,
    longitude,
  );

  const event = createLocationUpdateEvent({
    userId,
    username,
    latitude,
    longitude,
    timestamp: new Date().toISOString(),
  });

  await publishLocationUpdate(event);

  return event;
};

export { validateCoordinates, publishUserLocation };
