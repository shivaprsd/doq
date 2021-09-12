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
      const appConfig = window.PDFViewerApplication.appConfig;
      window.PDFLessPlugin = PDFLessPlugin;
      PDFLessPlugin.load(appConfig, colors);
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

const PDFLessPlugin = {
  config: {},
  appConfig: {},
  colorSchemes: [],
  flags: { imageMode: false },

  getPdfLessConfig() {
    return {
      compStyle: getComputedStyle(document.documentElement),
      docStyle: document.documentElement.style,
      lightsOff: document.getElementById("lightsOff"),
      termMode: document.getElementById("termMode"),
      secTermMode: document.getElementById("secTermMode"),
      schemeSelector: document.getElementById("colorSelect"),
      colorPicker: document.getElementById("colorPicker"),
      imageToggle: document.getElementById("imageEnable"),
      viewerClassList: document.getElementById("mainContainer").classList
    };
  },

  load(appConfig, colorSchemes) {
    this.config = this.getPdfLessConfig();
    this.appConfig = appConfig;
    this.colorSchemes = colorSchemes;
    if (parseFloat(pdfjsLib.version) < 2.6) {
      this.config.docStyle.setProperty("--secToolbarWidth", "200px");
      this.config.docStyle.setProperty("--secToolbarBtnPad", "24px");
      this.config.docStyle.setProperty("--secToolbarIconLeft", "4px");
    }
    colorSchemes.forEach(scheme => {
      this.config.schemeSelector.innerHTML += `<option>${scheme.name}</option>`;
    });
    colorSchemes[0] && this.updateColorScheme(colorSchemes[0]);

    appConfig.mainContainer.ondblclick = e => this.scroll(e);
    this.config.colorPicker.onclick = e => this.updateTermColor(e);
    this.config.schemeSelector.onchange = e => {
      this.updateColorScheme(this.colorSchemes[e.target.selectedIndex]);
    };
    this.config.imageToggle.onchange = e => this.toggleImgMode(e.target.checked);
  /*document.getElementById("fontInput").onchange = function(e) {
    if (this.value) {
      config.docStyle.setProperty("--termFont", this.value);
      config.viewerClassList.add("termFont");
    } else {
      config.viewerClassList.remove("termFont");
    }
  }
  document.getElementById("fontResize").oninput = function(e) {
    config.docStyle.setProperty("--fontScale", this.value);
  }*/
    this.config.lightsOff.onclick = e => this.toggleLightsOff();
    this.config.termMode.onclick = this.config.secTermMode.onclick = e => this.toggleTermMode();
  },

  scroll(e) {
    if (!("ontouchstart" in window) && !e.altKey)
      return;
    /* Click location: map [left, center, right] to [-1, 0, 1] */
    const loc = Math.floor(e.clientX / window.innerWidth * 3) - 1;
    const viewer = e.target;
    if (loc === 0) {  /* Toggle toolbar */
      viewer.style.top = Math.abs(viewer.offsetTop - 32) + "px";
      this.appConfig.toolbar.toolbarContainer.classList.toggle("hidden");
    } else {
      viewer.scrollBy(0, loc * viewer.clientHeight);
    }
  },

  updateColorScheme(sch) {
    sch.background && this.config.docStyle.setProperty("--termBG", sch.background);
    sch.highlight && this.config.docStyle.setProperty("--termHL", sch.highlight);
    if (!sch.termColors || !(n = Object.keys(sch.termColors).length))
      return;
    this.config.colorPicker.innerHTML = "";
    for (let c in sch.termColors) {
      this.config.colorPicker.innerHTML += `<li class="colorSwatch" title="${c}"
        style="background: ${sch.termColors[c]}"></li>`;
    }
    this.config.docStyle.setProperty("--swatchN", Math.ceil(n / Math.ceil(n / 8)));
    setTimeout(() => this.config.colorPicker.firstElementChild.click(), 10);
  },

  updateTermColor(e) {
    if (e.target.tagName !== "LI")
      return;
    this.config.docStyle.setProperty("--termColor", e.target.style.backgroundColor);
    if (sel = this.config.colorPicker.querySelector(".selected")) {
      sel.classList.remove("selected");
    }
    e.target.classList.add("selected");
  },

  toggleLightsOff() {
    if (this.config.viewerClassList.contains("termMode")) {
      this.toggleTermMode();
    }
    this.config.viewerClassList.toggle("lightsOff");
  },
  toggleTermMode() {
    const toTermMode = !this.config.viewerClassList.contains("termMode");
    const imageOn = this.config.imageToggle.checked;
    if (toTermMode) {
      if (imageOn) {
        this.forceRedraw(true);
        this.flags.imageMode = true;
        this.config.docStyle.setProperty("--canvasDisplay", "block");
      } else {
        this.config.docStyle.setProperty("--canvasDisplay", "none");
      }
    } else {
      if (this.flags.imageMode) {
        this.forceRedraw(false);
        this.flags.imageMode = false;
      }
      this.config.docStyle.setProperty("--canvasDisplay", "block");
    }
    this.config.viewerClassList.toggle("termMode");
    this.config.viewerClassList.remove("lightsOff");
  },

  toggleImgMode(enable) {
    const termMode = this.config.viewerClassList.contains("termMode");
    if (termMode) {
      if (enable) {
        if (!this.flags.imageMode) {
          this.forceRedraw(true);
          this.flags.imageMode = true;
        }
        this.config.docStyle.setProperty("--canvasDisplay", "block");
      } else {
        this.config.docStyle.setProperty("--canvasDisplay", "none");
      }
    }
  },

  forceRedraw(imageMode) {
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
  const ctxProto = CanvasRenderingContext2D.prototype;
  const ctxProtoArr = [ctxProto.fillText, ctxProto.strokeText,
                       ctxProto.fillRect, ctxProto.strokeRect];
