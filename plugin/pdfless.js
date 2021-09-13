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
  flags: {
    readerOn: false, imagesOn: false
  },

  getPdfLessConfig() {
    return {
      compStyle: getComputedStyle(document.documentElement),
      docStyle: document.documentElement.style,
      lightsOff: document.getElementById("lightsOff"),
      reader: document.getElementById("reader"),
      secReader: document.getElementById("secReader"),
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
    this.config.colorPicker.onclick = e => this.updateReaderColors(e);
    this.config.schemeSelector.onchange = e => {
      this.updateColorScheme(this.colorSchemes[e.target.selectedIndex]);
    };
    this.config.imageToggle.onchange = e => this.toggleImages(e.target.checked);
    this.config.lightsOff.onclick = e => this.toggleLightsOff();
    this.config.reader.onclick = this.config.secReader.onclick = e => this.toggleReader();

    const ctx = CanvasRenderingContext2D.prototype;
    ["fill", "stroke"].forEach(f => {
      ["", "Rect", "Text"].forEach(e =>
        ctx[f + e] = this.wrap(ctx[f + e], f + "Style", this.getReaderStyle));
    });
    ctx.drawImage = this.wrap(ctx.drawImage, "globalCompositeOperation",
                              this.getReaderCompOp);
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
    /*sch.background && this.config.docStyle.setProperty("--readerBG", sch.background);
    if (!sch.termColors || !(n = Object.keys(sch.termColors).length))
      return;
    this.config.colorPicker.innerHTML = "";
    for (let c in sch.termColors) {
      this.config.colorPicker.innerHTML += `<li class="colorSwatch" title="${c}"
        style="background: ${sch.termColors[c]}"></li>`;
    }
    this.config.docStyle.setProperty("--swatchN", Math.ceil(n / Math.ceil(n / 8)));
    setTimeout(() => this.config.colorPicker.firstElementChild.click(), 10);*/
  },

  updateReaderColors(e) {
    if (e.target.tagName !== "LI")
      return;
    if (sel = this.config.colorPicker.querySelector(".selected")) {
      sel.classList.remove("selected");
    }
    e.target.classList.add("selected");
  },

  toggleLightsOff() {
    if (this.config.viewerClassList.contains("reader")) {
      this.toggleReader();
    }
    this.config.viewerClassList.toggle("lightsOff");
    this.config.lightsOff.classList.toggle("toggled");
  },
  toggleReader() {
    this.config.viewerClassList.toggle("reader");
    this.config.reader.classList.toggle("toggled");
    this.config.viewerClassList.remove("lightsOff");
    this.config.lightsOff.classList.remove("toggled");

    this.flags.readerOn = this.config.viewerClassList.contains("reader");
    this.forceRedraw();
  },

  toggleImages(bool) {
    //const reader = this.config.viewerClassList.contains("reader");
    this.flags.imagesOn = bool;
    if (this.flags.readerOn) {
      this.forceRedraw();
    }
  },

  forceRedraw() {
    const pdfViewer = PDFViewerApplication.pdfViewer;
    const i = pdfViewer.currentPageNumber;
    for (let j = i - 9; j < i + 8; ++j) {
      if (j >= 0 && j < pdfViewer.pagesCount) {
        pdfViewer.getPageView(j).renderingState = 0;
        pdfViewer.getPageView(j).reset();
      }
    }
    pdfViewer.forceRendering();
  },

  getReaderStyle(action, style) {
    return style;
  },
  getReaderCompOp(_, compOp) {
    return compOp;
  },

  wrap(method, prop, getNewVal) {
    return function() {
      const orig = this[prop];
      this[prop] = getNewVal(method.name, orig);
      method.apply(this, arguments);
      this[prop] = orig;
    }
  }
}
