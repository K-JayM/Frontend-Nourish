import {
  apiRequest,
  getAdminSession,
  setStatus,
  signInAdmin
} from "./api.js";

const form = document.getElementById("login_section");
const message = document.getElementById("login-message");
const submitButton = document.getElementById("login-submit");

async function existingSessionIsValid() {
  if (!getAdminSession()) return false;
  try {
    // Verify the stored token and admin role before skipping the login form.
    await apiRequest("/admin/inventory", { auth: "admin" });
    return true;
  } catch {
    return false;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  submitButton.disabled = true;
  setStatus(message, "Signing in...");

  try {
    await signInAdmin(
      formData.get("email").trim(),
      formData.get("password")
    );
    window.location.replace("./foodbank_admin.html");
  } catch (error) {
    setStatus(message, error.message, "error");
    submitButton.disabled = false;
  }
});

if (await existingSessionIsValid()) {
  window.location.replace("./foodbank_admin.html");
}
