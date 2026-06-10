import {
  apiRequest,
  ensureAnonymousSession,
  formatDateTime,
  setStatus
} from "./api.js";

const tableBody = document.getElementById("inventory-table");
const statusElement = document.getElementById("inventory-status");
const searchInput = document.getElementById("search-items");
const sortSelect = document.getElementById("sortBy");
const categorySelect = document.getElementById("category-filter");
const locationSelect = document.getElementById("location-filter");
const reservationDialog = document.getElementById("reservation-dialog");
const reservationForm = document.getElementById("reservation-form");
const reservationItem = document.getElementById("reservation-item");
const reservationQuantity = document.getElementById("reservation-quantity");
const reservationError = document.getElementById("reservation-error");
const reservationSubmit = document.getElementById("reservation-submit");
const reservationCancel = document.getElementById("reservation-cancel");
const reservationResult = document.getElementById("latest-reservation");
const collectionCode = document.getElementById("collection-code");
const reservationSummary = document.getElementById("reservation-summary");
const latestReservationKey = "nourish.latestReservation";

let inventory = [];
let selectedItem = null;

function compareInventory(left, right) {
  if (sortSelect.value === "name") return left.name.localeCompare(right.name);
  if (sortSelect.value === "location") {
    return left.location.name.localeCompare(right.location.name);
  }
  return new Date(left.collect_by) - new Date(right.collect_by);
}

function filteredInventory() {
  // Filtering remains client-side so the count and table update on every keystroke.
  const query = searchInput.value.trim().toLowerCase();
  return inventory
    .filter((item) => !categorySelect.value || item.category === categorySelect.value)
    .filter((item) => !locationSelect.value || item.location_id === locationSelect.value)
    .filter((item) => {
      if (!query) return true;
      return [item.name, item.description, item.category, item.location?.name]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    })
    .sort(compareInventory);
}

function createCell(text) {
  const cell = document.createElement("td");
  cell.textContent = text;
  return cell;
}

function updateResultCount(visibleCount) {
  const totalCount = inventory.length;

  if (visibleCount === 0) {
    const message =
      totalCount === 0
        ? "No available items found."
        : `0 of ${totalCount} available items found.`;
    setStatus(statusElement, message, "info");
    return;
  }

  const visibleLabel = `${visibleCount} available item${visibleCount === 1 ? "" : "s"}`;
  const message =
    visibleCount === totalCount
      ? `${visibleLabel} found.`
      : `${visibleLabel} found out of ${totalCount}.`;
  setStatus(statusElement, message, "success");
}

function renderTable({ updateStatus = true } = {}) {
  tableBody.replaceChildren();
  const items = filteredInventory();

  if (updateStatus) updateResultCount(items.length);

  if (items.length === 0) {
    const row = document.createElement("tr");
    const cell = createCell("No available items match your filters.");
    cell.colSpan = 6;
    cell.className = "empty-state";
    row.append(cell);
    tableBody.append(row);
    return;
  }

  for (const item of items) {
    const row = document.createElement("tr");
    row.append(
      createCell(item.name),
      createCell(item.category),
      createCell(item.location?.name ?? "Unknown location"),
      createCell(formatDateTime(item.collect_by)),
      createCell(String(item.quantity_available))
    );

    const actionCell = document.createElement("td");
    const reserveButton = document.createElement("button");
    reserveButton.type = "button";
    reserveButton.className = "reserve-button";
    reserveButton.textContent = "Reserve";
    reserveButton.addEventListener("click", () => openReservation(item));
    actionCell.append(reserveButton);
    row.append(actionCell);
    tableBody.append(row);
  }
}

function populateFilters() {
  const categories = [...new Set(inventory.map((item) => item.category))].sort();
  // A map removes duplicate locations returned with separate inventory rows.
  const locations = [
    ...new Map(
      inventory
        .filter((item) => item.location)
        .map((item) => [item.location.id, item.location])
    ).values()
  ].sort((left, right) => left.name.localeCompare(right.name));

  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.append(option);
  }

  for (const location of locations) {
    const option = document.createElement("option");
    option.value = location.id;
    option.textContent = location.name;
    locationSelect.append(option);
  }
}

function openReservation(item) {
  selectedItem = item;
  reservationItem.textContent = `${item.name} from ${item.location?.name ?? "the selected location"}`;
  reservationQuantity.value = "1";
  reservationQuantity.max = String(item.quantity_available);
  setStatus(reservationError, "");
  reservationDialog.showModal();
  reservationQuantity.focus();
}

async function submitReservation(event) {
  event.preventDefault();
  if (!selectedItem) return;

  const quantity = Number.parseInt(reservationQuantity.value, 10);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > selectedItem.quantity_available) {
    setStatus(
      reservationError,
      `Enter a quantity between 1 and ${selectedItem.quantity_available}.`,
      "error"
    );
    return;
  }

  reservationSubmit.disabled = true;
  setStatus(reservationError, "Creating reservation...");

  try {
    // The backend requires an authenticated owner for every reservation.
    await ensureAnonymousSession();
    const reservation = await apiRequest("/reservations", {
      method: "POST",
      auth: "public",
      body: {
        inventoryItemId: selectedItem.id,
        quantity
      }
    });

    collectionCode.textContent = reservation.collection_code;
    reservationSummary.textContent =
      `${quantity} × ${selectedItem.name} reserved. ` +
      `Remaining quantity: ${reservation.remaining_quantity}.`;
    // Keep the collection code visible if the user reloads the page.
    localStorage.setItem(
      latestReservationKey,
      JSON.stringify({
        code: reservation.collection_code,
        item: selectedItem.name,
        quantity
      })
    );
    reservationResult.hidden = false;
    reservationDialog.close();
    reservationResult.scrollIntoView({ behavior: "smooth", block: "center" });
    await loadInventory();
  } catch (error) {
    setStatus(reservationError, error.message, "error");
  } finally {
    reservationSubmit.disabled = false;
  }
}

async function loadInventory() {
  setStatus(statusElement, "Loading available food...");
  try {
    inventory = await apiRequest("/inventory");
    if (categorySelect.options.length === 1) populateFilters();
    renderTable();
  } catch (error) {
    inventory = [];
    renderTable({ updateStatus: false });
    setStatus(statusElement, error.message, "error");
  }
}

const initialSearch = new URLSearchParams(window.location.search).get("search");
if (initialSearch) searchInput.value = initialSearch;

try {
  // Restore only the display summary; the server remains the source of truth.
  const latestReservation = JSON.parse(localStorage.getItem(latestReservationKey));
  if (latestReservation?.code) {
    collectionCode.textContent = latestReservation.code;
    reservationSummary.textContent =
      `${latestReservation.quantity} × ${latestReservation.item} reserved.`;
    reservationResult.hidden = false;
  }
} catch {
  localStorage.removeItem(latestReservationKey);
}

searchInput.addEventListener("input", renderTable);
sortSelect.addEventListener("change", renderTable);
categorySelect.addEventListener("change", renderTable);
locationSelect.addEventListener("change", renderTable);
reservationForm.addEventListener("submit", submitReservation);
reservationCancel.addEventListener("click", () => reservationDialog.close());
reservationDialog.addEventListener("close", () => {
  selectedItem = null;
  setStatus(reservationError, "");
});

loadInventory();
