import { settings } from "./settings.js";
import { play } from "./sfx.js";
import { stopMusic } from "./music.js";

const KEY = "tt-crt-transition";
const LEAVE_MS = 620;
const root = document.documentElement;

export function navigateWithTransition(url) {
  if (root.classList.contains("crt-leaving")) return;
  sessionStorage.setItem(KEY, "1");
  root.classList.add("crt-leaving");
  stopMusic(0.55);
  if (settings.crt) play("crtZoomIn");
  setTimeout(() => {
    window.location.href = url;
  }, LEAVE_MS);
}

if (sessionStorage.getItem(KEY)) {
  sessionStorage.removeItem(KEY);
  if (settings.crt) play("crtZoomOut"); // may stay silent if the browser blocks autoplay
  setTimeout(() => root.classList.remove("crt-entering"), 950);
}

window.addEventListener("pageshow", (e) => {
  if (e.persisted) {
    root.classList.remove("crt-leaving", "crt-entering");
  }
});