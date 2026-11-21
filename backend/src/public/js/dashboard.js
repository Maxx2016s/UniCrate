const token = localStorage.getItem("unicrateToken");
const rows = document.querySelector("#parcel-rows");
const notice = document.querySelector("#dashboard-message");
const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector("#parcel-search");
const statusFilter = document.querySelector("#status-filter");
const registerDialog = document.querySelector("#register-dialog");
const registerForm = document.querySelector("#register-form");
const accountDialog = document.querySelector("#account-dialog");
const accountForm = document.querySelector("#account-form");
const accountRole = document.querySelector("#account-role");
const accountRegistrationLabel = document.querySelector("#account-registration-label");
const accountRegistrationNumber = document.querySelector("#account-registration-number");
let currentUser = null;
let searchTimer;

if (!token) {
  window.location.replace("/login.html");
}

const request = async (path, options = {}) => {
  const headers = { Authorization: `Bearer ${token}`, ...(options.headers || {}) };
  if (options.body) headers["Content-Type"] = "application/json";

  const response = await fetch(path, { ...options, headers });
  const result = await response.json().catch(() => ({}));

  if (response.status === 401) {
    localStorage.removeItem("unicrateToken");
    localStorage.removeItem("unicrateUser");
    window.location.replace("/login.html");
    throw new Error("Your session ended. Please sign in again.");
  }

  if (!response.ok) {
    throw new Error(result.message || "Something went wrong. Please try again.");
  }
  return result;
};

const showNotice = (message, isSuccess = false) => {
  notice.textContent = message;
  notice.classList.toggle("notice-success", isSuccess);
  notice.hidden = !message;
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(date);
};

const greetingFor = (name) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return `${greeting}, ${name.split(" ")[0]}`;
};

const setProfile = (user) => {
  currentUser = user;
  document.querySelector("#greeting").textContent = greetingFor(user.name || "there");
  document.querySelector("#user-name").textContent = user.name || "UniCrate user";
  document.querySelector("#user-role").textContent = user.role || "Account";
  document.querySelector("#user-initials").textContent = (user.name || "U")
    .split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
  document.querySelector("#today-label").textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date());

  const isStaff = user.role === "ADMIN" || user.role === "EDITOR";
  document.querySelector("#register-button").hidden = !isStaff;
  document.querySelector("#sidebar-register").hidden = !isStaff;
  document.querySelector("#sidebar-create-account").hidden = !isStaff;
  accountRole.disabled = user.role === "EDITOR";
  if (user.role === "EDITOR") accountRole.value = "VIEWER";
  syncAccountRegistrationField();
  document.querySelector("#parcel-caption").textContent = user.role === "VIEWER"
    ? "Parcels associated with your student account."
    : "The latest updates from the parcel desk.";
};

const setStats = (stats) => {
  document.querySelector("#stat-total").textContent = stats.total ?? 0;
  document.querySelector("#stat-pending").textContent = stats.pending ?? 0;
  document.querySelector("#stat-collected").textContent = stats.collected ?? 0;
};

const addCell = (row, text, className = "") => {
  const cell = document.createElement("td");
  if (className) cell.className = className;
  cell.textContent = text;
  row.append(cell);
  return cell;
};

const renderParcels = (parcels) => {
  rows.replaceChildren();

  if (parcels.length === 0) {
    const row = document.createElement("tr");
    const cell = addCell(row, "No parcels match this view yet.", "table-empty");
    cell.colSpan = 6;
    rows.append(row);
    return;
  }

  for (const parcel of parcels) {
    const row = document.createElement("tr");
    row.dataset.parcelId = parcel.id;
    addCell(row, parcel.trackingId || "—", "tracking-code");

    const studentCell = document.createElement("td");
    studentCell.className = "student-cell";
    const studentName = document.createElement("span");
    studentName.textContent = parcel.studentName || "—";
    studentCell.append(studentName);
    if (currentUser.role !== "VIEWER" && parcel.studentRegistrationNumber) {
      const registrationNumber = document.createElement("small");
      registrationNumber.textContent = parcel.studentRegistrationNumber;
      studentCell.append(registrationNumber);
    }
    row.append(studentCell);

    addCell(row, parcel.courierName || "—");
    addCell(row, formatDate(parcel.arrivalDate));

    const statusCell = document.createElement("td");
    const status = document.createElement("span");
    status.className = `status-pill ${parcel.status === "COLLECTED" ? "status-collected" : "status-pending"}`;
    status.textContent = parcel.status === "COLLECTED" ? "Collected" : "Awaiting pickup";
    statusCell.append(status);
    row.append(statusCell);

    const actionCell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "row-actions";
    if ((currentUser.role === "ADMIN" || currentUser.role === "EDITOR") && parcel.status === "PENDING") {
      const collectButton = document.createElement("button");
      collectButton.className = "small-button";
      collectButton.type = "button";
      collectButton.dataset.action = "collect";
      collectButton.textContent = "Mark collected";
      actions.append(collectButton);
    }
    if (currentUser.role === "ADMIN") {
      const deleteButton = document.createElement("button");
      deleteButton.className = "small-button small-button-danger";
      deleteButton.type = "button";
      deleteButton.dataset.action = "delete";
      deleteButton.textContent = "Delete";
      actions.append(deleteButton);
    }
    actionCell.append(actions);
    row.append(actionCell);
    rows.append(row);
  }
};

