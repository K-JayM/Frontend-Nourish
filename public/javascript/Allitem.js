let allItems = [];
let currentSort = "";
let currentFilter = "";
 

function formatDate(dateStr) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}
 
function isExpired(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}
 

function renderTable() {
  const tbody = document.querySelector("table tbody");
  if (!tbody) return;
 
  let data = [...allItems];
 
  // Filter by section
  if (currentFilter) {
    data = data.filter(item => item.section === currentFilter);
  }
 
  // Sort
  if (currentSort === "name") {
    data.sort((a, b) => a.item.localeCompare(b.item));
  } else if (currentSort === "collectBy") {
    data.sort((a, b) => new Date(a.date) - new Date(b.date));
  }
 
  tbody.innerHTML = "";
 
  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 1rem; color: #888;">No items found.</td></tr>`;
    return;
  }
 
  data.forEach(item => {
    const expired = isExpired(item.date);
    const tr = document.createElement("tr");
    if (expired) tr.classList.add("expired");
 
    tr.innerHTML = `
      <td>${item.item ?? ""}</td>
      <td>${item.section ?? ""}</td>
      <td>${item.location ?? ""}</td>
      <td>${formatDate(item.date)}</td>
      <td>${expired ? "Expired" : (item.status ?? "Available")}</td>
    `;
    tbody.appendChild(tr);
  });
}
 

function initControls() {
  const sortSelect = document.getElementById("sortBy");
  const allSelects = document.querySelectorAll(".controls select");
  const sectionSelect = Array.from(allSelects).find(s => s.id !== "sortBy");
 
  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      currentSort = sortSelect.value;
      renderTable();
    });
  }
 
  if (sectionSelect) {
    sectionSelect.addEventListener("change", () => {
      currentFilter = sectionSelect.value;
      renderTable();
    });
  }
}
 

async function loadData() {
  try {
    const response = await fetch("data.json");
    if (!response.ok) throw new Error(`Failed to load JSON: ${response.status}`);
    allItems = await response.json();
    renderTable();
  } catch (err) {
    console.error("Could not load food data:", err);
    const tbody = document.querySelector("table tbody");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 1rem; color: #c00;">Failed to load data. Please try again later.</td></tr>`;
    }
  }
}
 

document.addEventListener("DOMContentLoaded", () => {
  initControls();
  loadData();
});

