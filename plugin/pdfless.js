;
if (location.search.startsWith("?enc=false")) {
  const encFilePath = encodeURIComponent(location.search.substring(16));
  history.replaceState(null, "", "?file=" + encFilePath);
}
if (document.readyState === "interactive" || document.readyState === "complete") {
  pdfLessInit();
} else {
  document.addEventListener("DOMContentLoaded", pdfLessInit, true);
}

async function pdfLessInit() {
  const colors = await fetch("../plugin/colors.json").then(resp => resp.json());
  fetch("../plugin/pdfless.html")
    .then(response => response.text()).then(addHTML)
    .then(function() {
      const config = getPdfLessConfig();
      config.colorSch = colors;
      pdfLessLoad(config);
    });
  function addHTML(html) {
    let docFrag = document.createRange().createContextualFragment(html);
    let toolbar = document.getElementById("toolbarViewerRight");
    toolbar.prepend(docFrag.getElementById("toolbarAddon").content);
    let secToolbar = document.getElementById("secondaryToolbarButtonContainer");
    secToolbar.prepend(docFrag.getElementById("secToolbarAddon").content);
    document.head.append(docFrag.getElementById("headAddon").content);
  }
}

function getPdfLessConfig() {
  return {
    colorSch: [],
    enableImg: true,
    imageMode: false,
    compStyle: getComputedStyle(document.documentElement),
    docStyle: document.documentElement.style,
    colorSelectElem: document.getElementById("colorSelect"),
    colorPickElem: document.getElementById("colorPicker"),
    viewerClassList: document.getElementById("mainContainer").classList
  };
}

function pdfLessLoad(config) {
  if (parseFloat(pdfjsLib.version) < 2.6) {
    config.docStyle.setProperty("--secToolbarWidth", "200px");
    config.docStyle.setProperty("--secToolbarBtnPad", "24px");
    config.docStyle.setProperty("--secToolbarIconLeft", "4px");
  }
  config.colorSch.forEach(function(scheme) {
    config.colorSelectElem.innerHTML += `<option>${scheme.name}</option>`;
  });
  config.colorSch[0] && updateColorScheme(config.colorSch[0]);

  document.getElementById("viewerContainer").ondblclick = function(e) {
    if (!("ontouchstart" in window) && !e.altKey)
      return;
    /* Click location: map [left, center, right] to [-1, 0, 1] */
    let loc = Math.floor(e.clientX / window.innerWidth * 3) - 1;
    if (loc === 0) {  /* Toggle toolbar */
      this.style.top = Math.abs(this.offsetTop - 32) + "px";
      document.getElementById("toolbarContainer").classList.toggle("hidden");
    } else {
      this.scrollBy(0, loc * this.clientHeight);
    }
  }
  config.colorPickElem.onclick = updateTermColor;
  config.colorSelectElem.onchange = function(e) {
    updateColorScheme(config.colorSch[this.selectedIndex]);
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
        config.docStyle.setProperty("--canvasDisplay", "block");
      } else {
        config.docStyle.setProperty("--canvasDisplay", "none");
      }
    }
  }
  document.getElementById("fontInput").onchange = function(e) {
    if (this.value) {
      config.docStyle.setProperty("--termFont", this.value);
      config.viewerClassList.add("termFont");
    } else {
      config.viewerClassList.remove("termFont");
    }
  }
  document.getElementById("fontResize").oninput = function(e) {
    config.docStyle.setProperty("--fontScale", this.value);
  }
  document.getElementById("lightsOff").onclick = toggleLightsOff;
  document.getElementById("secLightsOff").onclick = toggleLightsOff;
  document.getElementById("termMode").onclick = toggleTermMode;
  document.getElementById("secTermMode").onclick = toggleTermMode;

  function updateColorScheme(sch) {
    sch.background && config.docStyle.setProperty("--termBG", sch.background);
    sch.highlight && config.docStyle.setProperty("--termHL", sch.highlight);
    if (!sch.termColors || !(n = Object.keys(sch.termColors).length))
      return;
    config.colorPickElem.innerHTML = "";
    for (let c in sch.termColors) {
      config.colorPickElem.innerHTML += `<li class="colorSwatch" title="${c}"
        style="background: ${sch.termColors[c]}"></li>`
    }
    config.docStyle.setProperty("--swatchN", Math.ceil(n / Math.ceil(n / 8)));
    setTimeout(() => config.colorPickElem.firstElementChild.click(), 10);
  }
  function updateTermColor(e) {
    if (e.target.tagName !== "LI")
      return;
    config.docStyle.setProperty("--termColor", e.target.style.backgroundColor);
    if (sel = this.querySelector(".selected")) {
      sel.classList.remove("selected");
    }
    e.target.classList.add("selected");
  }
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
        config.docStyle.setProperty("--canvasDisplay", "block");
      } else {
        config.docStyle.setProperty("--canvasDisplay", "none");
      }
    } else {
      if (config.imageMode) {
        forceRedraw(false);
        config.imageMode = false;
      }
      config.docStyle.setProperty("--canvasDisplay", "block");
    }
    config.viewerClassList.toggle("termMode");
    config.viewerClassList.remove("lightsOff");
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
