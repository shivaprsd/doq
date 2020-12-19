if (document.readyState === "interactive" || document.readyState === "complete") {
  pdfLessInit();
} else {
  document.addEventListener("DOMContentLoaded", pdfLessInit, true);
}

async function pdfLessInit() {
  linkCSS("../plugin/pdfless.css");
  const colors = await fetch("../plugin/colors.json").then(resp => resp.json());
  fetch("../plugin/pdfless.html")
    .then(response => response.text()).then(addHTML)
    .then(function() {
      const config = getPdfLessConfig();
      config.termColors = colors.termColors;
      config.textColors = colors.textColors;
      pdfLessLoad(config);
    });

  function addHTML(html) {
    let docFrag = document.createRange().createContextualFragment(html);
    let toolbar = document.getElementById("toolbarViewerRight");
    toolbar.prepend(docFrag.getElementById("toolbarAddon").content);
    let secToolbar = document.getElementById("secondaryToolbarButtonContainer");
    secToolbar.prepend(docFrag.getElementById("secToolbarAddon").content);
  }

  function linkCSS(href) {
    let link = document.createElement("link");
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = href;
    document.head.appendChild(link);
  }
}

function getPdfLessConfig() {
  return {
    enableImg: true,
    imageMode: false,
    fontScaleAmt: 0.04,
    termColors: {},
    textColors: {},
    compStyle: getComputedStyle(document.documentElement),
    docStyleElem: document.documentElement.style,
    colorInputElem: document.getElementById("colorInput"),
    viewerClassList: document.getElementById("viewer").classList
  };
}

function pdfLessLoad(config) {
  if (config.termColors.background) {
    config.docStyleElem.setProperty("--termBG", config.termColors.background);
  }
  if (config.termColors.highlight) {
    config.docStyleElem.setProperty("--termHL", config.termColors.highlight);
  }
  for (let col in config.textColors) {
    config.colorInputElem.innerHTML +=
      `<option value="${config.textColors[col]}">${col}</option>`;
  }
  if (parseFloat(pdfjsLib.version) < 2.6) {
    config.docStyleElem.setProperty("--secToolbarWidth", "200px");
    config.docStyleElem.setProperty("--secToolbarBtnPad", "24px");
    config.docStyleElem.setProperty("--secToolbarIconLeft", "4px");
  }

  config.colorInputElem.onchange = function(e) {
    config.docStyleElem.setProperty("--termColor", this.value);
  }
  document.getElementById("imageEnable").onchange = function(e) {
    const termMode = config.viewerClassList.contains("termMode");
    config.enableImg = this.checked;
    if (termMode) {
      if (config.enableImg) {
        if (!config.imageMode) {
          forceRedraw(true);
          config.imageMode = true;
        }
        config.docStyleElem.setProperty("--canvasDisplay", "block");
      } else {
        config.docStyleElem.setProperty("--canvasDisplay", "none");
      }
    }
  }
  document.getElementById("fontInput").onchange = function(e) {
    if (this.value) {
      config.docStyleElem.setProperty("--termFont", this.value);
      config.viewerClassList.add("termFont");
    } else {
      config.viewerClassList.remove("termFont");
    }
  }
  document.getElementById("fontReduce").onclick = function(e) {
    termFontResize(-config.fontScaleAmt);
  }
  document.getElementById("fontEnlarge").onclick = function(e) {
    termFontResize(+config.fontScaleAmt);
  }
  document.getElementById("lightsOff").onclick = toggleLightsOff;
  document.getElementById("secLightsOff").onclick = toggleLightsOff;
  document.getElementById("termMode").onclick = toggleTermMode;
  document.getElementById("secTermMode").onclick = toggleTermMode;

  function toggleLightsOff() {
    if (config.viewerClassList.contains("termMode")) {
      toggleTermMode();
    }
    config.viewerClassList.toggle("lightsOff");
  }
  function toggleTermMode() {
    const toTermMode = !config.viewerClassList.contains("termMode");
    if (toTermMode) {
      if (config.enableImg) {
        forceRedraw(true);
        config.imageMode = true;
        config.docStyleElem.setProperty("--canvasDisplay", "block");
      } else {
        config.docStyleElem.setProperty("--canvasDisplay", "none");
      }
    } else {
      if (config.imageMode) {
        forceRedraw(false);
        config.imageMode = false;
      }
      config.docStyleElem.setProperty("--canvasDisplay", "block");
    }
    config.viewerClassList.toggle("termMode");
    config.viewerClassList.remove("lightsOff");
  }

  function termFontResize(amount) {
    let scale = config.compStyle.getPropertyValue("--fontScale");
    config.docStyleElem.setProperty("--fontScale", parseFloat(scale) + amount);
  }

  const ctxProto = CanvasRenderingContext2D.prototype;
  const ctxProtoArr = [ctxProto.fillText, ctxProto.strokeText,
                       ctxProto.fillRect, ctxProto.strokeRect];
  function forceRedraw(imageMode) {
    if (imageMode) {
      ctxProto.fillText = ctxProto.strokeText = function() {};
      ctxProto.fillRect = ctxProto.strokeRect = function() {};
    } else {
      [ctxProto.fillText, ctxProto.strokeText,
       ctxProto.fillRect, ctxProto.strokeRect] = ctxProtoArr;
    }
    const pdfViewer = PDFViewerApplication.pdfViewer;
    const i = pdfViewer.currentPageNumber;
    for (let j = i - 9; j < i + 8; ++j) {
      if (j >= 0 && j < pdfViewer.pagesCount) {
        pdfViewer.getPageView(j).renderingState = 0;
        pdfViewer.getPageView(j).reset();
      }
    }
    pdfViewer.forceRendering();
  }
}
