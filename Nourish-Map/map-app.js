import { apiRequest, setStatus } from "../public/javascript/api.js";

const LADYWOOD_COORDINATES = [-1.9182, 52.4813];
const mapStatus = document.getElementById("map-status");
const locationCount = document.getElementById("location-count");
const locationList = document.getElementById("location-list");
const searchForm = document.getElementById("map-search");
const searchInput = document.getElementById("map-search-input");
const mapButton = document.getElementById("btn-map");
const listButton = document.getElementById("btn-list");
const mapView = document.getElementById("map-view");
const listView = document.getElementById("list-view");

// OpenLayers renders Web Mercator coordinates, while the API stores longitude/latitude.
const map = new ol.Map({
  target: "map",
  layers: [
    new ol.layer.Tile({
      source: new ol.source.OSM()
    })
  ],
  view: new ol.View({
    center: ol.proj.fromLonLat(LADYWOOD_COORDINATES),
    zoom: 14
  })
});

const markerStyle = new ol.style.Style({
  image: new ol.style.Circle({
    radius: 9,
    fill: new ol.style.Fill({ color: "#86B070" }),
    stroke: new ol.style.Stroke({ color: "#235F83", width: 2 })
  })
});
const vectorSource = new ol.source.Vector();
map.addLayer(new ol.layer.Vector({ source: vectorSource }));

let locations = [];
let inventory = [];

function inventoryForLocation(locationId) {
  return inventory.filter((item) => item.location_id === locationId);
}

function switchView(mode) {
  const showMap = mode === "map";
  mapButton.classList.toggle("active", showMap);
  listButton.classList.toggle("active", !showMap);
  mapButton.setAttribute("aria-pressed", String(showMap));
  listButton.setAttribute("aria-pressed", String(!showMap));
  mapView.classList.toggle("hidden", !showMap);
  listView.classList.toggle("hidden", showMap);
  // A hidden map has no usable dimensions, so recalculate after it becomes visible.
  if (showMap) window.setTimeout(() => map.updateSize(), 50);
}

function focusLocation(location) {
  map.getView().animate({
    center: ol.proj.fromLonLat([
      Number(location.longitude),
      Number(location.latitude)
    ]),
    zoom: 16,
    duration: 500
  });

  const card = document.querySelector(`[data-location-id="${location.id}"]`);
  card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  card?.classList.add("highlight");
  window.setTimeout(() => card?.classList.remove("highlight"), 1400);
}

function renderMarkers() {
  vectorSource.clear();
  const features = locations.map((location) => {
    const feature = new ol.Feature({
      geometry: new ol.geom.Point(
        ol.proj.fromLonLat([
          Number(location.longitude),
          Number(location.latitude)
        ])
      ),
      locationId: location.id
    });
    feature.setStyle(markerStyle);
    return feature;
  });
  vectorSource.addFeatures(features);
}

function appendTextLine(parent, className, text) {
  const paragraph = document.createElement("p");
  paragraph.className = className;
  paragraph.textContent = text;
  parent.append(paragraph);
}

function renderLocationCards() {
  locationList.replaceChildren();

  for (const location of locations) {
    const locationInventory = inventoryForLocation(location.id);
    // Build cards with textContent so database text is never interpreted as markup.
    const card = document.createElement("article");
    card.className = `food-card${location.urgent ? " urgent" : ""}`;
    card.dataset.locationId = location.id;

    const header = document.createElement("div");
    header.className = "card-header";
    const heading = document.createElement("h2");
    heading.textContent = location.name;
    header.append(heading);

    if (location.urgent) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "Urgent support";
      header.append(badge);
    }

    card.append(header);
    appendTextLine(
      card,
      "address",
      `${location.address_line}, ${location.postcode}`
    );
    appendTextLine(
      card,
      "items",
      locationInventory.length
        ? locationInventory
            .map((item) => `${item.name} (${item.quantity_available})`)
            .join(", ")
        : "No food currently listed"
    );
    appendTextLine(
      card,
      "time",
      location.opening_info || "Contact the location for opening times"
    );

    const actions = document.createElement("div");
    actions.className = "card-actions";
    const mapLink = document.createElement("button");
    mapLink.type = "button";
    mapLink.textContent = "Show on map";
    mapLink.addEventListener("click", () => {
      switchView("map");
      focusLocation(location);
    });
    const foodLink = document.createElement("a");
    foodLink.href = `../public/AllItem.html?search=${encodeURIComponent(location.name)}`;
    foodLink.textContent = "View food";
    actions.append(mapLink, foodLink);
    card.append(actions);
    locationList.append(card);
  }
}

function searchLocations(event) {
  event.preventDefault();
  const query = searchInput.value.trim().toLowerCase();
  if (!query) return;

  const match = locations.find((location) => {
    const food = inventoryForLocation(location.id);
    return [
      location.name,
      location.address_line,
      location.postcode,
      ...food.flatMap((item) => [item.name, item.category, item.description])
    ]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });

  if (!match) {
    setStatus(mapStatus, `No locations or food match "${searchInput.value.trim()}".`, "error");
    return;
  }

  setStatus(mapStatus, `Showing ${match.name}.`, "success");
  focusLocation(match);
  if (window.matchMedia("(max-width: 767px)").matches) switchView("map");
}

async function loadMapData() {
  setStatus(mapStatus, "Loading collection locations...");
  try {
    [locations, inventory] = await Promise.all([
      apiRequest("/locations"),
      apiRequest("/inventory")
    ]);
    renderMarkers();
    renderLocationCards();
    locationCount.textContent =
      `${locations.length} location${locations.length === 1 ? "" : "s"}`;
    setStatus(mapStatus, "");
  } catch (error) {
    locationCount.textContent = "Unavailable";
    setStatus(mapStatus, error.message, "error");
  }
}

map.on("singleclick", (event) => {
  map.forEachFeatureAtPixel(event.pixel, (feature) => {
    const location = locations.find((item) => item.id === feature.get("locationId"));
    if (location) {
      focusLocation(location);
      if (window.matchMedia("(max-width: 767px)").matches) switchView("list");
    }
  });
});

new ResizeObserver(() => map.updateSize()).observe(document.getElementById("map"));
mapButton.addEventListener("click", () => switchView("map"));
listButton.addEventListener("click", () => switchView("list"));
searchForm.addEventListener("submit", searchLocations);

if (window.location.hash === "#list-view") switchView("list");
loadMapData();
