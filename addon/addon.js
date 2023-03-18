
import { initEngine } from "./lib/engine.js";
import { DOQ, initConfig } from "./lib/config.js";
import { updateReaderState, updateColorScheme } from "./lib/theme.js";
import { updateReaderColors, toggleFlags } from "./lib/reader.js";
import { monitorAnnotationParams, handleInput } from "./lib/annots.js";
import * as Toolbar from "./lib/toolbar.js";

async function installAddon() {
  const getURL = path => new URL(path, import.meta.url);
  const colors = await fetch(getURL("colors.json")).then(resp => resp.json());
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
  const findbar = document.getElementById("findbar");
  findbar.after(docFrag.getElementById("mainAddon").content);
}

function load(colorSchemes) {
  initEngine(colorSchemes);
  initConfig();
  updateReaderState();
  bindEvents();
}

/* Event listeners */
function bindEvents() {
  const { config, flags } = DOQ;
  config.sysTheme.onchange = updateReaderState;
  config.schemeSelector.onchange = updateColorScheme;
  config.tonePicker.onchange = updateReaderColors;
  config.shapeToggle.onchange = config.imageToggle.onchange = toggleFlags;
  monitorAnnotationParams();

  config.viewReader.onclick = Toolbar.toggleToolbar;
  config.optionsToggle.onchange = e => Toolbar.toggleOptions();
  config.schemeSelector.onclick = e => {
    config.readerToolbar.classList.remove("tabMode");
  };
  config.viewer.addEventListener("input", handleInput);

  window.addEventListener("beforeprint", e => flags.isPrinting = true);
  window.addEventListener("afterprint", e => flags.isPrinting = false);
  window.addEventListener("click", Toolbar.closeToolbar);
  window.addEventListener("keydown", Toolbar.handleKeyDown);
  window.addEventListener("resize", Toolbar.updateToolbarPos);

  new MutationObserver(Toolbar.updateToolbarPos).observe(
    config.viewReader.parentElement,
    { subtree: true, attributeFilter: ["style", "class", "hidden"] }
  );
}

export { installAddon };
