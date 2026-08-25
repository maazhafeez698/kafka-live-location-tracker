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

const LOCATION_INTERVAL_MS = 5000;

const markers = new Map();

const map = L.map("map", {
  zoomControl: false,
}).setView([30.2, 71.5], 13);

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
  peopleCount.textContent =
    markers.size === 1 ? "1 person" : `${markers.size} people`;
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

    console.log("Connected:", socket.id);
  });

  socket.on("connect_error", (error) => {
    updateConnection(false);

    connectionStatus.textContent = error.message;

    connectButton.disabled = false;
    connectButton.textContent = "Connect";
    shareButton.disabled = true;
    centerButton.disabled = true;

    console.error("Socket connection failed:", error);
  });

  socket.on("disconnect", (reason) => {
    updateConnection(false);

    connectButton.disabled = false;
    connectButton.textContent = "Connect";
    shareButton.disabled = true;
    stopButton.disabled = true;
    centerButton.disabled = true;

    stopLocationSharing();

    lastUpdate.textContent = "Connection lost";

    console.log("Disconnected:", reason);
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

  if (token) {
    currentUserName.textContent = formatUserName(event.detail?.name);
    connectToTracker(token);
  }
});

window.addEventListener("livetrack:logout", () => {
  stopLocationSharing();

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  currentUserId = null;
  currentUserDisplayName = null;
  currentUserName.textContent = "Not connected";
  connectButton.disabled = false;
  connectButton.textContent = "Connect";
  shareButton.disabled = true;
  centerButton.disabled = true;
  updateConnection(false);
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

  lastUpdate.textContent = "Sharing location";

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
            console.warn("Location update rejected:", response.message);
          } else {
            lastUpdate.textContent = `Updated ${new Date().toLocaleTimeString()}`;
          }
        },
      );

      scheduleNextLocation();
    },

    (error) => {
      locationRequestInProgress = false;

      console.log("Location unavailable, retrying:", error.message);

      lastUpdate.textContent = "Location unavailable";

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

    lastUpdate.textContent = "Location sharing stopped";
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

  if (timestamp && !isSelf) {
    lastUpdate.textContent = `${displayName} moved · ${new Date(
      timestamp,
    ).toLocaleTimeString()}`;
  }
}

/* =========================
   CENTER
   ========================= */

centerButton.addEventListener("click", () => {
  centerOnOwnLocation();
});
