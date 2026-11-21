const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");

if (localStorage.getItem("unicrateToken")) {
  window.location.replace("/dashboard.html");
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "";

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
