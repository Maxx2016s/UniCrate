const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");
const firstAdminButton = document.querySelector("#first-admin-button");
const setupDialog = document.querySelector("#setup-dialog");
const setupForm = document.querySelector("#setup-form");
const setupMessage = document.querySelector("#setup-message");

if (localStorage.getItem("unicrateToken")) {
  window.location.replace("/dashboard.html");
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "";
  loginMessage.classList.remove("form-message-success");

  const formData = new FormData(loginForm);
  const submitButton = loginForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "Signing in…";

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email").trim(),
        password: formData.get("password"),
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Could not sign in. Please try again.");
    }

    localStorage.setItem("unicrateToken", result.token);
    localStorage.setItem("unicrateUser", JSON.stringify(result.user));
    window.location.assign("/dashboard.html");
  } catch (error) {
    loginMessage.textContent = error.message || "Unable to reach UniCrate. Check that the server is running.";
    submitButton.disabled = false;
    submitButton.textContent = "Sign in";
  }
});

const checkSetupStatus = async () => {
  try {
    const response = await fetch("/api/auth/setup-status");
    const result = await response.json();
    firstAdminButton.hidden = !response.ok || !result.setupRequired;
  } catch {
    firstAdminButton.hidden = true;
  }
};

firstAdminButton.addEventListener("click", () => {
  setupMessage.textContent = "";
  setupDialog.showModal();
  document.querySelector("#setup-name").focus();
});

document.querySelector("#close-setup-dialog").addEventListener("click", () => setupDialog.close());
document.querySelector("#cancel-setup-dialog").addEventListener("click", () => setupDialog.close());

setupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = document.querySelector("#save-setup");
  const account = Object.fromEntries(new FormData(setupForm).entries());
  submitButton.disabled = true;
  setupMessage.textContent = "";

  try {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(account),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Could not create the admin account.");
    }

    setupDialog.close();
    setupForm.reset();
    firstAdminButton.hidden = true;
    loginMessage.textContent = "Admin account created. Sign in with the email and password you just set.";
    loginMessage.classList.add("form-message-success");
  } catch (error) {
    setupMessage.textContent = error.message || "Unable to create the admin account.";
  } finally {
    submitButton.disabled = false;
  }
});

checkSetupStatus();
