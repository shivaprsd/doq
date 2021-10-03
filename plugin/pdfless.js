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

import Color from "../plugin/color.esm.js";
window.Color = window.Color || Color;
function newColor(obj) { return new Color(obj); }

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
    const appConfig = window.PDFViewerApplication.appConfig;
    let docFrag = document.createRange().createContextualFragment(html);
    let toolbar = document.getElementById("toolbarViewerRight");
    toolbar.prepend(docFrag.getElementById("toolbarAddon").content);
    let mainContainer = document.getElementById("mainContainer");
    mainContainer.insertBefore(docFrag.getElementById("containerAddon").content,
                               appConfig.mainContainer);
    document.head.append(docFrag.getElementById("headAddon").content);
  }
}

const PDFLessPlugin = {
  config: {},
  appConfig: {},
  colorSchemes: [],
  readerTone: {},
  canvasData: null,
  styleCache: new Map(),
  flags: {
    readerOn: false, imagesOn: false,
    invertOn: false, shapesOn: true
  },

  getPdfLessConfig() {
    return {
      compStyle: getComputedStyle(document.documentElement),
      docStyle: document.documentElement.style,
      viewReader: document.getElementById("viewReader"),
      readerToolbar: document.getElementById("readerToolbar"),
      readerSwitch: document.getElementById("readerSwitch"),
      schemeSelector: document.getElementById("schemeSelect"),
      tonePicker: document.getElementById("tonePicker"),
      invertToggle: document.getElementById("invertToggle"),
      shapeToggle: document.getElementById("shapeEnable"),
      imageToggle: document.getElementById("imageEnable"),
      imageMode: document.getElementById("imageMode"),
      viewerClassList: document.getElementById("outerContainer").classList
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
        const [b, f] = [tone.background, tone.foreground].map(newColor);
        tone.colors = {
          bg: b, fg: f,
          acc: (tone.accents || []).map(newColor),
          grad: b.range(f, { outputSpace: "srgb" })
        };
        tone.scheme = scheme;
      });
      scheme.colors = (scheme.accents || []).map(newColor);
    });
    this.colorSchemes = colorSchemes;
    colorSchemes[0] && this.updateColorScheme(colorSchemes[0]);
    this.updateToolbarPos();

    appConfig.mainContainer.ondblclick = this.scroll.bind(this);
    this.config.tonePicker.onclick = this.updateReaderColors.bind(this);
    this.config.tonePicker.onchange = e => e.target.nextElementSibling.click();
    this.config.schemeSelector.onchange = e => {
      this.updateColorScheme(this.colorSchemes[e.target.selectedIndex]);
    };
    this.config.schemeSelector.onclick = e => {
      this.config.readerToolbar.classList.remove("tabMode");
    };
    this.config.readerToolbar.onkeydown = this.handleKeyDown.bind(this);
    this.config.shapeToggle.onchange = this.config.imageToggle.onchange
                                     = this.toggleFlags.bind(this);
    this.config.invertToggle.onchange = this.toggleInvert.bind(this);
    this.config.imageMode.onchange = this.redrawImages.bind(this);
    this.config.readerSwitch.onchange = this.toggleReader.bind(this);
    this.config.viewReader.onclick = this.toggleToolbar.bind(this);
    window.addEventListener("click", this.closeToolbar.bind(this));
    window.addEventListener("resize", this.updateToolbarPos.bind(this));
    (new MutationObserver(this.updateToolbarPos.bind(this))).observe(
      this.config.viewReader.parentElement,
      { subtree: true, attributeFilter: ["style", "hidden"] }
    );

    const ctxp = CanvasRenderingContext2D.prototype;
    const cb = this.saveCanvas.bind(this);
    ctxp.origFillRect = ctxp.fillRect;
    ["fill", "stroke"].forEach(f => {
      ["", "Rect", "Text"].forEach(e => {
        ctxp[f + e] = this.wrap(ctxp[f + e], f + "Style",
                                this.getReaderStyle.bind(this), cb);
      });
    });
    ctxp.origDrawImage = ctxp.drawImage;
    ctxp.drawImage = this.wrap(ctxp.drawImage, "globalCompositeOperation",
                               this.getReaderCompOp.bind(this), cb);
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
    const picker = this.config.tonePicker;
    const createElem = (e, a) => Object.assign(document.createElement(e), a);
    picker.innerHTML = "";
    scheme.tones.forEach((tone, index) => {
      picker.appendChild(createElem("input", {
        type: "radio",
        name: "pickedTone",
        tabIndex: 29
      }));
      picker.lastChild.setAttribute("aria-label", tone.name);
      picker.appendChild(createElem("li", {
        className: "colorSwatch",
        value: index,
        title: tone.name,
        style: `color:${tone.foreground}; background-color:${tone.background};`
      }));
      picker.lastChild.setAttribute("aria-hidden", "true");
    });
    this.config.invertToggle.tabIndex = (scheme.tones.length < 4) ? 29 : 30;
    setTimeout(() => picker.querySelector("li").click(), 10);
  },

  updateReaderColors(e) {
    if (e.target.tagName !== "LI")
      return;
    let sel = this.config.schemeSelector.selectedIndex;
    this.readerTone = this.colorSchemes[sel].tones[e.target.value];
    this.config.docStyle.setProperty("--readerBG", this.readerTone.background);

    e.target.previousElementSibling.checked = true;
    this.styleCache.clear();
    if (this.flags.invertOn)
      this.config.invertToggle.click();
    else if (this.flags.readerOn)
        this.forceRedraw();
  },

  updateToolbarPos() {
    const docWidth = document.documentElement.clientWidth;
    const btnRight = this.config.viewReader.getBoundingClientRect().right;
    const offset = docWidth - Math.ceil(window.pageXOffset + btnRight);
    this.config.readerToolbar.style.right = `${offset + 2}px`;
  },

  handleKeyDown(e) {
    if (e.code === "Tab") {
      this.config.readerToolbar.classList.add("tabMode");
    } else if (e.code === "Escape") {
      this.closeToolbar();
      e.target.blur();
      e.preventDefault();
    }
  },

  closeToolbar(e) {
    const toolbar = this.config.readerToolbar;
    if (toolbar.contains(e?.target) || e?.target === this.config.viewReader)
      return;
    if (!toolbar.classList.contains("hidden"))
      this.toggleToolbar();
  },
  toggleToolbar() {
    this.config.readerToolbar.classList.toggle("hidden");
    this.config.viewReader.classList.toggle("toggled");
    this.toggleTitle(this.config.viewReader);
  },

  toggleInvert() {
    this.config.viewerClassList.toggle("invert");
    this.flags.invertOn = !this.flags.invertOn;
    if (this.config.viewerClassList.contains("reader")) {
      this.flags.readerOn = !this.flags.readerOn;
      this.forceRedraw();
    }
  },
  toggleReader(e) {
    this.config.viewerClassList.toggle("reader");
    this.toggleTitle(e.target.labels[0]);
    this.flags.readerOn = !this.flags.invertOn && !this.flags.readerOn;
    if (!this.flags.invertOn)
      this.forceRedraw();
  },

  toggleFlags(e) {
    const flag = e.target.id.replace("Enable", "sOn");
    this.flags[flag] = e.target.checked;
    if (this.flags.readerOn)
      this.forceRedraw();
  },

  redrawImages() {
    if (this.flags.readerOn && this.flags.imagesOn)
      this.forceRedraw();
  },

  forceRedraw() {
    const {pdfViewer, pdfThumbnailViewer} = window.PDFViewerApplication;
    pdfViewer._pages.filter(e => e.renderingState).forEach(e => e.reset());
    pdfThumbnailViewer._thumbnails.filter(e => e.renderingState)
                                  .forEach(e => e.reset());
    window.PDFViewerApplication.forceRendering();
  },

  calcStyle(color, textBg) {
    let style;
    const {bg, fg, grad, acc} = this.readerTone.colors;
    if (color.chroma > 10) {
      const accents = acc.concat(this.readerTone.scheme.colors);
      if (accents.length)
        style = this.findMatch(accents, e => e.deltaE(color), Math.min).toHex();
    } else if (textBg && bg.deltaE(textBg) > 2.3) {
      style = this.findMatch([bg, fg], this.diffL(textBg), Math.max).toHex();
    } else {
      style = grad(1 - this.normL(color)).toHex();
    }
    return style;
  },

  getReaderStyle(ctx, method, args, style) {
    const isText = method.name.endsWith("Text");
    const isShape = !isText && !(
      method.name === "fillRect" &&
      args[2] == ctx.canvas.width &&
      args[3] == ctx.canvas.height
    );
    if (!this.flags.readerOn || isShape && !this.flags.shapesOn)
      return style;
    const bg = isText && this.getCanvasColor(ctx, args[1], args[2]);
    const key = style + (bg ? bg.toHex() : "");
    let newStyle = this.styleCache.get(key);
    if (!newStyle) {
      newStyle = this.calcStyle(newColor(style), bg);
      this.styleCache.set(key, newStyle);
    }
    return newStyle;
  },

  getReaderCompOp(ctx, drawImage, args, compOp) {
    if (!this.flags.readerOn || !this.flags.imagesOn)
      return compOp;
    const tone = this.readerTone;
    if (tone.colors.bg.lightness < 50 && args.length >= 5) {
      args = [...args];
      const mask = this.createMask(tone.foreground, args.slice(0, 5));
      args.splice(0, 1, mask);
      drawImage.apply(ctx, args);
    }
    compOp = this.config.imageMode.compOp.value;
    return compOp;
  },

  wrap(method, prop, getNewVal, callback) {
    return function() {
      const orig = this[prop];
      this[prop] = getNewVal(this, method, arguments, orig);
      method.apply(this, arguments);
      this[prop] = orig;
      callback && callback(this, method);
    }
  },

  saveCanvas(ctx, method) {
    const cvs = ctx.canvas;
    if (!method.name.endsWith("Text") && cvs.isConnected)
      this.canvasData = ctx.getImageData(0, 0, cvs.width, cvs.height);
  },

  getCanvasColor(ctx, tx, ty) {
    if (!this.canvasData)
      return null;
    const tfm = ctx.getTransform();
    let {x, y} = tfm.transformPoint({x: tx, y: ty});
    [x, y] = [x, y].map(Math.round);
    const i = (y * this.canvasData.width + x) * 4;
    const data = Array.from(this.canvasData.data.slice(i, i + 3));
    return newColor(data.map(e => e / 255));
  },

  createMask(color, args) {
    const cvs = document.createElement("canvas");
    const dim = [cvs.width, cvs.height] = args.slice(3);
    const ctx = cvs.getContext("2d");
    ctx.fillStyle = color;
    ctx.origFillRect(0, 0, ...dim);
    ctx.globalCompositeOperation = "destination-in";
    ctx.origDrawImage(...args, 0, 0, ...dim);
    return cvs;
  },

  findMatch(array, mapFun, condFun) {
    const newArr = array.map(mapFun);
    return array[newArr.indexOf(condFun(...newArr))];
  },
  toggleTitle(elem) {
    const swapPair = elem.dataset.toggleTitle?.split(";", 2);
    if (swapPair) {
      elem.title = elem.title.replace(...swapPair);
      elem.dataset.toggleTitle = swapPair.reverse().join(";");
    }
  },

  diffL(clr1) {
    return clr2 => Math.abs(clr1.lightness - clr2.lightness);
  },
  normL(color) {
    return color.lightness / newColor([1, 1, 1]).lightness;
  }
}
