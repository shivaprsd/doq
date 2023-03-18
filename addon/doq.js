
import { DOQ } from "./lib/engine.js";
import { installAddon } from "./addon.js";

/* Initialisation */
if (document.readyState === "interactive" || document.readyState === "complete") {
  installAddon();
} else {
  document.addEventListener("DOMContentLoaded", installAddon, true);
}
/* window.DOQ = DOQ; */
