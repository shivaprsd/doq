
import { DOQ } from "./config.js";
import { setCanvasTheme } from "./engine.js";
import { updatePreference } from "./prefs.js";
import { redrawAnnotation } from "./annots.js";

function updateReaderColors(e) {
  const { config } = DOQ;
  const picker = config.tonePicker;
  const pick = picker.readerTone.value;
  const sel = config.schemeSelector.selectedIndex;
  const redraw = e?.isTrusted;

  if (pick == 0) {
    disableReader(redraw);
    disableInvert();
  } else if (pick == picker.elements.length - 1) {
    enableInvert(redraw);
  } else {
    const readerTone = setCanvasTheme(sel, +pick - 1);
    config.docStyle.setProperty("--reader-bg", readerTone.background);
    disableInvert();
    enableReader(redraw);
  }
  updatePreference("tone", pick);
}

function enableReader(redraw) {
  DOQ.config.viewerClassList.add("reader");
  DOQ.flags.engineOn = true;
  if (redraw) {
    forceRedraw();
  }
}

function disableReader(redraw) {
  const { config, flags } = DOQ;
  if (!flags.engineOn) {
    return;
  }
  config.viewerClassList.remove("reader");
  flags.engineOn = false;
  if (redraw) {
    forceRedraw();
  }
}

function enableInvert(redraw) {
  if (DOQ.flags.engineOn) {
    disableReader(redraw);
  }
  DOQ.config.viewerClassList.add("invert");
}

function disableInvert() {
  DOQ.config.viewerClassList.remove("invert");
}

function toggleFlags(e) {
  const { flags } = DOQ;
  const flag = e.target.id.replace("Enable", "sOn");

  flags[flag] = e.target.checked;
  updatePreference(flag);
  if (flags.engineOn) {
    forceRedraw();
  }
}

function forceRedraw() {
  const { pdfViewer, pdfThumbnailViewer } = window.PDFViewerApplication;
  const annotations = pdfViewer.pdfDocument?.annotationStorage.getAll();

  Object.values(annotations || {}).forEach(redrawAnnotation);
  pdfViewer._pages.filter(e => e.renderingState).forEach(e => e.reset());
  pdfThumbnailViewer._thumbnails.filter(e => e.renderingState)
                                .forEach(e => e.reset());
  window.PDFViewerApplication.forceRendering();
}

export { updateReaderColors, toggleFlags };
