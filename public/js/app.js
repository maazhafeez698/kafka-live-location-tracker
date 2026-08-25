const connectButton = document.getElementById("connect-button");

const shareButton = document.getElementById("share-button");

const stopButton = document.getElementById("stop-button");

const centerButton = document.getElementById("center-button");

const currentUserName = document.getElementById("current-user-name");

const connectionStatus = document.getElementById("connection-status");

const connectionText = document.getElementById("status-text");

const statusDot = document.getElementById("status-dot");

const peopleCount = document.getElementById("people-count");

const lastUpdate = document.getElementById("last-update");

let socket = null;

let currentUserId = null;

let currentUserDisplayName = null;

let locationTimer = null;

let isSharingLocation = false;

let locationRequestInProgress = false;

let ownLocation = null;

let hasCenteredOnOwnLocation = false;

const LOCATION_INTERVAL_MS = 10000;

const markers = new Map();

const PAKISTAN_CENTER = [30.3753, 69.3451];

const DEFAULT_ZOOM = 5;

const map = L.map("map", {
  zoomControl: false,
}).setView(PAKISTAN_CENTER, DEFAULT_ZOOM);

L.control
  .zoom({
    position: "bottomright",
  })
  .addTo(map);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

/* =========================
   HELPERS
   ========================= */

function formatUserName(name) {
  if (!name) {
    return "User";
  }

  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getInitial(name) {
  return formatUserName(name).charAt(0).toUpperCase();
}

function createUserIcon(name, isSelf = false) {
  return L.divIcon({
    className: "user-marker-wrapper",

    html: `
      <div class="user-marker ${isSelf ? "self" : ""}">
        ${getInitial(name)}
      </div>
    `,

    iconSize: isSelf ? [34, 34] : [30, 30],

    iconAnchor: isSelf ? [17, 17] : [15, 15],
  });
}

function updatePeopleCount() {
  const count = markers.size;

  peopleCount.textContent = count === 1 ? "1 person" : `${count} people`;

  lastUpdate.textContent = "Live";
}

function updateConnection(connected) {
  if (connected) {
    connectionStatus.style.color = "#2e9d62";

    statusDot.style.background = "#2e9d62";

    connectionText.textContent = "Live";
  } else {
    connectionStatus.style.color = "#73767f";

    statusDot.style.background = "#a7aab1";

    connectionText.textContent = "Offline";
  }
}

function updateMarkerLabel(marker, name, isSelf) {
  marker.setTooltipContent(isSelf ? `${name} · You` : name);
}

function centerOnOwnLocation() {
  if (!ownLocation) {
    return;
  }

  map.flyTo([ownLocation.latitude, ownLocation.longitude], 15, {
    duration: 0.8,
  });
}

function resetLocationState() {
  ownLocation = null;
  hasCenteredOnOwnLocation = false;
}

function clearMarkers() {
  for (const marker of markers.values()) {
    map.removeLayer(marker);
  }

  markers.clear();

  updatePeopleCount();
}

/* =========================
   SOCKET
   ========================= */

function connectToTracker(token) {
  socket = io({
    auth: {
      token,
    },
  });

  socket.on("connect", () => {
    updateConnection(true);

    connectButton.disabled = true;
    connectButton.textContent = "Connected";

    shareButton.disabled = false;
    centerButton.disabled = false;

    connectionText.textContent = "Live";

    updatePeopleCount();
  });

  socket.on("connect_error", () => {
    updateConnection(false);

    connectionText.textContent = "Connection failed";

    connectButton.disabled = false;
    connectButton.textContent = "Connect";

    shareButton.disabled = true;
    stopButton.disabled = true;
    centerButton.disabled = true;
  });

  socket.on("disconnect", () => {
    updateConnection(false);

    connectButton.disabled = false;
    connectButton.textContent = "Connect";

    shareButton.disabled = true;
    stopButton.disabled = true;
    centerButton.disabled = true;

    stopLocationSharing();

    lastUpdate.textContent = "Offline";
  });

  socket.on("server:session", (data) => {
    currentUserId = data.user.id;

    currentUserDisplayName = formatUserName(data.user.name);

    currentUserName.textContent = currentUserDisplayName;
  });

  socket.on("server:location:update", (event) => {
    handleLocationUpdate(event);
  });
}

window.addEventListener("livetrack:authenticated", (event) => {
  const token = sessionStorage.getItem("liveTrackAccessToken");

  if (!token) {
    return;
  }

  currentUserName.textContent = formatUserName(event.detail?.name);

  connectToTracker(token);
});

window.addEventListener("livetrack:logout", () => {
  stopLocationSharing();

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  clearMarkers();
  resetLocationState();

  currentUserId = null;
  currentUserDisplayName = null;

  currentUserName.textContent = "Not connected";

  connectButton.disabled = false;
  connectButton.textContent = "Connect";

  shareButton.disabled = true;
  stopButton.disabled = true;
  centerButton.disabled = true;

  updateConnection(false);

  lastUpdate.textContent = "Offline";
});

/* =========================
   LOCATION
   ========================= */

shareButton.addEventListener("click", () => {
  if (!socket || !socket.connected) {
    return;
  }

  if (!navigator.geolocation) {
    alert("Geolocation is not supported by this browser.");

    return;
  }

  if (isSharingLocation) {
    return;
  }

  isSharingLocation = true;

  shareButton.disabled = true;
  stopButton.disabled = false;

  lastUpdate.textContent = "Live";

  requestLocation();
});

stopButton.addEventListener("click", () => {
  stopLocationSharing();
});

function requestLocation() {
  if (!isSharingLocation) {
    return;
  }

  if (locationRequestInProgress) {
    return;
  }

  locationRequestInProgress = true;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      locationRequestInProgress = false;

      const { latitude, longitude } = position.coords;

      socket.emit(
        "location:update",
        {
          latitude,
          longitude,
        },
        (response) => {
          if (!response?.success) {
            return;
          }

          lastUpdate.textContent = "Live";
        },
      );

      scheduleNextLocation();
    },

    () => {
      locationRequestInProgress = false;

      // Keep the footer stable.
      lastUpdate.textContent = "Live";

      scheduleNextLocation();
    },

    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000,
    },
  );
}

