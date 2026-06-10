import {
  apiRequest,
  clearAdminSession,
  formatDateTime,
  getAdminSession,
  setStatus
} from "./api.js";

const adminStatus = document.getElementById("admin-status");
const inventoryForm = document.getElementById("inventory-form");
const inventoryFormTitle = document.getElementById("inventory-form-title");
const inventorySubmit = document.getElementById("inventory-submit");
const cancelEditButton = document.getElementById("inventory-cancel-edit");
const locationSelect = document.getElementById("inventory-location");
const inventoryStatusField = document.getElementById("inventory-status-field");
const inventoryStatusSelect = document.getElementById("inventory-status");
const inventoryList = document.getElementById("inventory-list");
const inventoryFilters = document.getElementById("inventory-filters");
const adminSearch = document.getElementById("admin-search");
const adminStatusFilter = document.getElementById("admin-status-filter");
const reservationStatusFilter = document.getElementById("reservation-status-filter");
const reservationList = document.getElementById("reservation-list");
const logoutButton = document.getElementById("logout-button");

let locations = [];
let inventory = [];
let reservations = [];

function requireSession() {
  // This is a usability guard; every admin API route also enforces authorization.
  if (!getAdminSession()) {
    window.location.replace("./foodbank_login.html");
    return false;
  }
  return true;
}

function createCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}

function filteredInventory() {
  const query = adminSearch.value.trim().toLowerCase();
  return inventory.filter((item) => {
    const matchesStatus = !adminStatusFilter.value || item.status === adminStatusFilter.value;
    const matchesSearch =
      !query ||
      [item.name, item.category, item.description, item.location?.name]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });
}

function renderInventory() {
  inventoryList.replaceChildren();
  const items = filteredInventory();

  if (items.length === 0) {
    const row = document.createElement("tr");
    const cell = createCell("No inventory items match the filters.");
    cell.colSpan = 6;
    cell.className = "empty-state";
    row.append(cell);
    inventoryList.append(row);
    return;
  }

  for (const item of items) {
    const row = document.createElement("tr");
    row.append(
      createCell(item.name),
      createCell(item.location?.name ?? "Unknown"),
      createCell(String(item.quantity_available)),
      createCell(formatDateTime(item.collect_by)),
      createCell(item.status)
    );

    const actions = document.createElement("td");
    actions.className = "row-actions";
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => beginEdit(item));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "danger";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteInventory(item));

    actions.append(editButton, deleteButton);
    row.append(actions);
    inventoryList.append(row);
  }
}

function renderReservations() {
  reservationList.replaceChildren();
  const status = reservationStatusFilter.value;
  const items = reservations.filter((reservation) => !status || reservation.status === status);

  if (items.length === 0) {
    const message = document.createElement("p");
    message.className = "empty-state";
    message.textContent = "No reservations match this status.";
    reservationList.append(message);
    return;
  }

  for (const reservation of items) {
    const card = document.createElement("article");
    card.className = "reservation-card";
    const heading = document.createElement("h3");
    heading.textContent =
      reservation.inventory_item?.name ?? "Deleted inventory item";
    const code = document.createElement("strong");
    code.textContent = reservation.collection_code;
    const details = document.createElement("p");
    details.textContent =
      `Quantity: ${reservation.quantity} · Status: ${reservation.status} · ` +
      `Created: ${formatDateTime(reservation.created_at)}`;
    card.append(heading, code, details);

    if (reservation.status === "held") {
      const actions = document.createElement("div");
      actions.className = "row-actions";
      const collectButton = document.createElement("button");
      collectButton.type = "button";
      collectButton.textContent = "Mark collected";
      collectButton.addEventListener("click", () =>
        resolveReservation(reservation, "collect")
      );
      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "danger";
      cancelButton.textContent = "Cancel";
      cancelButton.addEventListener("click", () =>
        resolveReservation(reservation, "cancel")
      );
      actions.append(collectButton, cancelButton);
      card.append(actions);
    }

    reservationList.append(card);
  }
}

function populateLocations() {
  locationSelect.replaceChildren();
  for (const location of locations) {
    const option = document.createElement("option");
    option.value = location.id;
    option.textContent = location.active ? location.name : `${location.name} (inactive)`;
    locationSelect.append(option);
  }
}

function preserveSelectValue(select, value, label = value) {
  if (!value || [...select.options].some((option) => option.value === value)) return;
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  select.append(option);
}

