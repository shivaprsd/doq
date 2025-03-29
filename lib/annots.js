
import { checkFlags, getCanvasStyle } from "./engine.js";

/* Monitor and recolor SVG annotations when they are added/modified */
const svgAnnotation = "svg.draw, svg.highlight";
const annotsMonitor = new MutationObserver(recolorNewAnnots);

function monitorAnnotations(annotsContainer) {
  if (!checkFlags() || !annotsContainer) {
    return;
  }
  annotsContainer.querySelectorAll(svgAnnotation).forEach(recolorSvgAnnot);
  annotsMonitor.observe(annotsContainer, { childList: true });
}

function recolorNewAnnots(mutationRecords) {
  const isSvgAnnot = node => node.matches(svgAnnotation);
  mutationRecords.forEach(record => {
    const { target, addedNodes } = record;
    [target, ...addedNodes].filter(isSvgAnnot).forEach(recolorSvgAnnot);
  });
}

function recolorSvgAnnot(annot) {
  const attr = annot.matches(".highlight") ? "fill" : "stroke";
  const newColor = getCanvasStyle(annot.getAttribute(attr));
  const alreadyObserved = annot.style[attr] !== "";
  annot.style.setProperty(attr, newColor);
  if (!alreadyObserved) {
    annotsMonitor.observe(annot, { attributeFilter: [attr] });
  }
}

/* Recolor/rebuild non-SVG annotations (call before a forced page redraw) */
function redrawAnnotation(annot) {
  if (annot.name === "freeTextEditor") {
    recolorFreeTextAnnot(annot.editorDiv);
  } else if (annot.name === "stampEditor") {
    /* There is no public API to force repaint of a stamp annotation;
    nullifying its parent tricks PDF.js into recreating its canvas. */
    annot.parent = null;
    annot.div.querySelector("canvas")?.remove();
    annot.rebuild();
  }
}

/* Monitor/recolor new non-SVG annotations when they are created/modified */
function monitorEditorEvents(editorLayer, eventBus) {
  editorLayer.addEventListener("input", handleInput);
  eventBus.on("switchannotationeditorparams", recolorSelectedAnnots);
}

function handleInput(e) {
  if (!checkFlags()) {
    return;
  }
  const { target } = e;
  const isFreeText = target.matches?.(".freeTextEditor > .internal");

  if (isFreeText && !target.style.getPropertyValue("--free-text-color")) {
    recolorFreeTextAnnot(target);
  }
}

function recolorSelectedAnnots(e) {
  if (!checkFlags()) {
    return;
  }
  if (e.type === pdfjsLib.AnnotationEditorParamsType.FREETEXT_COLOR) {
    document.querySelectorAll(".freeTextEditor.selectedEditor > .internal")
            .forEach(recolorFreeTextAnnot);
  }
}

function recolorFreeTextAnnot(editor) {
  const newColor = getCanvasStyle(editor.style.color);

  if (editor.style.getPropertyValue("--free-text-color") !== newColor) {
    editor.style.setProperty("--free-text-color", newColor);
  }
}

export { monitorAnnotations, redrawAnnotation, monitorEditorEvents };