function scheduleNextLocation() {
  if (!isSharingLocation) {
    return;
  }

  if (locationTimer !== null) {
    clearTimeout(locationTimer);
  }

  locationTimer = setTimeout(() => {
    locationTimer = null;

    requestLocation();
  }, LOCATION_INTERVAL_MS);
}

function stopLocationSharing() {
  isSharingLocation = false;

  locationRequestInProgress = false;

  if (locationTimer !== null) {
    clearTimeout(locationTimer);
    locationTimer = null;
  }

  if (socket?.connected) {
    shareButton.disabled = false;
    stopButton.disabled = true;

    lastUpdate.textContent = "Live";
  }
}

/* =========================
   LOCATION EVENTS
   ========================= */

function handleLocationUpdate(event) {
  const { userId, username, latitude, longitude, timestamp } = event;

  if (
    !userId ||
    typeof latitude !== "number" ||
    typeof longitude !== "number"
  ) {
    return;
  }

  const displayName = formatUserName(username);

  const isSelf = userId === currentUserId;

  let marker = markers.get(userId);

  if (!marker) {
    marker = L.marker([latitude, longitude], {
      icon: createUserIcon(displayName, isSelf),
    })
      .addTo(map)
      .bindTooltip(isSelf ? `${displayName} · You` : displayName, {
        permanent: true,
        direction: "top",
        offset: [0, -13],
        className: "user-label",
      })
      .bindPopup(`<strong>${displayName}</strong>`);

    markers.set(userId, marker);
  } else {
    marker.setLatLng([latitude, longitude]);

    marker.setIcon(createUserIcon(displayName, isSelf));

    updateMarkerLabel(marker, displayName, isSelf);
  }

  updatePeopleCount();

  if (isSelf) {
    ownLocation = {
      latitude,
      longitude,
    };

    if (!hasCenteredOnOwnLocation) {
      hasCenteredOnOwnLocation = true;

      map.setView([latitude, longitude], 15);
    }
  }

  // Keep the footer as:
  // "1 person · Live"
  // rather than exposing per-event details.
  if (timestamp && !isSelf) {
    lastUpdate.textContent = "Live";
  }
}

/* =========================
   CENTER
   ========================= */

centerButton.addEventListener("click", () => {
  centerOnOwnLocation();
});