function toDateTimeLocal(value) {
  // datetime-local expects local wall-clock time rather than a UTC ISO string.
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function beginEdit(item) {
  preserveSelectValue(locationSelect, item.location_id, item.location?.name);
  preserveSelectValue(inventoryForm.elements.category, item.category);
  inventoryForm.elements.id.value = item.id;
  inventoryForm.elements.locationId.value = item.location_id;
  inventoryForm.elements.name.value = item.name;
  inventoryForm.elements.category.value = item.category;
  inventoryForm.elements.description.value = item.description ?? "";
  inventoryForm.elements.quantityAvailable.value = item.quantity_available;
  inventoryForm.elements.collectBy.value = toDateTimeLocal(item.collect_by);
  // Status is editable only for existing records.
  inventoryStatusSelect.value = item.status;
  inventoryStatusSelect.disabled = false;
  inventoryStatusField.hidden = false;
  inventoryFormTitle.textContent = "Edit inventory";
  inventorySubmit.textContent = "Save changes";
  cancelEditButton.hidden = false;
  inventoryForm.elements.name.focus({ preventScroll: true });
}

function resetInventoryForm() {
  inventoryForm.reset();
  inventoryForm.elements.id.value = "";
  // Newly created stock always starts available.
  inventoryStatusSelect.value = "available";
  inventoryStatusSelect.disabled = true;
  inventoryStatusField.hidden = true;
  inventoryFormTitle.textContent = "Add inventory";
  inventorySubmit.textContent = "Add item";
  cancelEditButton.hidden = true;
}

function inventoryPayload(id) {
  const quantity = Number(inventoryForm.elements.quantityAvailable.value);
  const collectBy = new Date(inventoryForm.elements.collectBy.value);

  if (!Number.isInteger(quantity)) {
    throw new Error("Available quantity must be a whole number.");
  }
  if (Number.isNaN(collectBy.getTime())) {
    throw new Error("Collect by must be a valid date and time.");
  }

  return {
    locationId: locationSelect.value,
    name: inventoryForm.elements.name.value.trim(),
    category: inventoryForm.elements.category.value,
    description: inventoryForm.elements.description.value.trim() || null,
    quantityAvailable: quantity,
    collectBy: collectBy.toISOString(),
    status: id ? inventoryStatusSelect.value : "available"
  };
}

async function saveInventory(event) {
  event.preventDefault();
  if (!inventoryForm.reportValidity()) return;

  const id = inventoryForm.elements.id.value.trim();

  inventorySubmit.disabled = true;
  setStatus(adminStatus, id ? "Saving changes..." : "Adding item...");
  try {
    const payload = inventoryPayload(id);
    await apiRequest(id ? `/admin/inventory/${id}` : "/admin/inventory", {
      method: id ? "PATCH" : "POST",
      auth: "admin",
      body: payload
    });
    resetInventoryForm();
    await loadDashboard();
    setStatus(adminStatus, id ? "Inventory updated." : "Inventory added.", "success");
  } catch (error) {
    handleAdminError(error);
  } finally {
    inventorySubmit.disabled = false;
  }
}

async function deleteInventory(item) {
  if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
  setStatus(adminStatus, `Deleting ${item.name}...`);
  try {
    await apiRequest(`/admin/inventory/${item.id}`, {
      method: "DELETE",
      auth: "admin"
    });
    await loadDashboard();
    setStatus(adminStatus, "Inventory item deleted.", "success");
  } catch (error) {
    handleAdminError(error);
  }
}

async function resolveReservation(reservation, action) {
  const verb = action === "collect" ? "mark as collected" : "cancel";
  if (!window.confirm(`Are you sure you want to ${verb} ${reservation.collection_code}?`)) {
    return;
  }

  setStatus(adminStatus, "Updating reservation...");
  try {
    await apiRequest(`/admin/reservations/${reservation.id}/${action}`, {
      method: "POST",
      auth: "admin"
    });
    await loadDashboard();
    setStatus(adminStatus, "Reservation updated.", "success");
  } catch (error) {
    handleAdminError(error);
  }
}

function handleAdminError(error) {
  if (error.status === 401 || error.status === 403) {
    clearAdminSession();
    window.location.replace("./foodbank_login.html");
    return;
  }
  setStatus(adminStatus, error.message, "error");
}

async function loadDashboard() {
  try {
    // Load independent dashboard sections together to minimize startup time.
    [locations, inventory, reservations] = await Promise.all([
      apiRequest("/admin/locations", { auth: "admin" }),
      apiRequest("/admin/inventory", { auth: "admin" }),
      apiRequest("/admin/reservations", { auth: "admin" })
    ]);
    populateLocations();
    renderInventory();
    renderReservations();
  } catch (error) {
    handleAdminError(error);
  }
}

inventoryForm.addEventListener("submit", saveInventory);
cancelEditButton.addEventListener("click", resetInventoryForm);
inventoryFilters.addEventListener("input", renderInventory);
inventoryFilters.addEventListener("change", renderInventory);
reservationStatusFilter.addEventListener("change", renderReservations);
logoutButton.addEventListener("click", () => {
  clearAdminSession();
  window.location.replace("./foodbank_login.html");
});

if (requireSession()) {
  setStatus(adminStatus, "Loading dashboard...");
  await loadDashboard();
  if (getAdminSession()) setStatus(adminStatus, "");
}