const loadStats = async () => {
  const result = await request("/api/parcels/stats");
  setStats(result.stats || {});
};

const loadParcels = async () => {
  const params = new URLSearchParams();
  if (searchInput.value.trim()) params.set("search", searchInput.value.trim());
  if (statusFilter.value) params.set("status", statusFilter.value);
  const query = params.toString();
  const result = await request(`/api/parcels${query ? `?${query}` : ""}`);
  renderParcels(result.parcels || []);
  document.querySelector("#result-count").textContent = `${result.count ?? 0} parcel${result.count === 1 ? "" : "s"}`;
};

const loadDashboard = async () => {
  showNotice("");
  try {
    await Promise.all([loadStats(), loadParcels()]);
  } catch (error) {
    showNotice(error.message);
  }
};

const openRegisterDialog = () => {
  document.querySelector("#register-message").textContent = "";
  registerDialog.showModal();
  document.querySelector("#student-name").focus();
};

const syncAccountRegistrationField = () => {
  const isStudent = accountRole.value === "VIEWER";
  accountRegistrationLabel.hidden = !isStudent;
  accountRegistrationNumber.hidden = !isStudent;
  accountRegistrationNumber.required = isStudent;
};

const openAccountDialog = () => {
  accountForm.reset();
  accountRole.disabled = currentUser.role === "EDITOR";
  if (currentUser.role === "EDITOR") accountRole.value = "VIEWER";
  document.querySelector("#account-message").textContent = "";
  syncAccountRegistrationField();
  accountDialog.showModal();
  document.querySelector("#account-name").focus();
};

document.querySelector("#register-button").addEventListener("click", openRegisterDialog);
document.querySelector("#sidebar-register").addEventListener("click", openRegisterDialog);
document.querySelector("#close-dialog").addEventListener("click", () => registerDialog.close());
document.querySelector("#cancel-dialog").addEventListener("click", () => registerDialog.close());
document.querySelector("#sidebar-create-account").addEventListener("click", openAccountDialog);
document.querySelector("#close-account-dialog").addEventListener("click", () => accountDialog.close());
document.querySelector("#cancel-account-dialog").addEventListener("click", () => accountDialog.close());
accountRole.addEventListener("change", syncAccountRegistrationField);

document.querySelector("#logout-button").addEventListener("click", () => {
  localStorage.removeItem("unicrateToken");
  localStorage.removeItem("unicrateUser");
  window.location.replace("/login.html");
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadDashboard();
});
searchInput.addEventListener("input", () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(loadDashboard, 300);
});
statusFilter.addEventListener("change", loadDashboard);

rows.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const row = button.closest("tr");
  const parcelId = row.dataset.parcelId;
  button.disabled = true;
  try {
    if (button.dataset.action === "collect") {
      await request(`/api/parcels/${parcelId}/collect`, { method: "PATCH" });
      showNotice("Parcel marked as collected.", true);
    } else if (button.dataset.action === "delete") {
      if (!window.confirm("Delete this parcel record? This cannot be undone.")) {
        button.disabled = false;
        return;
      }
      await request(`/api/parcels/${parcelId}`, { method: "DELETE" });
      showNotice("Parcel record deleted.", true);
    }
    await loadDashboard();
  } catch (error) {
    showNotice(error.message);
    button.disabled = false;
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = document.querySelector("#register-message");
  const submitButton = document.querySelector("#save-parcel");
  const formData = new FormData(registerForm);
  const parcel = Object.fromEntries(formData.entries());
  submitButton.disabled = true;
  message.textContent = "";

  try {
    await request("/api/parcels", { method: "POST", body: JSON.stringify(parcel) });
    registerDialog.close();
    registerForm.reset();
    showNotice("Parcel registered successfully.", true);
    await loadDashboard();
  } catch (error) {
    message.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

accountForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = document.querySelector("#account-message");
  const submitButton = document.querySelector("#save-account");
  const account = Object.fromEntries(new FormData(accountForm).entries());
  account.role = currentUser.role === "EDITOR" ? "VIEWER" : accountRole.value;
  submitButton.disabled = true;
  message.textContent = "";

  try {
    await request("/api/auth/register", { method: "POST", body: JSON.stringify(account) });
    accountDialog.close();
    accountForm.reset();
    showNotice("Created " + account.role.toLowerCase() + " account for " + account.email + ".", true);
  } catch (error) {
    message.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

const startDashboard = async () => {
  if (!token) return;
  try {
    const result = await request("/api/auth/me");
    setProfile(result.user);
    await loadDashboard();
  } catch (error) {
    showNotice(error.message);
  }
};

startDashboard();
