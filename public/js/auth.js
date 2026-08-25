const authScreen = document.getElementById("auth-screen");
const authForm = document.getElementById("auth-form");
const authName = document.getElementById("auth-name");
const authEmail = document.getElementById("auth-email");
const authPassword = document.getElementById("auth-password");
const nameField = document.getElementById("name-field");
const authSubmit = document.getElementById("auth-submit");
const authMessage = document.getElementById("auth-message");
const authSwitch = document.getElementById("auth-switch");
const authSwitchLabel = document.getElementById("auth-switch-label");
const authTitle = document.getElementById("auth-title");
const authSubtitle = document.getElementById("auth-subtitle");
const authEyebrow = document.getElementById("auth-eyebrow");
const authStep = document.getElementById("auth-step");
const logoutButton = document.getElementById("logout-button");

let isSignUp = false;

function setAuthMode(signUp) {
  isSignUp = signUp;
  nameField.classList.toggle("is-hidden", !signUp);
  authName.required = signUp;
  authPassword.autocomplete = signUp ? "new-password" : "current-password";
  authEyebrow.textContent = signUp ? "START HERE" : "WELCOME BACK";
  authTitle.textContent = signUp
    ? "Create your workspace account"
    : "Sign in to your workspace";
  authSubtitle.textContent = signUp
    ? "Bring your team into the live map."
    : "Your live map is waiting for you.";
  authSubmit.innerHTML = signUp
    ? "Create account <span>↗</span>"
    : "Sign in <span>↗</span>";
  authSwitchLabel.textContent = signUp ? "Already have an account?" : "New to LiveTrack?";
  authSwitch.textContent = signUp ? "Sign in" : "Create an account";
  authStep.textContent = signUp ? "02 / 02" : "01 / 02";
  clearAuthMessage();
}

function clearAuthMessage() {
  authMessage.textContent = "";
  authMessage.className = "auth-message";
}

function showAuthMessage(message, type = "error") {
  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`;
}

function handleVerificationResult() {
  const verification = new URLSearchParams(window.location.search).get("verification");

  if (!verification) return;

  sessionStorage.removeItem("liveTrackAccessToken");
  sessionStorage.removeItem("liveTrackUser");
  setAuthMode(false);
  showAuthMessage(
    verification === "success"
      ? "Email verified. You can now sign in."
      : "Email verification failed. Please request a new verification email.",
    verification === "success" ? "success" : "error",
  );
  window.history.replaceState({}, document.title, window.location.pathname);
}

async function requestAuth(path, body) {
  const response = await fetch(`/api/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || "Authentication failed. Please try again.");
  }

  return payload;
}

function enterTracker(user, accessToken) {
  sessionStorage.setItem("liveTrackAccessToken", accessToken);
  sessionStorage.setItem("liveTrackUser", JSON.stringify(user));
  authScreen.classList.add("is-hidden");
  document.body.classList.add("is-authenticated");
  window.dispatchEvent(new CustomEvent("livetrack:authenticated", { detail: user }));
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authSubmit.disabled = true;
  showAuthMessage(isSignUp ? "Creating your account..." : "Signing you in...", "loading");

  try {
    if (isSignUp) {
      await requestAuth("signup", {
        name: authName.value.trim(),
        email: authEmail.value.trim(),
        password: authPassword.value,
      });
      setAuthMode(false);
      authEmail.value = authEmail.value.trim();
      showAuthMessage("Account created. Verify your email before signing in.", "success");
      return;
    }

    const { data } = await requestAuth("signin", {
      email: authEmail.value.trim(),
      password: authPassword.value,
    });
    enterTracker(data.user, data.accessToken);
  } catch (error) {
    showAuthMessage(error.message);
  } finally {
    authSubmit.disabled = false;
  }
});

authSwitch.addEventListener("click", () => setAuthMode(!isSignUp));

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;

  try {
    const accessToken = sessionStorage.getItem("liveTrackAccessToken");

    if (accessToken) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: "include",
      });
    }
  } finally {
    sessionStorage.removeItem("liveTrackAccessToken");
    sessionStorage.removeItem("liveTrackUser");
    window.dispatchEvent(new Event("livetrack:logout"));
    authScreen.classList.remove("is-hidden");
    document.body.classList.remove("is-authenticated");
    setAuthMode(false);
    authEmail.value = "";
    authPassword.value = "";
    logoutButton.disabled = false;
  }
});

async function restoreSession() {
  const accessToken = sessionStorage.getItem("liveTrackAccessToken");

  if (!accessToken) return;

  try {
    const response = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: "include",
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error("Session expired");
    enterTracker(payload.data, accessToken);
  } catch {
    sessionStorage.removeItem("liveTrackAccessToken");
    sessionStorage.removeItem("liveTrackUser");
  }
}

handleVerificationResult();
restoreSession();
