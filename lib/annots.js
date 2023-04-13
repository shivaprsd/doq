
import { checkFlags, getCanvasStyle } from "./engine.js";

function monitorAnnotationParams() {
  const app = window.PDFViewerApplication;
  const registerMonitor = () => {
    app.initializedPromise.then(() => {
      app.eventBus.on("switchannotationeditorparams", recolorSelectedAnnots);
    });
  };
  if (app.initializedPromise) {
    registerMonitor();
  } else {
    document.addEventListener("webviewerloaded", registerMonitor);
  }
}

function redrawAnnotation(annot) {
  if (annot.name === "freeTextEditor") {
    recolorFreeTextAnnot(annot.editorDiv);
  } else {
    annot.rebuild();
  }
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

export { monitorAnnotationParams, redrawAnnotation, handleInput };
