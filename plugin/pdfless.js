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
  readerTone: {},
  flags: { readerOn: false, imagesOn: false },

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
    if (parseFloat(pdfjsLib.version) < 2.6) {
      this.config.docStyle.setProperty("--secToolbarWidth", "200px");
      this.config.docStyle.setProperty("--secToolbarBtnPad", "24px");
      this.config.docStyle.setProperty("--secToolbarIconLeft", "4px");
    }
    colorSchemes.forEach(scheme => {
      this.config.schemeSelector.innerHTML += `<option>${scheme.name}</option>`;
      scheme.tones.forEach(tone => {
        let [b,f] = [tone.background,tone.foreground].map(this.math.rgbFromHex);
        tone.rgb = { bg: b, fg: f, grad: b.map((e, i) => e - f[i]) };
      })
    });
    this.colorSchemes = colorSchemes;
    colorSchemes[0] && this.updateColorScheme(colorSchemes[0]);

    appConfig.mainContainer.ondblclick = this.scroll.bind(this);
    this.config.colorPicker.onclick = this.updateReaderColors.bind(this);
    this.config.schemeSelector.onchange = e => {
      this.updateColorScheme(this.colorSchemes[e.target.selectedIndex]);
    };
    this.config.imageToggle.onchange = this.toggleImages.bind(this);
    this.config.lightsOff.onclick = this.toggleLightsOff.bind(this);
    this.config.reader.onclick = this.config.secReader.onclick
                               = this.toggleReader.bind(this);

    const ctx = CanvasRenderingContext2D.prototype;
    ["fill", "stroke"].forEach(f => {
      ["", "Rect", "Text"].forEach(e =>
        ctx[f + e] = this.wrap(ctx[f + e], f + "Style",
                               this.getReaderStyle.bind(this)));
    });
    ctx.drawImage = this.wrap(ctx.drawImage, "globalCompositeOperation",
                              this.getReaderCompOp.bind(this));
  },

  scroll(e) {
    if (!("ontouchstart" in window) && !e.altKey)
      return;
    /* Click location: map [left, center, right] to [-1, 0, 1] */
    const loc = Math.floor(e.clientX / window.innerWidth * 3) - 1;
    const viewer = e.currentTarget;
    if (loc === 0) {  /* Toggle toolbar */
      viewer.style.top = Math.abs(viewer.offsetTop - 32) + "px";
      this.appConfig.toolbar.container.classList.toggle("hidden");
    } else {
      viewer.scrollBy(0, loc * viewer.clientHeight);
    }
  },

  updateColorScheme(scheme) {
    if (!scheme.tones || !scheme.tones.length)
      return;
    const picker = this.config.colorPicker;
    picker.innerHTML = scheme.tones.reduce((acc, e, i) => (
      `${acc}<li style="color: ${e.foreground}; background: ${e.background};"
                 class="colorSwatch" title="${e.title}" value="${i}"></li>`
    ), "");
    this.config.docStyle.setProperty("--swatchN", picker.childElementCount);
    setTimeout(() => picker.firstElementChild.click(), 10);
  },

  updateReaderColors(e) {
    if (e.target.tagName !== "LI")
      return;
    let sel = this.config.schemeSelector.selectedIndex;
    this.readerTone = this.colorSchemes[sel].tones[e.target.value];
    this.config.docStyle.setProperty("--readerBG", this.readerTone.background);
    if (sel = e.currentTarget.querySelector(".selected")) {
      sel.classList.remove("selected");
    }
    e.target.classList.add("selected");
    if (this.flags.readerOn)
      this.forceRedraw();
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

  toggleImages(e) {
    this.flags.imagesOn = e.target.checked;
    if (this.flags.readerOn) {
      this.forceRedraw();
    }
  },

  forceRedraw() {
    const pdfViewer = window.PDFViewerApplication.pdfViewer;
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
    if (this.flags.readerOn)
      style = this.math.calcTextStyle(style, this.readerTone.rgb);
    return style;
  },
  getReaderCompOp(_, compOp) {
    if (this.flags.readerOn && this.flags.imagesOn)
      compOp = "multiply";
    return compOp;
  },

  wrap(method, prop, getNewVal) {
    return function() {
      const orig = this[prop];
      this[prop] = getNewVal(method.name, orig);
      method.apply(this, arguments);
      this[prop] = orig;
    }
  },

  math: {
    calcTextStyle(hex, params) {
      const rgb = this.rgbFromHex(hex);
      const [s, l] = this.slFromRgb(rgb);
      const {bg, fg, grad} = params;
      if (s < 0.1)
        hex = this.hexFromRgb(grad.map((e, i) => parseInt(e * l + fg[i])));
      else
        console.log(this.contrast(bg, rgb))
      return hex;
    },

    rgbFromHex(hex) {
      return hex.substr(1).match(/../g).map(h => parseInt(h, 16));
    },
    hexFromRgb(rgb) {
      return "#" + rgb.map(e => e.toString(16).padStart(2, "0")).join("");
    },
    slFromRgb(rgb) {
      [r, g, b] = rgb.map(e => e / 255);
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const d = max - min, l = (max + min) / 2;
      const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
      return [s, l];
    },

    srgbGamma(c) {
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    },
    luminance(rgb) {
      const coeffs = [0.2126, 0.7152, 0.0722];
      return rgb.map((e, i) => coeffs[i] * Math.pow(e / 255, 2.2))
                .reduce((prev, cur) => prev + cur);
    },
    contrast(bg, fg) {
      const r = [bg,fg].map(e => this.luminance(e) + 0.05).reduce((p,c) => p/c);
      return r < 1 ? 1/r : r;
    }
  }
}
