const searchForm = document.getElementById("search");

searchForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = new FormData(searchForm).get("search")?.trim();
  const url = new URL("./AllItem.html", window.location.href);
  if (query) url.searchParams.set("search", query);
  window.location.assign(url);
});
