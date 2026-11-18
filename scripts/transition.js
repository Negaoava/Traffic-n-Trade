const KEY = "tt-crt-transition";
const LEAVE_MS = 620;
const root = document.documentElement;

export function navigateWithTransition(url) {
  if (root.classList.contains("crt-leaving")) return;
  sessionStorage.setItem(KEY, "1");
  root.classList.add("crt-leaving");
  setTimeout(() => {
    window.location.href = url;
  }, LEAVE_MS);
}

if (sessionStorage.getItem(KEY)) {
  sessionStorage.removeItem(KEY);
  setTimeout(() => root.classList.remove("crt-entering"), 950);
}

window.addEventListener("pageshow", (e) => {
  if (e.persisted) {
    root.classList.remove("crt-leaving", "crt-entering");
  }
});