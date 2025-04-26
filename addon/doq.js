
import * as doqAPI from "./lib/api.js";
import { addColorScheme } from "./lib/engine.js";

import { DOQ, initConfig } from "./app/config.js";
import { migratePrefs } from "./app/prefs.js";
import { updateReaderState, updateColorScheme } from "./app/theme.js";
import { getViewerEventBus } from "./app/utils.js";
import * as Reader from "./app/reader.js";
import * as Toolbar from "./app/toolbar.js";

/* Initialisation */
if (typeof window !== "undefined" && globalThis === window) {
  if (window.PDFViewerApplication) {
    const { readyState } = document;

    if (readyState === "interactive" || readyState === "complete") {
      installAddon();
    } else {
      document.addEventListener("DOMContentLoaded", installAddon, true);
    }
  }
  window.DOQ = doqAPI;
} else {
  console.error("doq: this script should be run in a browser environment");
}

async function installAddon() {
  const getURL = path => new URL(path, import.meta.url);
  const colors = await fetch(getURL("lib/colors.json")).then(resp => resp.json());
  linkCSS(getURL("doq.css"));
  fetch(getURL("doq.html"))
    .then(response => response.text()).then(installUI)
    .then(() => load(colors));
}

function linkCSS(href) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

function installUI(html) {
  const docFrag = document.createRange().createContextualFragment(html);
  const toolbar = document.getElementById("toolbarViewerRight");
  toolbar.prepend(docFrag.getElementById("toolbarAddon").content);
}

function load(colorSchemes) {
  colorSchemes.forEach(addColorScheme);
  Reader.initReader();
  initConfig();
  migratePrefs();       /* TEMPORARY */
  updateReaderState();
  bindEvents();
}

/* Event listeners */
function bindEvents() {
  const { config, flags } = DOQ;
  config.sysTheme.onchange = updateReaderState;
  config.schemeSelector.onchange = updateColorScheme;
  config.tonePicker.onchange = Reader.updateReaderColors;
  config.shapeToggle.onchange = config.imageToggle.onchange = Reader.toggleFlags;
  getViewerEventBus().then(eventBus => {
    eventBus.on("annotationeditorlayerrendered", Reader.handleAnnotations);
  });

  config.viewReader.onclick = Toolbar.toggleToolbar;
  config.optionsToggle.onchange = e => Toolbar.toggleOptions();
  config.schemeSelector.onclick = e => {
    config.readerToolbar.classList.remove("tabMode");
  };

  window.addEventListener("beforeprint", e => flags.isPrinting = true);
  window.addEventListener("afterprint", e => flags.isPrinting = false);
  window.addEventListener("click", Toolbar.closeToolbar);
  window.addEventListener("keydown", Toolbar.handleKeyDown);
}
